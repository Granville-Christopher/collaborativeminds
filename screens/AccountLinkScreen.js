import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, Alert, StyleSheet, RefreshControl, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';

const API_URL = 'https://intelligent-gratitude-production.up.railway.app';

export default function AccountLinkScreen({ user }) {
  const navigation = useNavigation();
  const [accounts, setAccounts] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { 
    const fetchAndSetAccounts = async () => {
      if (user && user.token) {
        await fetchAccounts(); 
      }
    };
    fetchAndSetAccounts();

    const unsubscribe = navigation.addListener('focus', () => {
      fetchAndSetAccounts();
    });

    return unsubscribe;
  }, [user, navigation]);

  const fetchAccounts = async () => {
    if (!user || !user.token) {
      console.log('No user or token available');
      return;
    }
    setRefreshing(true);
    try {
      const res = await fetch(`${API_URL}/me/accounts`, { 
        headers: { Authorization: `Bearer ${user.token}` } 
      });
      if (res.ok) {
        const data = await res.json();
        console.log('Accounts data:', data);
        setAccounts(Array.isArray(data) ? data : []);
      } else {
        console.error('Failed to fetch accounts:', res.status);
        const errorData = await res.json().catch(() => ({}));
        console.error('Error response:', errorData);
        setAccounts([]);
      }
    } catch (e) { 
      console.error('Error fetching accounts:', e);
      setAccounts([]);
    } finally {
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    fetchAccounts();
  };

  return (
    <View style={{ flex:1, padding:16 }}>
      <Text style={{ fontSize:20, fontWeight:'bold', marginBottom:12 }}>Linked Discord Accounts</Text>
      <FlatList
        data={accounts}
        keyExtractor={(i) => String(i._id || i.discord_id || i.username)}
        renderItem={({ item }) => (
          <View style={{ padding:12, borderBottomWidth:1, borderBottomColor:'#eee' }}>
            <Text style={{ fontWeight:'600' }}>{item.username || item.discord_id || item._id || 'Discord Account'}</Text>
            <Text style={{ color:'#666', marginTop:6 }}>ID: {item.discord_id || item._id}</Text>
          </View>
        )}
        ListEmptyComponent={
          refreshing ? (
            <ActivityIndicator size="large" color="#5865F2" style={{ marginTop: 20 }} />
          ) : (
            <Text style={{ marginTop: 20, textAlign: 'center', color: '#666' }}>
              No accounts linked yet. Use Dashboard → Link Account
            </Text>
          )
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />
    </View>
  );
}

