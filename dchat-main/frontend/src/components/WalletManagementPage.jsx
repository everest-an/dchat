/**
 * Wallet Management Page Component
 * 
 * Main page for managing custodial wallet, viewing balances, and performing transactions.
 * Integrates withdrawal dialog and transaction history.
 * 
 * Features:
 * - Balance display
 * - Withdrawal functionality
 * - Transaction history
 * - Wallet creation
 * - Security settings
 * 
 * @author Manus AI
 * @date 2025-11-05
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Grid,
  Paper,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  Alert,
  CircularProgress,
  Divider,
  Chip,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  AccountBalanceWallet,
  Send,
  Add,
  Refresh,
  Security,
  History,
  TrendingUp
} from '@mui/icons-material';
import { useLanguage } from '../contexts/LanguageContext';
import ERC20WithdrawalDialog from './ERC20WithdrawalDialog';
import TransactionHistory from './TransactionHistory';

/**
 * Wallet Management Page Component
 */
const WalletManagementPage = () => {
  const { t } = useLanguage();
  
  // Wallet state
  const [wallet, setWallet] = useState(null);
  const [balances, setBalances] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Dialog state
  const [withdrawalDialogOpen, setWithdrawalDialogOpen] = useState(false);
  
  /**
   * Load wallet on mount
   */
  useEffect(() => {
    loadWallet();
  }, []);
  
  /**
   * Load wallet data
   */
  const loadWallet = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Get user's custodial wallet
      const response = await fetch('/api/wallets/custodial/my-wallet', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.status === 404) {
        // No wallet yet
        setWallet(null);
        setLoading(false);
        return;
      }
      
      if (!response.ok) throw new Error('Failed to load wallet');
      
      const data = await response.json();
      setWallet(data.wallet);
      
      // Load balances
      await loadBalances(data.wallet.wallet_address);
      
    } catch (err) {
      console.error('Failed to load wallet:', err);
      setError(t('payment.walletLoadFailed'));
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * Load wallet balances
   */
  const loadBalances = async (address) => {
    try {
      const response = await fetch(`/api/wallets/custodial/${address}/balance`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to load balances');
      
      const data = await response.json();
      setBalances(data);
    } catch (err) {
      console.error('Failed to load balances:', err);
    }
  };
  
  /**
   * Create new wallet
   */
  const handleCreateWallet = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/wallets/custodial/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to create wallet');
      
      const data = await response.json();
      setWallet(data.wallet);
      
      // Load balances for new wallet
      await loadBalances(data.wallet.wallet_address);
      
    } catch (err) {
      console.error('Failed to create wallet:', err);
      setError(t('payment.walletCreateFailed'));
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * Handle withdrawal success
   */
  const handleWithdrawalSuccess = () => {
    // Reload balances
    if (wallet) {
      loadBalances(wallet.wallet_address);
    }
  };
  
  /**
   * Format balance
   */
  const formatBalance = (balance) => {
    if (!balance) return '0';
    const num = parseFloat(balance);
    if (num === 0) return '0';
    if (num < 0.000001) return num.toExponential(2);
    return num.toFixed(6);
  };
  
  /**
   * Calculate total USD value
   */
  const getTotalUSD = () => {
    if (!balances) return 0;
    return (
      (parseFloat(balances.eth_balance_usd) || 0) +
      (parseFloat(balances.usdt_balance_usd) || 0) +
      (parseFloat(balances.usdc_balance_usd) || 0)
    );
  };
  
  // Loading state
  if (loading && !wallet) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </Container>
    );
  }
  
  // No wallet state
  if (!wallet && !loading) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <AccountBalanceWallet sx={{ fontSize: 80, color: 'primary.main', mb: 2 }} />
          <Typography variant="h5" gutterBottom>
            {t('payment.noWalletYet')}
          </Typography>
          <Typography variant="body1" color="textSecondary" paragraph>
            {t('payment.createWalletDescription')}
          </Typography>
          <Button
            variant="contained"
            size="large"
            startIcon={<Add />}
            onClick={handleCreateWallet}
            disabled={loading}
          >
            {t('payment.createWallet')}
          </Button>
        </Paper>
      </Container>
    );
  }
  
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Box>
          <Typography variant="h4" gutterBottom>
            {t('payment.walletManagement')}
          </Typography>
          <Typography variant="body2" color="textSecondary">
            {t('payment.custodialWalletDescription')}
          </Typography>
        </Box>
        
        <Tooltip title={t('common.refresh')}>
          <IconButton onClick={loadWallet} disabled={loading}>
            <Refresh />
          </IconButton>
        </Tooltip>
      </Box>
      
      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      {/* Wallet Overview */}
      <Grid container spacing={3} mb={4}>
        {/* Total Balance Card */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <TrendingUp color="primary" />
                <Typography variant="h6">
                  {t('payment.totalBalance')}
                </Typography>
              </Box>
              <Typography variant="h3" color="primary.main">
                ${getTotalUSD().toFixed(2)}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                {t('payment.usdValue')}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        {/* ETH Balance */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                ETH
              </Typography>
              <Typography variant="h5">
                {formatBalance(balances?.eth_balance)}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                ≈ ${balances?.eth_balance_usd || '0'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        {/* USDT Balance */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                USDT
              </Typography>
              <Typography variant="h5">
                {formatBalance(balances?.usdt_balance)}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                ≈ ${balances?.usdt_balance_usd || '0'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        {/* USDC Balance */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                USDC
              </Typography>
              <Typography variant="h5">
                {formatBalance(balances?.usdc_balance)}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                ≈ ${balances?.usdc_balance_usd || '0'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      
      {/* Wallet Info */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          {t('payment.walletInformation')}
        </Typography>
        <Divider sx={{ my: 2 }} />
        
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Typography variant="caption" color="textSecondary">
              {t('payment.walletAddress')}
            </Typography>
            <Typography variant="body1" fontFamily="monospace">
              {wallet?.wallet_address}
            </Typography>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Typography variant="caption" color="textSecondary">
              {t('payment.status')}
            </Typography>
            <Box mt={0.5}>
              <Chip 
                label={wallet?.is_active ? t('common.active') : t('common.inactive')}
                color={wallet?.is_active ? 'success' : 'default'}
                size="small"
              />
            </Box>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Typography variant="caption" color="textSecondary">
              {t('payment.createdAt')}
            </Typography>
            <Typography variant="body2">
              {new Date(wallet?.created_at).toLocaleString()}
            </Typography>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Typography variant="caption" color="textSecondary">
              {t('payment.dailyLimit')}
            </Typography>
            <Typography variant="body2">
              ${wallet?.daily_withdrawal_limit || 0} / day
            </Typography>
          </Grid>
        </Grid>
      </Paper>
      
      {/* Actions */}
      <Box display="flex" gap={2} mb={4}>
        <Button
          variant="contained"
          startIcon={<Send />}
          onClick={() => setWithdrawalDialogOpen(true)}
          size="large"
        >
          {t('payment.withdraw')}
        </Button>
        
        <Button
          variant="outlined"
          startIcon={<Security />}
          size="large"
        >
          {t('payment.securitySettings')}
        </Button>
      </Box>
      
      {/* Transaction History */}
      <Paper sx={{ p: 3 }}>
        <TransactionHistory walletAddress={wallet?.wallet_address} />
      </Paper>
      
      {/* Withdrawal Dialog */}
      <ERC20WithdrawalDialog
        open={withdrawalDialogOpen}
        onClose={() => setWithdrawalDialogOpen(false)}
        walletAddress={wallet?.wallet_address}
        onSuccess={handleWithdrawalSuccess}
      />
    </Container>
  );
};

export default WalletManagementPage;
