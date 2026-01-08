import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Dimensions, Image } from 'react-native';

const { width, height } = Dimensions.get('window');

export default function WelcomeScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          {/* Decorative Circles */}
          <View style={styles.decorativeCircle1} />
          <View style={styles.decorativeCircle2} />
          <View style={styles.decorativeCircle3} />

          {/* Main Logo Container */}
          <View style={styles.logoContainer}>
            <View style={styles.logoOuterRing}>
              <View style={styles.logoMiddleRing}>
                <View style={styles.discordIcon}>
                  <Image
                    source={require('../assets/beans.jpg')}
                    style={styles.discordImage}
                    resizeMode="contain"
                  />
                </View>
              </View>
            </View>
            {/* Glow effect */}
            <View style={styles.logoGlow} />
          </View>

          {/* Title Section */}
          <View style={styles.titleContainer}>
            <Text style={styles.titleMain}>DISCORD SERVER</Text>
            <Text style={styles.titleSub}>MONITOR</Text>
            <View style={styles.titleUnderline} />
          </View>

          {/* Subtitle */}
          <Text style={styles.subtitle}>
            Real-time monitoring for your Discord servers
          </Text>
          <Text style={styles.subtitleSecondary}>
            Track joins, verifications, and activity instantly
          </Text>

          {/* Feature Pills */}
          <View style={styles.featuresContainer}>
            <View style={styles.featurePill}>
              <Text style={styles.featureText}>⚡ Real-time</Text>
            </View>
            <View style={styles.featurePill}>
              <Text style={styles.featureText}>🔔 Push Alerts</Text>
            </View>
            <View style={styles.featurePill}>
              <Text style={styles.featureText}>📊 Live Feed</Text>
            </View>
          </View>

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.loginButton}
              onPress={() => navigation.navigate('Login')}
              activeOpacity={0.8}
            >
              <Text style={styles.loginButtonText}>Login</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.signupButton}
              onPress={() => navigation.navigate('Signup')}
              activeOpacity={0.8}
            >
              <Text style={styles.signupButtonText}>Sign Up</Text>
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <Text style={styles.footerText}>
            Get started in seconds
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#5865F2', // Discord purple
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    position: 'relative',
    overflow: 'hidden',
  },
  decorativeCircle1: {
    position: 'absolute',
    width: width * 0.8,
    height: width * 0.8,
    borderRadius: width * 0.4,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    top: -height * 0.1,
    left: -width * 0.3,
    zIndex: 0,
  },
  decorativeCircle2: {
    position: 'absolute',
    width: width * 0.6,
    height: width * 0.6,
    borderRadius: width * 0.3,
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    bottom: -height * 0.1,
    right: -width * 0.2,
    zIndex: 0,
  },
  decorativeCircle3: {
    position: 'absolute',
    width: width * 0.4,
    height: width * 0.4,
    borderRadius: width * 0.2,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    top: height * 0.3,
    right: -width * 0.1,
    zIndex: 0,
  },
  logoContainer: {
    marginBottom: 40,
    position: 'relative',
  },
  logoOuterRing: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  logoMiddleRing: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  discordIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#5865F2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
  },
  logoGlow: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    top: -10,
    left: -10,
    zIndex: -1,
  },
  discordImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  titleMain: {
    fontSize: 42,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 3,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  titleSub: {
    fontSize: 42,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 3,
    marginTop: -4,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  titleUnderline: {
    width: 120,
    height: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
    marginTop: 12,
    opacity: 0.8,
  },
  subtitle: {
    fontSize: 18,
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 24,
    marginBottom: 8,
    fontWeight: '600',
    opacity: 0.95,
    letterSpacing: 0.5,
  },
  subtitleSecondary: {
    fontSize: 15,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 32,
    opacity: 0.8,
    fontWeight: '400',
  },
  featuresContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 48,
    paddingHorizontal: 20,
  },
  featurePill: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  featureText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  buttonContainer: {
    width: '100%',
    maxWidth: 320,
    gap: 16,
  },
  loginButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    backgroundColor: '#FFFFFF',
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginButtonText: {
    color: '#5865F2',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  signupButton: {
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    backgroundColor: '#3C45A5',
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  signupButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  footerText: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.7,
    fontWeight: '500',
    marginTop: 8,
  },
});

