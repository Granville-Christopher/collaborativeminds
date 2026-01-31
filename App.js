import React, { useEffect, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createDrawerNavigator, DrawerContentScrollView, DrawerItemList } from "@react-navigation/drawer";
import { View, ActivityIndicator, StyleSheet, TouchableOpacity, Text } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

// Import screens
import WelcomeScreen from "./screens/WelcomeScreen";
import LoginScreen from "./screens/LoginScreen";
import SignupScreen from "./screens/SignupScreen";
import ForgotPasswordScreen from "./screens/ForgotPasswordScreen";
import ResetPasswordScreen from "./screens/ResetPasswordScreen";
import Dashboard from "./screens/Dashboard";
import ProfileScreen from "./screens/ProfileScreen";
import BlockedAccessScreen from "./screens/BlockedAccessScreen";
import AccountLinkScreen from "./screens/AccountLinkScreen";
import OnboardingScreen from "./screens/OnboardingScreen";
import { isSubscriptionExpired } from "./utils/subscription";
import * as Linking from "expo-linking";

const Drawer = createDrawerNavigator(); 
const API_URL = "https://intelligent-gratitude-production.up.railway.app";

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigationRef = React.useRef(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isFirstTimeOnboarding, setIsFirstTimeOnboarding] = useState(false);

  // Handle deep links
  useEffect(() => {
    // Check if app was opened from a deep link
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink(url);
      }
    });

    // Listen for deep links while app is running
    const subscription = Linking.addEventListener('url', (event) => {
      handleDeepLink(event.url);
    });

    return () => {
      subscription?.remove();
    };
  }, []);

  const handleDeepLink = (url) => {
    const parsed = Linking.parse(url);
    
    // Handle reset password deep link
    if (parsed.path === 'reset-password' && parsed.queryParams?.token) {
      // Navigate to ResetPassword screen with token
      setTimeout(() => {
        if (navigationRef.current) {
          navigationRef.current.navigate('ResetPassword', { 
            token: parsed.queryParams.token 
          });
        }
      }, 500);
    }
  };

  // Load user on mount
  useEffect(() => {
    loadUser();
  }, []);

  // Configure Android notification channel
  useEffect(() => {
    if (Platform.OS === "android") {
      Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#FF231F7C",
        showBadge: true,
        enableVibrate: true,
        enableLights: true,
        sound: "default",
      }).then(() => console.log("Android notification channel configured"));
    }
  }, []);

  // Register push token when user becomes available
  useEffect(() => {
    if (!user || !user.token) {
      console.log("Token registration skipped: No user or token");
      return;
    }

    if (isSubscriptionExpired(user)) {
      console.log("Token registration skipped: Subscription expired");
      return;
    }

    console.log("Starting push token registration for user:", user.email);

    const register = async () => {
      try {
        if (Platform.OS === "web") {
          console.log("Skipping token registration on web");
          return;
        }

        console.log("Requesting notification permissions...");
        const { status } = await Notifications.requestPermissionsAsync();
        if (status !== "granted") {
          console.log("Push permissions not granted:", status);
          return;
        }
        console.log("Notification permissions granted");

        console.log("Getting push tokens...");
        
        const expoTokenObj = await Notifications.getExpoPushTokenAsync({
          projectId: "c3dc6192-aca5-431c-becb-786b9b36af31",
          applicationId: "com.collaborative.minds",
          useEnterprisePushToken: true,
        });
        const expoToken = expoTokenObj?.data;
        
        let fcmToken = null;
        try {
          const deviceTokenObj = await Notifications.getDevicePushTokenAsync();
          fcmToken = deviceTokenObj?.data;
          console.log("Got native FCM token:", fcmToken?.substring(0, 20) + "...");
        } catch (e) {
          // Firebase not initialized or google-services.json missing
          // This is expected if Firebase isn't set up - Expo push will still work
          console.log("⚠️ Native FCM token not available (Firebase not configured):", e.message);
          console.log("📝 Note: Expo push notifications will still work without FCM");
        }

        const tokensToRegister = [];
        if (expoToken) {
          tokensToRegister.push({ token: expoToken, token_type: 'expo' });
        }
        if (fcmToken) {
          tokensToRegister.push({ token: fcmToken, token_type: 'fcm' });
        }

        if (tokensToRegister.length === 0) {
          console.error("Failed to get any push tokens");
          return;
        }

        console.log(`Registering ${tokensToRegister.length} token(s) with server...`);

        for (const tokenData of tokensToRegister) {
          try {
            const response = await fetch(`${API_URL}/register-push-token`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${user.token}`,
              },
              body: JSON.stringify(tokenData),
            });

            if (response.ok) {
              console.log(`✅ ${tokenData.token_type.toUpperCase()} token registered successfully`);
            } else {
              const resData = await response.json();
              console.error(`❌ Server failed to save ${tokenData.token_type} token:`, resData);
            }
          } catch (e) {
            console.error(`❌ Error registering ${tokenData.token_type} token:`, e.message);
          }
        }
      } catch (e) {
        console.error("❌ Error in push registration:", e.message);
      }
    };

    const timer = setTimeout(() => {
      register();
    }, 500);

    return () => clearTimeout(timer);
  }, [user?.token, user?.email, user?.tier, user?.is_subscribed, user?.expiry_date]);

  // Periodic subscription expiry check
  useEffect(() => {
    if (!user) return;

    const checkExpiry = async () => {
      if (isSubscriptionExpired(user)) {
        const updatedUser = {
          ...user,
          tier: "none",
          is_subscribed: false
        };
        await AsyncStorage.setItem("user_profile", JSON.stringify(updatedUser));
        setUser(updatedUser);
      }
    };

    const interval = setInterval(checkExpiry, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, [user]);

  const loadUser = async () => {
    try {
      const userData = await AsyncStorage.getItem("user_profile");
      if (userData) {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
      }
    } catch (error) {
      console.error("Error loading user:", error);
    } finally {
      setLoading(false);
    }
  };

  // Show onboarding once after first successful login
  useEffect(() => {
    if (!user) return;

    const checkOnboarding = async () => {
      try {
        const flag = await AsyncStorage.getItem("has_seen_onboarding_v1");
        if (!flag) {
          setShowOnboarding(true);
          setIsFirstTimeOnboarding(true); // Mark as first time (can't skip)
        }
      } catch (e) {
        console.error("Error checking onboarding flag:", e.message);
      }
    };

    checkOnboarding();
  }, [user?._id]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#5865F2" />
      </View>
    );
  }

  // If no user, show auth screens
  if (!user) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <NavigationContainer ref={navigationRef}>
          <Drawer.Navigator
            screenOptions={{ 
              headerShown: false, 
              drawerType: "front",
              swipeEnabled: false, // Disable drawer for auth screens
            }}
            initialRouteName="Welcome"
          >
          <Drawer.Screen name="Welcome">
            {(props) => <WelcomeScreen {...props} />}
          </Drawer.Screen>
          <Drawer.Screen name="Login">
            {(props) => <LoginScreen {...props} setUser={setUser} />}
          </Drawer.Screen>
          <Drawer.Screen name="Signup">
            {(props) => <SignupScreen {...props} setUser={setUser} />}
          </Drawer.Screen>
          <Drawer.Screen name="ForgotPassword">
            {(props) => <ForgotPasswordScreen {...props} />}
          </Drawer.Screen>
          <Drawer.Screen name="ResetPassword">
            {(props) => <ResetPasswordScreen {...props} />}
          </Drawer.Screen>
        </Drawer.Navigator>
      </NavigationContainer>
      </GestureHandlerRootView>
    );
  }

  // Check if subscription is expired
  const expired = isSubscriptionExpired(user);

  // Custom drawer content for expired users
  const ExpiredDrawerContent = (props) => {
    return (
      <DrawerContentScrollView {...props} style={{ backgroundColor: '#FFFFFF' }}>
        <View style={{ padding: 20, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' }}>
          <Text style={{ fontSize: 24, fontWeight: '800', color: '#111827', marginBottom: 4 }}>
            Discord Monitor
          </Text>
          <Text style={{ fontSize: 14, color: '#6B7280' }}>{user.email}</Text>
          <View style={{ marginTop: 12, padding: 10, backgroundColor: '#FEE2E2', borderRadius: 8 }}>
            <Text style={{ fontSize: 12, color: '#EF4444', fontWeight: '600' }}>
              ⚠️ Subscription Expired
            </Text>
          </View>
        </View>
        <DrawerItemList {...props} />
      </DrawerContentScrollView>
    );
  };

  // If expired, show limited access (Profile and Subscription screens only)
  if (expired || user.tier === "none") {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <NavigationContainer>
          <Drawer.Navigator
            drawerContent={(props) => <ExpiredDrawerContent {...props} />}
            screenOptions={({ navigation }) => ({
              headerShown: true,
              drawerType: "front",
              drawerActiveTintColor: "#5865F2",
              drawerInactiveTintColor: "#6B7280",
              drawerStyle: {
                backgroundColor: '#FFFFFF',
                width: 280,
              },
              headerStyle: {
                backgroundColor: '#5865F2',
              },
              headerTintColor: '#FFFFFF',
              headerTitleStyle: {
                fontWeight: '700',
              },
              drawerPosition: "left",
              swipeEnabled: true,
              swipeEdgeWidth: 50,
              headerLeft: () => (
                <TouchableOpacity
                  onPress={() => navigation.toggleDrawer()}
                  style={{ marginLeft: 16, padding: 8 }}
                >
                  <Text style={{ fontSize: 24, color: '#FFFFFF' }}>☰</Text>
                </TouchableOpacity>
              ),
            })}
            initialRouteName="Blocked"
            key={user.tier}
          >
          <Drawer.Screen 
            name="Profile"
            options={{ 
              title: "Profile",
              drawerLabel: "👤 Profile",
            }}
          >
            {(props) => <ProfileScreen {...props} user={user} setUser={setUser} onShowOnboarding={() => {
              setShowOnboarding(true);
              setIsFirstTimeOnboarding(false);
            }} />}
          </Drawer.Screen>
          <Drawer.Screen 
            name="Blocked"
            options={{ 
              title: "Subscription",
              drawerLabel: "🔒 Subscription",
            }}
          >
            {(props) => <BlockedAccessScreen {...props} user={user} setUser={setUser} />}
          </Drawer.Screen>
        </Drawer.Navigator>
      </NavigationContainer>
      </GestureHandlerRootView>
    );
  }

  // Custom drawer content with header
  const CustomDrawerContent = (props) => {
    return (
      <DrawerContentScrollView {...props} style={{ backgroundColor: '#FFFFFF' }}>
        <View style={{ padding: 20, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' }}>
          <Text style={{ fontSize: 24, fontWeight: '800', color: '#111827', marginBottom: 4 }}>
            Discord Monitor
          </Text>
          <Text style={{ fontSize: 14, color: '#6B7280' }}>{user.email}</Text>
        </View>
        <DrawerItemList {...props} />
      </DrawerContentScrollView>
    );
  };

  // User is logged in and subscribed - show main app
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer>
        <Drawer.Navigator
          drawerContent={(props) => <CustomDrawerContent {...props} />}
          screenOptions={({ navigation }) => ({
            headerShown: true,
            drawerType: "front",
            drawerActiveTintColor: "#5865F2",
            drawerInactiveTintColor: "#6B7280",
            drawerStyle: {
              backgroundColor: '#FFFFFF',
              width: 280,
            },
            headerStyle: {
              backgroundColor: '#5865F2',
            },
            headerTintColor: '#FFFFFF',
            headerTitleStyle: {
              fontWeight: '700',
            },
            drawerPosition: "left",
            swipeEnabled: true,
            swipeEdgeWidth: 50, // Enable swipe from edge
            headerLeft: () => (
              <TouchableOpacity
                onPress={() => navigation.toggleDrawer()}
                style={{ marginLeft: 16, padding: 8 }}
              >
                <Text style={{ fontSize: 24, color: '#FFFFFF' }}>☰</Text>
              </TouchableOpacity>
            ),
          })}
          initialRouteName="Dashboard"
          key={user.tier}
        >
        <Drawer.Screen
          name="Dashboard"
          options={{ 
            drawerLabel: "📊 Dashboard",
            title: "Dashboard",
          }}
        >
          {(props) => <Dashboard {...props} user={user} setUser={setUser} />}
        </Drawer.Screen>
        <Drawer.Screen
          name="Profile"
          options={{ 
            drawerLabel: "👤 Profile",
            title: "Profile",
          }}
        >
          {(props) => <ProfileScreen {...props} user={user} setUser={setUser} onShowOnboarding={() => {
            setShowOnboarding(true);
            setIsFirstTimeOnboarding(false);
          }} />}
        </Drawer.Screen>
        <Drawer.Screen
          name="Accounts"
          options={{ 
            drawerLabel: "🔗 Linked Accounts",
            title: "Linked Accounts",
          }}
        >
          {(props) => <AccountLinkScreen {...props} user={user} />}
        </Drawer.Screen>
        <Drawer.Screen
          name="Blocked"
          options={{ 
            drawerLabel: "🔒 Subscription",
            title: "Subscription",
          }}
        >
          {(props) => <BlockedAccessScreen {...props} user={user} setUser={setUser} />}
        </Drawer.Screen>
      </Drawer.Navigator>
      </NavigationContainer>

      {showOnboarding && (
        <OnboardingScreen
          onComplete={async () => {
            try {
              await AsyncStorage.setItem("has_seen_onboarding_v1", "true");
            } catch (e) {
              console.error("Error saving onboarding flag:", e.message);
            } finally {
              setShowOnboarding(false);
              setIsFirstTimeOnboarding(false);
            }
          }}
          canSkip={!isFirstTimeOnboarding} // Can only skip if not first time
        />
      )}
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
  },
});
