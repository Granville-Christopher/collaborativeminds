import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Modal, ActivityIndicator, ScrollView, Linking, Platform, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WebView } from 'react-native-webview';
import { getTimeRemaining, isSubscriptionExpired } from '../utils/subscription';
import { useNavigation } from '@react-navigation/native';

const API_URL = 'https://intelligent-gratitude-production.up.railway.app';

export default function ProfileScreen({ user, setUser, onShowOnboarding }) {
  const navigation = useNavigation();
  const [receipts, setReceipts] = useState([]);
  const [loadingReceipts, setLoadingReceipts] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [receiptHtml, setReceiptHtml] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshingProfile, setRefreshingProfile] = useState(false);

  const [timeRemaining, setTimeRemaining] = useState(getTimeRemaining(user));
  const expired = isSubscriptionExpired(user);

  useEffect(() => {
    const refreshUserProfile = async () => {
      if (!user || !user.token) return;
      
      setRefreshingProfile(true);
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
        }
      } catch (e) {
        console.error("Error refreshing profile:", e);
      } finally {
        setRefreshingProfile(false);
      }
    };

    refreshUserProfile();

    const unsubscribe = navigation.addListener('focus', () => {
      refreshUserProfile();
    });

    return unsubscribe;
  }, [navigation, user?.token]);

  useEffect(() => {
    (async () => {
      if (!user || !user.token) return;
      setLoadingReceipts(true);
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        const res = await fetch(`${API_URL}/payments`, { 
          headers: { Authorization: `Bearer ${user.token}` },
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        if (res.ok) {
          const data = await res.json();
          const sorted = Array.isArray(data) ? data.sort((a, b) => {
            const dateA = new Date(a.created_at || 0);
            const dateB = new Date(b.created_at || 0);
            return dateB - dateA;
          }).slice(0, 3) : []; // Show only latest 3 receipts
          setReceipts(sorted);
        } else {
          setReceipts([]);
        }
      } catch (e) {
        if (e.name === 'AbortError') {
          console.error('Error fetching receipts: Request timeout');
        } else {
          console.error('Error fetching receipts:', e.message || e);
        }
        setReceipts([]);
      }
      setLoadingReceipts(false);
    })();
  }, [user]);

  useEffect(() => {
    if (!user || !user.expiry_date) {
      setTimeRemaining({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: true });
      return;
    }

    setTimeRemaining(getTimeRemaining(user));

    const interval = setInterval(() => {
      setTimeRemaining(getTimeRemaining(user));
    }, 1000);

    return () => clearInterval(interval);
  }, [user, user?.expiry_date]);

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              // Call backend to clear push tokens
              if (user && user.token) {
                try {
                  const response = await fetch(`${API_URL}/logout`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      Authorization: `Bearer ${user.token}`,
                    },
                  });
                  
                  if (response.ok) {
                    console.log('✅ Logout successful - push tokens cleared');
                  } else {
                    console.log('⚠️ Logout API call failed, but continuing with local logout');
                  }
                } catch (error) {
                  console.log('⚠️ Error calling logout endpoint:', error.message);
                  // Continue with logout even if API call fails
                }
              }
              
              // Clear local storage and user state
              await AsyncStorage.removeItem('user_profile');
              setUser(null);
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert('Error', 'Failed to logout. Please try again.');
            }
          }
        }
      ]
    );
  };

  const handleViewReceipt = async (reference) => {
    try {
      const res = await fetch(`${API_URL}/payments/${reference}/receipt`, { 
        headers: { Authorization: `Bearer ${user.token}` } 
      });
      const html = await res.text();
      setReceiptHtml(html);
      setModalVisible(true);
    } catch (e) {
      Alert.alert('Error', 'Could not load receipt');
    }
  };

  const handleContactSupport = () => {
    const phoneNumber = '+13303905509';
    const whatsappUrl = Platform.OS === 'ios' 
      ? `whatsapp://send?phone=${phoneNumber.replace(/[^0-9]/g, '')}`
      : `https://wa.me/${phoneNumber.replace(/[^0-9]/g, '')}`;
    
    Linking.canOpenURL(whatsappUrl).then(supported => {
      if (supported) {
        Linking.openURL(whatsappUrl);
      } else {
        const fallbackUrl = `whatsapp://send?phone=${phoneNumber.replace(/[^0-9]/g, '')}`;
        Linking.openURL(fallbackUrl).catch(() => {
          Alert.alert(
            'WhatsApp Not Installed',
            'Please install WhatsApp to contact support, or contact us at +13303905509'
          );
        });
      }
    }).catch(() => {
      Alert.alert(
        'Error',
        'Unable to open WhatsApp. Please contact us at +13303905509'
      );
    });
  };

  const onRefresh = async () => {
    setRefreshing(true);
    if (!user || !user.token) {
      setRefreshing(false);
      return;
    }
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const res = await fetch(`${API_URL}/payments`, { 
        headers: { Authorization: `Bearer ${user.token}` },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (res.ok) {
        const data = await res.json();
        const sorted = Array.isArray(data) ? data.sort((a, b) => {
          const dateA = new Date(a.created_at || 0);
          const dateB = new Date(b.created_at || 0);
          return dateB - dateA;
        }).slice(0, 3) : []; // Show only latest 3 receipts
        setReceipts(sorted);
      }
    } catch (e) {
      console.error('Error fetching receipts on refresh:', e);
    } finally {
      setRefreshing(false);
    }
  };

  // Group receipts into rows of 3 (but we'll only have max 3 receipts, so max 1 row)
  const receiptRows = [];
  const expiry = user && user.expiry_date ? new Date(user.expiry_date) : null;
  if (receipts.length > 0) {
    // Since we only show 3 receipts max, just put them all in one row
    receiptRows.push(receipts);
  }

  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.profileSection}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Profile</Text>
          {refreshingProfile && (
            <ActivityIndicator size="small" color="#5865F2" style={styles.refreshIndicator} />
          )}
        </View>
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Email:</Text>
            <Text style={styles.infoValue}>{user.email}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Subscription:</Text>
            <Text style={[styles.infoValue, styles.tierBadge, { backgroundColor: user.tier === 'pro' ? '#5865F2' : user.tier === 'basic' ? '#34D399' : '#9CA3AF' }]}>
              {user.tier?.toUpperCase() || 'NONE'}
            </Text>
          </View>
          {expiry && (
            <View style={[styles.expiryCard, expired && styles.expiryCardExpired]}>
              <Text style={styles.expiryLabel}>Expiry Date</Text>
              <Text style={styles.expiryDate}>{expiry.toDateString()}</Text>
              {expired ? (
                <Text style={styles.expiredText}>⚠️ EXPIRED</Text>
              ) : (
                <View style={styles.countdownContainer}>
                  <Text style={styles.countdownText}>
                    {timeRemaining.days}d {timeRemaining.hours}h {timeRemaining.minutes}m {timeRemaining.seconds}s remaining
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
      </View>

      <TouchableOpacity style={styles.manageBtn} onPress={() => navigation.navigate('Blocked')}>
        <Text style={styles.manageBtnText}>Renew / Manage Subscription</Text>
      </TouchableOpacity>

      <View style={styles.receiptsSection}>
        <Text style={styles.sectionTitle}>Receipts</Text>
        {loadingReceipts ? (
          <ActivityIndicator style={styles.loader} size="large" color="#5865F2" />
        ) : receipts.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No payments found</Text>
          </View>
        ) : (
          <View style={styles.receiptsGrid}>
            {receiptRows.map((row, rowIndex) => (
              <View key={rowIndex} style={styles.receiptRow}>
                {row.map((receipt) => (
                  <TouchableOpacity
                    key={receipt.reference}
                    style={styles.receiptCard}
                    onPress={() => handleViewReceipt(receipt.reference)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.receiptCardHeader}>
                      <Text style={styles.receiptPlan}>{receipt.plan?.toUpperCase() || 'PAYMENT'}</Text>
                    </View>
                    <View style={styles.receiptCardBody}>
                      <Text style={styles.receiptAmount}>₦{(receipt.amount/100).toFixed(0)}</Text>
                      <Text style={styles.receiptDate}>
                        {new Date(receipt.created_at).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </Text>
                    </View>
                    <View style={styles.receiptCardFooter}>
                      <Text style={styles.viewReceiptText}>View →</Text>
                    </View>
                  </TouchableOpacity>
                ))}
                {row.length < 3 && Array.from({ length: 3 - row.length }).map((_, idx) => (
                  <View key={`empty-${idx}`} style={styles.receiptCardPlaceholder} />
                ))}
              </View>
            ))}
          </View>
        )}
      </View>

      <TouchableOpacity 
        style={styles.onboardingBtn} 
        onPress={() => onShowOnboarding && onShowOnboarding()}
      >
        <Text style={styles.onboardingIcon}>📚</Text>
        <Text style={styles.onboardingBtnText}>View Onboarding</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.supportBtn} onPress={handleContactSupport}>
        <Text style={styles.supportIcon}>💬</Text>
        <Text style={styles.supportBtnText}>Contact Support</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutBtnText}>Logout</Text>
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType='slide' onRequestClose={() => setModalVisible(false)}>
        <SafeAreaView style={styles.modalContainer} edges={['top']}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Receipt</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={styles.modalClose}>Close</Text>
            </TouchableOpacity>
          </View>
          {receiptHtml ? (
            <WebView 
              originWhitelist={["*"]} 
              source={{ html: receiptHtml }} 
              style={styles.webView} 
            />
          ) : (
            <ActivityIndicator style={styles.modalLoader} size="large" color="#5865F2" />
          )}
        </SafeAreaView>
      </Modal>
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
  profileSection: {
    marginBottom: 20,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
  },
  refreshIndicator: {
    marginLeft: 10,
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '600',
  },
  tierBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    overflow: 'hidden',
  },
  expiryCard: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  expiryCardExpired: {
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  expiryLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  expiryDate: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  countdownContainer: {
    marginTop: 8,
  },
  countdownText: {
    fontSize: 14,
    color: '#5865F2',
    fontWeight: '600',
  },
  expiredText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#EF4444',
    marginTop: 8,
  },
  manageBtn: {
    backgroundColor: '#5865F2',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 32,
    shadowColor: '#5865F2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  manageBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  receiptsSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },
  loader: {
    marginTop: 20,
  },
  emptyState: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '500',
  },
  receiptsGrid: {
    // No specific grid style here, rows handle it
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 12,
  },
  receiptCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  receiptCardPlaceholder: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  receiptCardHeader: {
    marginBottom: 10,
  },
  receiptPlan: {
    fontSize: 12,
    fontWeight: '700',
    color: '#5865F2',
  },
  receiptCardBody: {
    marginBottom: 10,
  },
  receiptAmount: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  receiptDate: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  receiptCardFooter: {
    alignItems: 'flex-end',
  },
  viewReceiptText: {
    fontSize: 12,
    color: '#5865F2',
    fontWeight: '600',
  },
  onboardingBtn: {
    backgroundColor: '#5865F2',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#5865F2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  onboardingIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  onboardingBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  supportBtn: {
    backgroundColor: '#25D366',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#25D366',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  supportIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  supportBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  logoutBtn: {
    backgroundColor: '#EF4444',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 'auto',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  logoutBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  modalClose: {
    fontSize: 16,
    color: '#5865F2',
    fontWeight: '600',
  },
  webView: {
    flex: 1,
  },
  modalLoader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

