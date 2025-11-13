/**
 * Welcome Screen
 * 
 * First screen users see when opening the app.
 * Introduces Dchat and provides options to get started.
 * 
 * @author Manus AI
 * @date 2024-11-13
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { COLORS, SIZES } from '@/constants/config';
import type { AuthStackNavigationProp } from '@/types';

const WelcomeScreen = () => {
  const navigation = useNavigation<AuthStackNavigationProp<'Welcome'>>();

  const features = [
    {
      icon: 'shield-checkmark',
      title: 'End-to-End Encrypted',
      description: 'Quantum-resistant encryption keeps your messages secure',
    },
    {
      icon: 'wallet',
      title: 'Built-in Crypto Wallet',
      description: 'Send and receive cryptocurrency directly in chat',
    },
    {
      icon: 'briefcase',
      title: 'Professional Network',
      description: 'Connect with verified professionals and showcase your work',
    },
    {
      icon: 'videocam',
      title: 'HD Video Calls',
      description: 'Crystal-clear audio and video calls with screen sharing',
    },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
      
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Logo and Title */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Icon name="chatbubbles" size={60} color={COLORS.primary} />
          </View>
          
          <Text style={styles.title}>Welcome to Dchat</Text>
          <Text style={styles.subtitle}>
            Blockchain-Based Business Communication
          </Text>
        </View>

        {/* Features */}
        <View style={styles.features}>
          {features.map((feature, index) => (
            <View key={index} style={styles.featureCard}>
              <View style={styles.featureIcon}>
                <Icon name={feature.icon} size={24} color={COLORS.primary} />
              </View>
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureDescription}>
                  {feature.description}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* CTA Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => navigation.navigate('ConnectWallet')}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>Get Started</Text>
            <Icon name="arrow-forward" size={20} color={COLORS.white} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => {
              // Navigate to learn more or website
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.secondaryButtonText}>Learn More</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            By continuing, you agree to our{' '}
            <Text style={styles.link}>Terms of Service</Text> and{' '}
            <Text style={styles.link}>Privacy Policy</Text>
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: SIZES.lg,
    paddingTop: SIZES.xxl,
    paddingBottom: SIZES.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: SIZES.xxl,
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: SIZES.radiusLg,
    backgroundColor: COLORS.gray1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SIZES.lg,
  },
  title: {
    fontSize: SIZES.h1,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: SIZES.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: SIZES.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingHorizontal: SIZES.md,
  },
  features: {
    marginBottom: SIZES.xxl,
  },
  featureCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.gray1,
    borderRadius: SIZES.radiusMd,
    padding: SIZES.md,
    marginBottom: SIZES.md,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: SIZES.radiusSm,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SIZES.md,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: SIZES.h6,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SIZES.xs,
  },
  featureDescription: {
    fontSize: SIZES.bodySmall,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  actions: {
    marginBottom: SIZES.xl,
  },
  primaryButton: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.radiusMd,
    paddingVertical: SIZES.md,
    paddingHorizontal: SIZES.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SIZES.md,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    fontSize: SIZES.h6,
    fontWeight: '600',
    color: COLORS.white,
    marginRight: SIZES.sm,
  },
  secondaryButton: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radiusMd,
    borderWidth: 2,
    borderColor: COLORS.border,
    paddingVertical: SIZES.md,
    paddingHorizontal: SIZES.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: SIZES.h6,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  footer: {
    alignItems: 'center',
  },
  footerText: {
    fontSize: SIZES.caption,
    color: COLORS.textTertiary,
    textAlign: 'center',
    lineHeight: 18,
  },
  link: {
    color: COLORS.primary,
    fontWeight: '500',
  },
});

export default WelcomeScreen;
