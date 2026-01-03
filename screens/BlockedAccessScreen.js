import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

const API_URL = 'https://intelligent-gratitude-production.up.railway.app';

export default function BlockedAccessScreen({ navigation }) {
  const openPaystack = (tier) => {
    // Frontend will call backend to initialize payment for chosen tier
    navigation.navigate('Dashboard');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Access Locked</Text>
      <Text style={{ marginVertical: 12 }}>Choose a subscription to continue</Text>
      <TouchableOpacity style={styles.btn} onPress={() => openPaystack('basic')}>
        <Text style={styles.btnText}>Basic - ₦3,000</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.btn, { marginTop: 12 }]} onPress={() => openPaystack('pro')}>
        <Text style={styles.btnText}>Pro - ₦5,000</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex:1, padding:20, justifyContent:'center' },
  title: { fontSize:22, fontWeight:'bold' },
  btn: { backgroundColor:'#5865F2', padding:14, borderRadius:8 },
  btnText: { color:'#fff', textAlign:'center', fontWeight:'bold' }
});
