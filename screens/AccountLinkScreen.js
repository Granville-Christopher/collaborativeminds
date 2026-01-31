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

  const handleUnlink = async (discordId, username) => {
    Alert.alert(
      'Unlink Account',
      `Are you sure you want to unlink ${username || 'this Discord account'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unlink',
          style: 'destructive',
          onPress: async () => {
            if (!user || !user.token) {
              Alert.alert('Error', 'Please login first');
              return;
            }

            try {
              const response = await fetch(`${API_URL}/unlink-discord`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${user.token}`
                },
                body: JSON.stringify({ discord_id: discordId }),
              });

              const result = await response.json();
              if (response.ok) {
                Alert.alert('✅ Success', 'Discord account unlinked successfully!');
                await fetchAccounts(); // Refresh the list
              } else {
                Alert.alert('Error', result.error || 'Failed to unlink Discord account');
              }
            } catch (error) {
              console.error('Unlink error:', error);
              Alert.alert('Server Error', 'Could not reach backend.');
            }
          }
        }
      ]
    );
  };

  return (
    <View style={{ flex:1, padding:16 }}>
      <Text style={{ fontSize:20, fontWeight:'bold', marginBottom:12 }}>Linked Discord Accounts</Text>
      <FlatList
        data={accounts}
        keyExtractor={(i) => String(i._id || i.discord_id || i.username)}
        renderItem={({ item }) => {
          const discordId = item.discord_id || item._id;
          const username = item.username || 'Discord Account';
          
          return (
            <View style={{ padding:12, borderBottomWidth:1, borderBottomColor:'#eee', flexDirection:'row', justifyContent:'space-between', alignItems:'center' }}>
              <View style={{ flex:1 }}>
                <Text style={{ fontWeight:'600' }}>{username}</Text>
                <Text style={{ color:'#666', marginTop:6, fontSize:12 }}>ID: {discordId}</Text>
              </View>
              <TouchableOpacity
                onPress={() => handleUnlink(discordId, username)}
                style={{
                  backgroundColor: '#ef4444',
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 6,
                }}
              >
                <Text style={{ color: '#fff', fontWeight: '600', fontSize: 12 }}>Unlink</Text>
              </TouchableOpacity>
            </View>
          );
        }}
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

