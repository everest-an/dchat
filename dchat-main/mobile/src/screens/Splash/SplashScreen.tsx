/**
 * Splash Screen
 * 
 * Loading screen shown during app initialization.
 * 
 * @author Manus AI
 * @date 2024-11-13
 */

import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { COLORS, SIZES } from '@/constants/config';

const SplashScreen = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.logo}>Dchat</Text>
      <ActivityIndicator size="large" color={COLORS.primary} style={styles.loader} />
      <Text style={styles.tagline}>Blockchain-Based Business Communication</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.white,
  },
  logo: {
    fontSize: 48,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: SIZES.xl,
  },
  loader: {
    marginVertical: SIZES.lg,
  },
  tagline: {
    fontSize: SIZES.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingHorizontal: SIZES.xl,
  },
});

export default SplashScreen;
