import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ProfileScreen({ user, setUser }) {
  const handleLogout = async () => {
    await AsyncStorage.removeItem('user_profile');
    setUser(null);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile</Text>
      <Text style={{ marginTop: 12 }}>Email: {user.email}</Text>
      <Text style={{ marginTop: 6 }}>Subscription: {user.subscription_tier || 'none'}</Text>
      <TouchableOpacity style={styles.btn} onPress={handleLogout}>
        <Text style={styles.btnText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex:1, padding:20 },
  title: { fontSize:22, fontWeight:'bold' },
  btn: { marginTop:20, backgroundColor:'#EB445A', padding:12, borderRadius:8 },
  btnText: { color:'#fff', textAlign:'center', fontWeight:'bold' }
});
