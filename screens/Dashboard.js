import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  StyleSheet,
  AppState,
  RefreshControl,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { WebView } from "react-native-webview";
import * as Notifications from "expo-notifications";
import Clipboard from '@react-native-clipboard/clipboard';
import { isSubscriptionExpired } from "../utils/subscription";

const API_URL = "https://intelligent-gratitude-production.up.railway.app";

export default function Dashboard({ user, setUser }) {
  const navigation = useNavigation();
  const [moves, setMoves] = useState([]);
  const [showWebView, setShowWebView] = useState(false);
  const [webviewUrl, setWebviewUrl] = useState("https://discord.com/logout");
  const [paystackUrl, setPaystackUrl] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [showAccountList, setShowAccountList] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const webViewRef = useRef(null);
  const lastSeenId = useRef(null);
  const [refreshing, setRefreshing] = useState(false);

  const getCacheKey = () => `cached_moves_${user?._id}_${selectedAccount || 'all'}`;

  useEffect(() => {
    if (!user) return;
    
    const loadCachedMoves = async () => {
      try {
        const cacheKey = getCacheKey();
        const cached = await AsyncStorage.getItem(cacheKey);
        if (cached) {
          const cachedMoves = JSON.parse(cached);
          setMoves(cachedMoves);
          if (cachedMoves.length > 0) {
            lastSeenId.current = cachedMoves[0]._id;
          }
        }
      } catch (e) {
        console.log('Error loading cached moves:', e);
      }
    };
    
    loadCachedMoves();
  }, [user, selectedAccount]);

  useEffect(() => {
    if (user) fetchAccounts();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    
    const subscription = Notifications.addNotificationReceivedListener(notification => {
      console.log('📬 Notification received, refreshing moves...');
      setTimeout(() => fetchMoves(), 500);
    });

    return () => subscription.remove();
  }, [user, selectedAccount]);

  useEffect(() => {
    if (!user) return;
    
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active') {
        console.log('📱 App came to foreground, refreshing moves immediately...');
        fetchMoves();
      }
    });

    return () => subscription.remove();
  }, [user, selectedAccount]);

  useEffect(() => {
    if (!user) return;

    const initialTimeout = setTimeout(() => {
      fetchMoves();
    }, 100);

    const interval = setInterval(() => {
      fetchMoves();
    }, 2000);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [user, selectedAccount]);

  const fetchMoves = async (showRefreshIndicator = false) => {
    if (!user || !user._id || !user.token) {
      if (showRefreshIndicator) setRefreshing(false);
      return;
    }
    
    if (isSubscriptionExpired(user)) {
      const updatedUser = {
        ...user,
        tier: "none",
        is_subscribed: false
      };
      await AsyncStorage.setItem("user_profile", JSON.stringify(updatedUser));
      setUser(updatedUser);
      if (showRefreshIndicator) setRefreshing(false);
      return;
    }
    
    if (showRefreshIndicator) setRefreshing(true);

    try {
      const url = selectedAccount
        ? `${API_URL}/get-all-moves?discord_id=${encodeURIComponent(selectedAccount)}`
        : `${API_URL}/get-all-moves`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${user.token}` },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (res.status === 402) return;
      if (!res.ok) {
        console.error(`fetchMoves failed: ${res.status} ${res.statusText}`);
        return;
      }
      
      const data = await res.json();
      if (Array.isArray(data)) {
        if (
          lastSeenId.current &&
          data.length > 0 &&
          data[0]._id !== lastSeenId.current
        ) {
          triggerNotification(data[0]);
        }
        if (data.length > 0) lastSeenId.current = data[0]._id;
        
        setMoves(data);
        
        try {
          const cacheKey = getCacheKey();
          await AsyncStorage.setItem(cacheKey, JSON.stringify(data));
        } catch (cacheError) {
          console.log('Error caching moves:', cacheError);
        }
      }
    } catch (e) {
      if (e.name === 'AbortError') {
        console.log("fetchMoves timeout");
      } else {
        console.log("fetchMoves error", e.message || e);
      }
    } finally {
      if (showRefreshIndicator) setRefreshing(false);
    }
  };

  const onRefresh = async () => {
    await fetchMoves(true);
    await fetchAccounts();
  };

  const fetchAccounts = async () => {
    if (!user || !user.token) return;
    try {
      const res = await fetch(`${API_URL}/me/accounts`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setAccounts(Array.isArray(data) ? data : []);
        if (!selectedAccount && Array.isArray(data) && data.length > 0) {
          setSelectedAccount(data[0].discord_id || data[0]._id);
        }
      } else {
        console.log("Error fetching accounts:", res.status);
      }
    } catch (e) {
      console.log("fetchAccounts network error", e);
    }
  };

  const triggerNotification = async (move) => {
    if (user.tier === "none" || !user.is_subscribed) return;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: `📥 New Member!`,
        body: move.action,
      },
      trigger: null,
    });
  };

  const handleCopy = (actionText) => {
    const parts = actionText.split(" ");
    const username = parts[1] || actionText;
    Clipboard.setString(username);
    Alert.alert("Success", `${username} copied to clipboard`, [], {
      cancelable: true,
    });
  };

  const handlePay = async () => {
    navigation.navigate('Blocked');
  };

  if (paystackUrl)
    return (
      <View style={{ flex: 1, backgroundColor: "#fff" }}>
        <View style={styles.webHeader}>
          <TouchableOpacity
            onPress={() => {
              setPaystackUrl(null);
            }}
            style={styles.webHeaderButton}
          >
            <Text style={styles.webHeaderText}>Close</Text>
          </TouchableOpacity>
        </View>
        <WebView source={{ uri: paystackUrl }} style={{ flex: 1 }} />
      </View>
    );

  if (showWebView)
    return (
      <View style={{ flex: 1 }}>
        <WebView
          ref={webViewRef}
          source={{ uri: webviewUrl }}
          injectedJavaScriptBeforeContentLoaded={
            webviewUrl && webviewUrl.includes("logout")
              ? "window.localStorage && window.localStorage.clear(); window.sessionStorage && window.sessionStorage.clear();"
              : undefined
          }
          onLoadEnd={() => {
            if (webviewUrl && webviewUrl.includes("logout")) {
              setTimeout(() => setWebviewUrl("https://discord.com/login"), 600);
            }
          }}
        />
      </View>
    );

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 10,
        }}
      >
        <Text style={styles.liveFeedTitle}>Live Feed</Text>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <TouchableOpacity
            style={{ marginRight: 12 }}
            onPress={() => {
              setWebviewUrl("https://discord.com/logout");
              setShowWebView(true);
            }}
          >
            <Text style={{ color: "#5865F2" }}>Link Account</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setShowAccountList(!showAccountList)}
          >
            <Text style={{ color: "#111827" }}>
              {selectedAccount
                ? accounts.find(
                    (a) => (a.discord_id || a._id) === selectedAccount
                  )?.username || "Filtering..."
                : "All Accounts"}{" "}
              ▾
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {showAccountList && (
        <View style={[styles.dropdown, { zIndex: 999, position: 'absolute', top: 50, right: 16, width: 200 }]}>
          <TouchableOpacity
            style={styles.dropdownItem}
            onPress={() => {
              setSelectedAccount(null);
              setShowAccountList(false);
              setMoves([]);
              lastSeenId.current = null;
            }}
          >
            <Text style={{ fontWeight: "bold" }}>All Accounts</Text>
          </TouchableOpacity>
          {accounts.map((a) => (
            <TouchableOpacity
              key={a._id}
              style={styles.dropdownItem}
              onPress={() => {
                setSelectedAccount(a.discord_id || a._id);
                setShowAccountList(false);
                setMoves([]);
                lastSeenId.current = null;
              }}
            >
              <Text>{a.username || a.discord_id || a._id}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <FlatList
        data={moves}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => handleCopy(item.action)}
            activeOpacity={0.7}
            style={styles.moveItem}
          >
            <Text style={{ fontWeight: "600" }}>{item.action}</Text>
            <Text style={{ color: "#666", fontSize: 12 }}>
              {new Date(item.timestamp).toLocaleString()}
            </Text>
          </TouchableOpacity>
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />

      <TouchableOpacity style={styles.payButton} onPress={handlePay}>
        <Text
          style={{ color: "#fff", textAlign: "center", fontWeight: "bold" }}
        >
          Upgrade / Renew
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  liveFeedTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#111827",
  },
  dropdown: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 8,
    marginBottom: 10,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
  },
  dropdownItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  moveItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    backgroundColor: "#fff",
  },
  payButton: {
    marginTop: 12,
    backgroundColor: "#5865F2",
    padding: 12,
    borderRadius: 8,
  },
  webHeader: {
    paddingTop: 50,
    paddingBottom: 15,
    backgroundColor: "#fff",
    alignItems: "flex-start",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    paddingHorizontal: 16,
  },
  webHeaderButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#ef4444",
  },
  webHeaderText: {
    color: "#fff",
    fontWeight: "bold",
  },
});

