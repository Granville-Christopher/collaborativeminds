import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Dimensions, Modal } from 'react-native';

const { width } = Dimensions.get('window');

const onboardingSteps = [
  {
    title: "Welcome to Discord Monitor! 🎉",
    content: "Track new members joining your Discord servers in real-time. Get instant notifications and never miss a new member.",
    icon: "👋",
  },
  {
    title: "Link Your Discord Accounts",
    content: "Go to the Dashboard and tap 'Link Account' to connect your Discord accounts. You can link up to 10 accounts (Basic) or 40 accounts (Pro).",
    icon: "🔗",
    location: "Dashboard → Link Account button",
  },
  {
    title: "View Linked Accounts",
    content: "Open the 'Linked Accounts' tab from the menu to see all your connected Discord accounts. You can see usernames and account IDs here.",
    icon: "📋",
    location: "Menu → Linked Accounts",
  },
  {
    title: "Unlink Accounts",
    content: "To remove a Discord account, go to 'Linked Accounts' and tap the red 'Unlink' button next to any account you want to remove.",
    icon: "❌",
    location: "Linked Accounts → Unlink button",
  },
  {
    title: "Subscribe & Manage Plans",
    content: "Go to the 'Subscription' tab to choose your plan (Basic or Pro), view pricing, and manage your subscription. Basic: 10 accounts, Pro: 40 accounts.",
    icon: "💳",
    location: "Menu → Subscription",
  },
  {
    title: "View Your Receipts",
    content: "Check your payment history in the Profile screen. You'll see your latest receipts with plan details, amounts, and dates.",
    icon: "🧾",
    location: "Profile → Receipts section",
  },
  {
    title: "Dashboard & Live Feed",
    content: "The Dashboard shows real-time activity. See new members joining, copy usernames, and filter by account. Enable notifications to get alerts even when the app is closed!",
    icon: "📊",
    location: "Dashboard (main screen)",
  },
];

export default function OnboardingScreen({ onComplete, canSkip = false }) {
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < onboardingSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleFinish();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleFinish = async () => {
    if (onComplete) {
      onComplete();
    }
  };

  const handleSkip = () => {
    if (canSkip && onComplete) {
      onComplete();
    }
  };

  const step = onboardingSteps[currentStep];
  const isLastStep = currentStep === onboardingSteps.length - 1;
  const isFirstStep = currentStep === 0;

  return (
    <Modal
      visible={true}
      transparent={true}
      animationType="fade"
      onRequestClose={canSkip ? handleSkip : undefined}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
        {/* Progress Indicator */}
        <View style={styles.progressContainer}>
          {onboardingSteps.map((_, index) => (
            <View
              key={index}
              style={[
                styles.progressDot,
                index <= currentStep && styles.progressDotActive,
                index > 0 && { marginLeft: 8 },
              ]}
            />
          ))}
        </View>

        {/* Skip Button (only if canSkip is true) */}
        {canSkip && (
          <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        )}

        {/* Content */}
        <ScrollView 
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>{step.icon}</Text>
          </View>
          
          <Text style={styles.title}>{step.title}</Text>
          
          <Text style={styles.description}>{step.content}</Text>
          
          {step.location && (
            <View style={styles.locationContainer}>
              <Text style={styles.locationLabel}>📍 Location:</Text>
              <Text style={styles.locationText}>{step.location}</Text>
            </View>
          )}
        </ScrollView>

        {/* Navigation Buttons */}
        <View style={styles.buttonContainer}>
          {!isFirstStep && (
            <TouchableOpacity
              style={[styles.button, styles.backButton, { marginRight: 12 }]}
              onPress={handleBack}
            >
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={[
              styles.button,
              styles.nextButton,
              isFirstStep && styles.nextButtonFull,
            ]}
            onPress={handleNext}
          >
            <Text style={styles.nextButtonText}>
              {isLastStep ? "Finish" : "Next"}
            </Text>
          </TouchableOpacity>
        </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    width: '100%',
    maxWidth: 400,
    maxHeight: '90%',
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E5E7EB',
  },
  progressDotActive: {
    backgroundColor: '#5865F2',
    width: 24,
  },
  skipButton: {
    position: 'absolute',
    top: 24,
    right: 24,
    zIndex: 10,
  },
  skipText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    maxHeight: 300,
  },
  contentContainer: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  icon: {
    fontSize: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: '#4B5563',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 20,
  },
  locationContainer: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    marginTop: 8,
  },
  locationLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  locationText: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '600',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButton: {
    backgroundColor: '#F3F4F6',
  },
  backButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '700',
  },
  nextButton: {
    backgroundColor: '#5865F2',
  },
  nextButtonFull: {
    flex: 1,
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
