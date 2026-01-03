import React, { useEffect, useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createDrawerNavigator } from '@react-navigation/drawer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LoginScreen from './screens/LoginScreen';
import SignupScreen from './screens/SignupScreen';
import Dashboard from './screens/Dashboard';
import AccountLinkScreen from './screens/AccountLinkScreen';
import BlockedAccessScreen from './screens/BlockedAccessScreen';
import ProfileScreen from './screens/ProfileScreen';

const Drawer = createDrawerNavigator();

export default function App() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem('user_profile');
      if (raw) setUser(JSON.parse(raw));
      setLoading(false);
    })();
  }, []);

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" />;

  return (
    <NavigationContainer>
      {user ? (
        <Drawer.Navigator initialRouteName={user.subscription_tier === 'none' ? 'Blocked' : 'Dashboard'}>
          {user.subscription_tier === 'none' && (
            <Drawer.Screen name="Blocked" component={BlockedAccessScreen} />
          )}
          <Drawer.Screen name="Dashboard">
            {(props) => <Dashboard {...props} user={user} setUser={setUser} />}
          </Drawer.Screen>
          <Drawer.Screen name="Accounts">
            {(props) => <AccountLinkScreen {...props} user={user} />}
          </Drawer.Screen>
          <Drawer.Screen name="Profile">
            {(props) => <ProfileScreen {...props} user={user} setUser={setUser} />}
          </Drawer.Screen>
        </Drawer.Navigator>
      ) : (
        <Drawer.Navigator screenOptions={{ headerShown: false }}>
          <Drawer.Screen name="Login">
            {(props) => <LoginScreen {...props} setUser={async (u) => { setUser(u); await AsyncStorage.setItem('user_profile', JSON.stringify(u)); }} />}
          </Drawer.Screen>
          <Drawer.Screen name="Signup" component={SignupScreen} />
        </Drawer.Navigator>
      )}
    </NavigationContainer>
  );
}

// Styles moved to individual screens. No trailing styles here.
