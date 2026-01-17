import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar, ActivityIndicator, Alert
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { COLORS, SIZES } from '@/constants/config';
import { useAuthStore } from '@/store/authStore';
import { useWalletStore } from '@/store/walletStore';
import type { AuthStackNavigationProp } from '@/types';

const ConnectWalletScreen = () => {
  const navigation = useNavigation<AuthStackNavigationProp<'ConnectWallet'>>();
  const { login } = useAuthStore();
  const { createWallet, importWallet } = useWalletStore();
  const [isLoading, setIsLoading] = useState(false);

  const handleCreateWallet = async () => {
    try {
      setIsLoading(true);
      const { address, mnemonic } = await createWallet();
      
      Alert.alert(
        'Wallet Created',
        'Please save your recovery phrase securely. You will need it to recover your wallet.',
        [
          {
            text: 'I Saved It',
            onPress: () => navigation.navigate('CreateProfile'),
          },
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to create wallet. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImportWallet = () => {
    Alert.prompt(
      'Import Wallet',
      'Enter your 12-word recovery phrase',
      async (mnemonic) => {
        if (!mnemonic) return;
        
        try {
          setIsLoading(true);
          await importWallet(mnemonic);
          navigation.navigate('CreateProfile');
        } catch (error) {
          Alert.alert('Error', 'Invalid recovery phrase. Please try again.');
        } finally {
          setIsLoading(false);
        }
      }
    );
  };

  const walletOptions = [
    {
      id: 'create',
      icon: 'add-circle',
      title: 'Create New Wallet',
      description: 'Generate a new wallet with a secure recovery phrase',
      onPress: handleCreateWallet,
    },
    {
      id: 'import',
      icon: 'download',
      title: 'Import Existing Wallet',
      description: 'Restore your wallet using your recovery phrase',
      onPress: handleImportWallet,
    },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
      
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Icon name="wallet" size={60} color={COLORS.primary} />
          </View>
          <Text style={styles.title}>Connect Your Wallet</Text>
          <Text style={styles.subtitle}>
            Choose how you want to connect to Dchat
          </Text>
        </View>

        <View style={styles.options}>
          {walletOptions.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={styles.optionCard}
              onPress={option.onPress}
              disabled={isLoading}
              activeOpacity={0.7}
            >
              <View style={styles.optionIcon}>
                <Icon name={option.icon} size={32} color={COLORS.primary} />
              </View>
              <View style={styles.optionContent}>
                <Text style={styles.optionTitle}>{option.title}</Text>
                <Text style={styles.optionDescription}>{option.description}</Text>
              </View>
              <Icon name="chevron-forward" size={24} color={COLORS.textTertiary} />
            </TouchableOpacity>
          ))}
        </View>

        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Processing...</Text>
          </View>
        )}

        <View style={styles.info}>
          <Icon name="information-circle" size={20} color={COLORS.info} />
          <Text style={styles.infoText}>
            Your wallet is encrypted and stored securely on your device. Dchat never has access to your private keys.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  scrollContent: { flexGrow: 1, paddingHorizontal: SIZES.lg, paddingTop: SIZES.xxl, paddingBottom: SIZES.xl },
  header: { alignItems: 'center', marginBottom: SIZES.xxl },
  iconContainer: {
    width: 100, height: 100, borderRadius: SIZES.radiusLg, backgroundColor: COLORS.gray1,
    justifyContent: 'center', alignItems: 'center', marginBottom: SIZES.lg
  },
  title: { fontSize: SIZES.h2, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: SIZES.sm, textAlign: 'center' },
  subtitle: { fontSize: SIZES.body, color: COLORS.textSecondary, textAlign: 'center', paddingHorizontal: SIZES.md },
  options: { marginBottom: SIZES.xl },
  optionCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white,
    borderRadius: SIZES.radiusMd, borderWidth: 2, borderColor: COLORS.border,
    padding: SIZES.md, marginBottom: SIZES.md
  },
  optionIcon: {
    width: 60, height: 60, borderRadius: SIZES.radiusSm, backgroundColor: COLORS.gray1,
    justifyContent: 'center', alignItems: 'center', marginRight: SIZES.md
  },
  optionContent: { flex: 1 },
  optionTitle: { fontSize: SIZES.h6, fontWeight: '600', color: COLORS.textPrimary, marginBottom: SIZES.xs },
  optionDescription: { fontSize: SIZES.bodySmall, color: COLORS.textSecondary, lineHeight: 18 },
  loadingContainer: { alignItems: 'center', marginVertical: SIZES.lg },
  loadingText: { fontSize: SIZES.body, color: COLORS.textSecondary, marginTop: SIZES.sm },
  info: {
    flexDirection: 'row', backgroundColor: COLORS.gray1, borderRadius: SIZES.radiusMd,
    padding: SIZES.md, alignItems: 'flex-start'
  },
  infoText: { flex: 1, fontSize: SIZES.bodySmall, color: COLORS.textSecondary, marginLeft: SIZES.sm, lineHeight: 20 },
});

export default ConnectWalletScreen;
