import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { COLORS, SIZES } from '@/constants/config';
import { useWalletStore } from '@/store/walletStore';
import { formatCurrency, formatAddress } from '@/utils/format';

const WalletHomeScreen = () => {
  const navigation = useNavigation();
  const { address, balance, tokens, transactions, loadBalance, loadTransactions, refreshing } = useWalletStore();

  useEffect(() => {
    loadBalance();
    loadTransactions();
  }, []);

  const quickActions = [
    { id: 'send', icon: 'arrow-up', label: 'Send', color: COLORS.primary, onPress: () => navigation.navigate('Send') },
    { id: 'receive', icon: 'arrow-down', label: 'Receive', color: COLORS.secondary, onPress: () => navigation.navigate('Receive') },
    { id: 'transactions', icon: 'list', label: 'History', color: COLORS.accent, onPress: () => navigation.navigate('Transactions') },
  ];

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadBalance} />}
    >
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Total Balance</Text>
        <Text style={styles.balanceAmount}>${formatCurrency(balance)}</Text>
        <Text style={styles.address}>{formatAddress(address)}</Text>
      </View>

      <View style={styles.quickActions}>
        {quickActions.map((action) => (
          <TouchableOpacity key={action.id} style={styles.actionButton} onPress={action.onPress}>
            <View style={[styles.actionIcon, { backgroundColor: action.color }]}>
              <Icon name={action.icon} size={24} color={COLORS.white} />
            </View>
            <Text style={styles.actionLabel}>{action.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Assets</Text>
        {tokens.map((token) => (
          <TouchableOpacity
            key={token.symbol}
            style={styles.tokenCard}
            onPress={() => navigation.navigate('TokenDetail', { symbol: token.symbol })}
          >
            <View style={styles.tokenIcon}>
              <Icon name={token.icon} size={24} color={COLORS.primary} />
            </View>
            <View style={styles.tokenInfo}>
              <Text style={styles.tokenSymbol}>{token.symbol}</Text>
              <Text style={styles.tokenName}>{token.name}</Text>
            </View>
            <View style={styles.tokenBalance}>
              <Text style={styles.tokenAmount}>{token.balance}</Text>
              <Text style={styles.tokenValue}>${formatCurrency(token.value)}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Transactions</Text>
        {transactions.slice(0, 5).map((tx) => (
          <TouchableOpacity
            key={tx.hash}
            style={styles.transactionCard}
            onPress={() => navigation.navigate('TransactionDetail', { hash: tx.hash })}
          >
            <View style={[styles.txIcon, { backgroundColor: tx.type === 'send' ? COLORS.error : COLORS.success }]}>
              <Icon name={tx.type === 'send' ? 'arrow-up' : 'arrow-down'} size={16} color={COLORS.white} />
            </View>
            <View style={styles.txInfo}>
              <Text style={styles.txType}>{tx.type === 'send' ? 'Sent' : 'Received'}</Text>
              <Text style={styles.txTime}>{tx.timestamp}</Text>
            </View>
            <Text style={[styles.txAmount, { color: tx.type === 'send' ? COLORS.error : COLORS.success }]}>
              {tx.type === 'send' ? '-' : '+'}{tx.amount} {tx.symbol}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.backgroundSecondary },
  balanceCard: {
    backgroundColor: COLORS.primary, margin: SIZES.lg, borderRadius: SIZES.radiusLg,
    padding: SIZES.xl, alignItems: 'center'
  },
  balanceLabel: { fontSize: SIZES.body, color: COLORS.white, opacity: 0.9, marginBottom: SIZES.xs },
  balanceAmount: { fontSize: 40, fontWeight: 'bold', color: COLORS.white, marginBottom: SIZES.sm },
  address: { fontSize: SIZES.bodySmall, color: COLORS.white, opacity: 0.8 },
  quickActions: {
    flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: SIZES.lg, marginBottom: SIZES.lg
  },
  actionButton: { alignItems: 'center' },
  actionIcon: {
    width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', marginBottom: SIZES.xs
  },
  actionLabel: { fontSize: SIZES.bodySmall, color: COLORS.textSecondary },
  section: { backgroundColor: COLORS.white, marginBottom: SIZES.md, padding: SIZES.lg },
  sectionTitle: { fontSize: SIZES.h5, fontWeight: '600', color: COLORS.textPrimary, marginBottom: SIZES.md },
  tokenCard: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: SIZES.md,
    borderBottomWidth: 1, borderBottomColor: COLORS.divider
  },
  tokenIcon: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.gray1,
    justifyContent: 'center', alignItems: 'center', marginRight: SIZES.md
  },
  tokenInfo: { flex: 1 },
  tokenSymbol: { fontSize: SIZES.h6, fontWeight: '600', color: COLORS.textPrimary },
  tokenName: { fontSize: SIZES.bodySmall, color: COLORS.textSecondary },
  tokenBalance: { alignItems: 'flex-end' },
  tokenAmount: { fontSize: SIZES.h6, fontWeight: '600', color: COLORS.textPrimary },
  tokenValue: { fontSize: SIZES.bodySmall, color: COLORS.textSecondary },
  transactionCard: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: SIZES.md,
    borderBottomWidth: 1, borderBottomColor: COLORS.divider
  },
  txIcon: {
    width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: SIZES.md
  },
  txInfo: { flex: 1 },
  txType: { fontSize: SIZES.body, fontWeight: '500', color: COLORS.textPrimary },
  txTime: { fontSize: SIZES.caption, color: COLORS.textTertiary },
  txAmount: { fontSize: SIZES.body, fontWeight: '600' },
});

export default WalletHomeScreen;
