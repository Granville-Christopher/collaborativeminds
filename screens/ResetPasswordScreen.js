import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, Alert, ActivityIndicator } from 'react-native';

const API_URL = 'https://intelligent-gratitude-production.up.railway.app';

export default function ResetPasswordScreen({ navigation, route }) {
  const [email, setEmail] = useState(route?.params?.email || '');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [codeVerified, setCodeVerified] = useState(false);

  const handleVerifyCode = async () => {
    if (!email || !code) {
      Alert.alert('Error', 'Please enter your email and verification code');
      return;
    }

    if (code.length !== 6) {
      Alert.alert('Error', 'Please enter a valid 6-digit code');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/verify-reset-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: email.toLowerCase().trim(),
          code: code.trim()
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setCodeVerified(true);
        Alert.alert('Success', 'Code verified! Please enter your new password.');
      } else {
        Alert.alert('Error', data.error || 'Invalid or expired code. Please try again.');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: email.toLowerCase().trim(),
          code: code.trim(),
          password: password,
          confirm_password: confirmPassword
        }),
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert(
          'Success',
          'Your password has been reset successfully. You can now login with your new password.',
          [
            {
              text: 'OK',
              onPress: () => navigation.navigate('Login'),
            },
          ]
        );
      } else {
        Alert.alert('Error', data.error || 'Failed to reset password. Please try again.');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.title}>Reset Password</Text>
          <Text style={styles.subtitle}>
            {codeVerified 
              ? "Enter your new password below. Make sure it's at least 6 characters long."
              : "Enter the verification code sent to your email to continue."}
          </Text>
        </View>

        <View style={styles.form}>
          {/* Email Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              editable={!loading && !codeVerified}
            />
          </View>

          {/* Code Input */}
          {!codeVerified && (
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Verification Code</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter 6-digit code"
                value={code}
                onChangeText={(text) => {
                  // Only allow numbers and limit to 6 digits
                  const numericText = text.replace(/[^0-9]/g, '').slice(0, 6);
                  setCode(numericText);
                }}
                keyboardType="number-pad"
                maxLength={6}
                editable={!loading}
              />
              <Text style={styles.helpText}>
                Check your email for the 6-digit verification code. The code expires in 15 minutes.
              </Text>
            </View>
          )}

          {/* Password Fields - Only show after code is verified */}
          {codeVerified && (
            <>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>New Password</Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="Enter new password"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    editable={!loading}
                  />
                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    <Text style={styles.eyeIcon}>{showPassword ? '👁️' : '👁️‍🗨️'}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Confirm Password</Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showConfirmPassword}
                    autoCapitalize="none"
                    editable={!loading}
                  />
                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    <Text style={styles.eyeIcon}>{showConfirmPassword ? '👁️' : '👁️‍🗨️'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </>
          )}

          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={codeVerified ? handleResetPassword : handleVerifyCode}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitButtonText}>
                {codeVerified ? 'Reset Password' : 'Verify Code'}
              </Text>
            )}
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Remember your password? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.footerLink}>Login</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  backButton: {
    marginTop: 10,
    marginBottom: 20,
  },
  backButtonText: {
    color: '#5865F2',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    lineHeight: 24,
  },
  form: {
    flex: 1,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#111827',
  },
  helpText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 6,
    fontStyle: 'italic',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingRight: 12,
  },
  passwordInput: {
    flex: 1,
    padding: 16,
    fontSize: 16,
    color: '#111827',
  },
  eyeButton: {
    padding: 8,
  },
  eyeIcon: {
    fontSize: 20,
  },
  submitButton: {
    backgroundColor: '#5865F2',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginTop: 10,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  footerText: {
    color: '#6B7280',
    fontSize: 14,
  },
  footerLink: {
    color: '#5865F2',
    fontSize: 14,
    fontWeight: '600',
  },
});
