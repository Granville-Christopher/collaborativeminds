import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, RefreshControl, ActivityIndicator, Linking, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WebView } from 'react-native-webview';
import { useNavigation } from '@react-navigation/native';

const API_URL = 'https://intelligent-gratitude-production.up.railway.app';

export default function BlockedAccessScreen({ user, setUser }) {
  const navigation = useNavigation();
  const [selectedPlan, setSelectedPlan] = useState('basic');
  const [selectedPeriod, setSelectedPeriod] = useState('monthly');
  const [paystackUrl, setPaystackUrl] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const plans = {
    basic: {
      name: 'Basic',
      monthly: { price: 15500, months: 1 },
      quarterly: { price: 46500, months: 3 }, // 15500 * 3 = 46,500
      yearly: { price: 186000, months: 12 }, // 15500 * 12 = 186,000
    },
    pro: {
      name: 'Pro',
      monthly: { price: 30000, months: 1 },
      quarterly: { price: 90000, months: 3 }, // 30000 * 3 = 90,000
      yearly: { price: 360000, months: 12 }, // 30000 * 12 = 360,000
    },
    unlimited: {
      name: 'Unlimited',
      monthly: { price: null, months: 1, custom: true }, // Custom pricing
      quarterly: { price: null, months: 3, custom: true },
      yearly: { price: null, months: 12, custom: true },
    },
  };

  const handleRefresh = async () => {
    if (!user || !user.token) return;
    
    setRefreshing(true);
    try {
      const res = await fetch(`${API_URL}/me`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      
      if (res.ok) {
        const profile = await res.json();
        const updatedUser = {
          _id: profile.user_id,
          email: profile.email,
          token: user.token,
          tier: profile.tier || "none",
          is_subscribed: profile.is_subscribed || false,
          expiry_date: profile.expiry_date || null,
        };
        
        await AsyncStorage.setItem("user_profile", JSON.stringify(updatedUser));
        setUser(updatedUser);
        
        if (updatedUser.is_subscribed && updatedUser.tier !== "none") {
          Alert.alert("Success", "Subscription updated!");
        }
      }
    } catch (e) {
      Alert.alert("Error", "Failed to refresh subscription status");
    } finally {
      setRefreshing(false);
    }
  };

  const handleSubscribe = async () => {
    if (!user || !user.token) {
      Alert.alert('Error', 'Please login first');
      return;
    }

    if (!user.email) {
      Alert.alert('Error', 'Email address not found. Please login again.');
      return;
    }

    const plan = plans[selectedPlan];
    const period = plan[selectedPeriod];
    
    // Don't allow subscribing to unlimited plan through normal flow
    if (selectedPlan === 'unlimited' || period.custom) {
      Alert.alert('Unlimited Plan', 'Please contact support to set up your unlimited account.');
      return;
    }
    
    // Ensure price exists
    if (!period.price) {
      Alert.alert('Error', 'Invalid pricing for selected plan.');
      return;
    }
    
    try {
      const amountInKobo = period.price * 100; // Convert naira to kobo
      console.log(`Payment: ${selectedPlan} ${selectedPeriod} - ${period.price} NGN = ${amountInKobo} kobo`);
      
      const response = await fetch(`${API_URL}/initialize-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({
          email: user.email, // Include email in request
          plan: selectedPlan,
          months: period.months,
          amount: amountInKobo, // Amount in kobo
        }),
      });

      const result = await response.json();
      if (result.status && result.data?.authorization_url) {
        setPaystackUrl(result.data.authorization_url);
      } else {
        Alert.alert('Error', result.message || 'Payment initialization failed');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error. Please try again.');
    }
  };

  const handlePaystackNavigation = (navState) => {
    const url = navState.url.toLowerCase();
    if (url.includes('success') || url.includes('callback') || url.includes('checkout.paystack.com/success')) {
      setTimeout(() => {
        setPaystackUrl(null);
        handleRefresh();
        Alert.alert('Success', 'Payment successful! Your subscription is now active.');
      }, 2000);
    }
  };

  if (paystackUrl) {
    return (
      <View style={{ flex: 1, backgroundColor: '#fff' }}>
        <View style={styles.webHeader}>
          <TouchableOpacity onPress={() => setPaystackUrl(null)}>
            <Text style={styles.webHeaderText}>Close</Text>
          </TouchableOpacity>
        </View>
        <WebView
          source={{ uri: paystackUrl }}
          onNavigationStateChange={handlePaystackNavigation}
          style={{ flex: 1 }}
        />
      </View>
    );
  }

  const currentPlan = plans[selectedPlan];
  const currentPeriod = currentPlan[selectedPeriod];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Choose Your Plan</Text>
        <Text style={styles.headerSubtitle}>Unlock full access to Discord Server Monitor</Text>
      </View>

      <View style={styles.planSelector}>
        <TouchableOpacity
          style={[styles.planButton, selectedPlan === 'basic' && styles.planButtonActive]}
          onPress={() => setSelectedPlan('basic')}
        >
          <Text style={[styles.planButtonText, selectedPlan === 'basic' && styles.planButtonTextActive]}>
            Basic
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.planButton, selectedPlan === 'pro' && styles.planButtonActive]}
          onPress={() => setSelectedPlan('pro')}
        >
          <Text style={[styles.planButtonText, selectedPlan === 'pro' && styles.planButtonTextActive]}>
            Pro
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.planButton, selectedPlan === 'unlimited' && styles.planButtonActive]}
          onPress={() => setSelectedPlan('unlimited')}
        >
          <Text style={[styles.planButtonText, selectedPlan === 'unlimited' && styles.planButtonTextActive]}>
            Unlimited
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{currentPlan.name}</Text>
          {selectedPlan === 'pro' && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>POPULAR</Text>
            </View>
          )}
        </View>

        <View style={styles.priceContainer}>
          {currentPeriod.custom ? (
            <Text style={styles.customPriceText}>Contact Support</Text>
          ) : (
            <>
              <Text style={styles.currency}>₦</Text>
              <Text style={styles.price}>{currentPeriod.price.toLocaleString()}</Text>
              <Text style={styles.pricePeriod}>/{selectedPeriod === 'monthly' ? 'month' : selectedPeriod === 'quarterly' ? '3 months' : 'year'}</Text>
            </>
          )}
        </View>

        <View style={styles.periodSelector}>
          <TouchableOpacity
            style={[styles.periodButton, selectedPeriod === 'monthly' && styles.periodButtonActive]}
            onPress={() => setSelectedPeriod('monthly')}
          >
            <Text style={[styles.periodText, selectedPeriod === 'monthly' && styles.periodTextActive]}>
              Monthly
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.periodButton, selectedPeriod === 'quarterly' && styles.periodButtonActive]}
            onPress={() => setSelectedPeriod('quarterly')}
          >
            <Text style={[styles.periodText, selectedPeriod === 'quarterly' && styles.periodTextActive]}>
              Quarterly
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.periodButton, selectedPeriod === 'yearly' && styles.periodButtonActive]}
            onPress={() => setSelectedPeriod('yearly')}
          >
            <Text style={[styles.periodText, selectedPeriod === 'yearly' && styles.periodTextActive]}>
              Yearly
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.featuresList}>
          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>✓</Text>
            <Text style={styles.feature}>Real-time Discord monitoring</Text>
          </View>
          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>✓</Text>
            <Text style={styles.feature}>Instant push notifications</Text>
          </View>
          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>✓</Text>
            <Text style={styles.feature}>Live feed dashboard</Text>
          </View>
          {selectedPlan === 'basic' && (
            <>
              <View style={styles.featureItem}>
                <Text style={styles.featureIcon}>✓</Text>
                <Text style={styles.feature}>Up to 10 Discord accounts</Text>
              </View>
              <View style={styles.featureItem}>
                <Text style={styles.featureIcon}>✓</Text>
                <Text style={styles.feature}>1 user per app</Text>
              </View>
            </>
          )}
          {selectedPlan === 'pro' && (
            <>
              <View style={styles.featureItem}>
                <Text style={styles.featureIcon}>✓</Text>
                <Text style={styles.feature}>Up to 40 Discord accounts</Text>
              </View>
              <View style={styles.featureItem}>
                <Text style={styles.featureIcon}>✓</Text>
                <Text style={styles.feature}>3 users can share one app</Text>
              </View>
              <View style={styles.featureItem}>
                <Text style={styles.featureIcon}>✓</Text>
                <Text style={styles.feature}>Accumulates moves even when offline</Text>
              </View>
              <View style={styles.featureItem}>
                <Text style={styles.featureIcon}>✓</Text>
                <Text style={styles.feature}>Priority support</Text>
              </View>
            </>
          )}
          {selectedPlan === 'unlimited' && (
            <>
              <View style={styles.featureItem}>
                <Text style={styles.featureIcon}>✓</Text>
                <Text style={styles.feature}>Unlimited accounts</Text>
              </View>
              <View style={styles.featureItem}>
                <Text style={styles.featureIcon}>✓</Text>
                <Text style={styles.feature}>Custom features</Text>
              </View>
              <View style={styles.featureItem}>
                <Text style={styles.featureIcon}>✓</Text>
                <Text style={styles.feature}>Dedicated support</Text>
              </View>
              <View style={styles.featureItem}>
                <Text style={styles.featureIcon}>✓</Text>
                <Text style={styles.feature}>Priority updates</Text>
              </View>
            </>
          )}
        </View>

        <TouchableOpacity 
          style={styles.ctaButton} 
          onPress={currentPeriod.custom ? () => {
            // Open WhatsApp or contact support
            const phoneNumber = '+13303905509';
            const whatsappUrl = `https://wa.me/${phoneNumber.replace(/[^0-9]/g, '')}`;
            Linking.openURL(whatsappUrl).catch(() => {
              Alert.alert('Error', 'Unable to open WhatsApp. Please contact support at +13303905509');
            });
          } : handleSubscribe}
        >
          <Text style={styles.ctaText}>
            {currentPeriod.custom 
              ? 'Contact Support to Set Up'
              : `Subscribe Now - ₦${currentPeriod.price.toLocaleString()}`
            }
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 30,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  planSelector: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
    flexWrap: 'wrap',
  },
  planButton: {
    flex: 1,
    minWidth: 100,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  planButtonActive: {
    borderColor: '#5865F2',
    backgroundColor: '#EEF2FF',
  },
  planButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#6B7280',
  },
  planButtonTextActive: {
    color: '#5865F2',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
  },
  badge: {
    backgroundColor: '#5865F2',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: 0.5,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 24,
  },
  currency: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginRight: 2,
  },
  price: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
  },
  pricePeriod: {
    fontSize: 12,
    fontWeight: '400',
    color: '#6B7280',
    marginLeft: 4,
  },
  customPriceText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#5865F2',
    textAlign: 'center',
  },
  periodSelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 4,
  },
  periodButton: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  periodButtonActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  periodText: {
    color: '#6B7280',
    fontSize: 11,
    fontWeight: '700',
  },
  periodTextActive: {
    color: '#5865F2',
  },
  featuresList: {
    marginBottom: 24,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureIcon: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#5865F2',
    marginRight: 10,
    width: 20,
  },
  feature: {
    color: '#374151',
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
  ctaButton: {
    backgroundColor: '#5865F2',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    shadowColor: '#5865F2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  ctaText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  webHeader: {
    paddingTop: 50,
    paddingBottom: 15,
    backgroundColor: '#fff',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingHorizontal: 16,
  },
  webHeaderText: {
    color: '#ef4444',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

