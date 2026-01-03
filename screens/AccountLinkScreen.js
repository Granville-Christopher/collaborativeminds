import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, Alert, StyleSheet } from 'react-native';

const API_URL = 'https://intelligent-gratitude-production.up.railway.app';

export default function AccountLinkScreen({ user }) {
  const [accounts, setAccounts] = useState([]);

  useEffect(() => { fetchAccounts(); }, []);

  const fetchAccounts = async () => {
    try {
      const res = await fetch(`${API_URL}/user/${user._id}/accounts`);
      const data = await res.json();
      setAccounts(Array.isArray(data) ? data : []);
    } catch (e) {}
  };

  return (
    <View style={{ flex:1, padding:16 }}>
      <Text style={{ fontSize:20, fontWeight:'bold', marginBottom:12 }}>Linked Discord Accounts</Text>
      <FlatList data={accounts} keyExtractor={(i) => i.id || i.token} renderItem={({ item }) => (
        <View style={{ padding:12, borderBottomWidth:1, borderBottomColor:'#eee' }}>
          <Text>{item.username || item.id || 'Discord Account'}</Text>
        </View>
      )} ListEmptyComponent={<Text>No accounts linked yet. Use Dashboard -> Link Account</Text>} />
    </View>
  );
}
