/* global process */
/**
 * ERC-20 Token Withdrawal Dialog Component
 * 
 * Provides UI for withdrawing ERC-20 tokens (USDT/USDC) from custodial wallet.
 * Supports both custodial and non-custodial wallet withdrawals.
 * 
 * Features:
 * - Token selection (USDT/USDC/ETH)
 * - Amount input with balance validation
 * - Gas estimation display
 * - Transaction status tracking
 * - Etherscan link for verification
 * 
 * @author Manus AI
 * @date 2025-11-05
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Chip,
  Link,
  InputAdornment,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  AccountBalanceWallet,
  Send,
  Info,
  CheckCircle,
  Error as ErrorIcon,
  OpenInNew,
  Refresh
} from '@mui/icons-material';
import { useLanguage } from '../contexts/LanguageContext';

/**
 * ERC-20 Withdrawal Dialog Component
 */
const ERC20WithdrawalDialog = ({ open, onClose, walletAddress, onSuccess }) => {
  const { t } = useLanguage();
  
  // Form state
  const [token, setToken] = useState('USDT');
  const [amount, setAmount] = useState('');
  const [recipientAddress, setRecipientAddress] = useState('');
  const [gasStrategy, setGasStrategy] = useState('standard');
  
  // Balance state
  const [balances, setBalances] = useState({
    ETH: '0',
    USDT: '0',
    USDC: '0'
  });
  
  // Transaction state
  const [loading, setLoading] = useState(false);
  const [estimating, setEstimating] = useState(false);
  const [gasEstimate, setGasEstimate] = useState(null);
  const [txHash, setTxHash] = useState(null);
  const [txStatus, setTxStatus] = useState(null); // 'pending', 'confirmed', 'failed'
  const [error, setError] = useState(null);
  
  /**
   * Load wallet balances
   */
  useEffect(() => {
    if (open && walletAddress) {
      loadBalances();
    }
  }, [open, walletAddress]);
  
  /**
   * Estimate gas when amount or token changes
   */
  useEffect(() => {
    if (amount && recipientAddress && parseFloat(amount) > 0) {
      estimateGas();
    }
  }, [amount, token, recipientAddress, gasStrategy]);
  
  /**
   * Load wallet balances from backend
   */
  const loadBalances = async () => {
    try {
      const response = await fetch(`/api/wallets/custodial/${walletAddress}/balance`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to load balances');
      
      const data = await response.json();
      setBalances({
        ETH: data.eth_balance || '0',
        USDT: data.usdt_balance || '0',
        USDC: data.usdc_balance || '0'
      });
    } catch (err) {
      console.error('Failed to load balances:', err);
      setError(t('payment.balanceLoadFailed'));
    }
  };
  
  /**
   * Estimate gas cost for withdrawal
   */
  const estimateGas = async () => {
    setEstimating(true);
    setGasEstimate(null);
    setError(null);
    
    try {
      const response = await fetch('/api/wallets/custodial/estimate-gas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          wallet_address: walletAddress,
          token,
          amount: parseFloat(amount),
          to_address: recipientAddress,
          gas_strategy: gasStrategy
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Gas estimation failed');
      }
      
      const data = await response.json();
      setGasEstimate(data);
    } catch (err) {
      console.error('Gas estimation failed:', err);
      setError(err.message);
    } finally {
      setEstimating(false);
    }
  };
  
  /**
   * Handle withdrawal submission
   */
  const handleWithdraw = async () => {
    setLoading(true);
    setError(null);
    setTxHash(null);
    setTxStatus(null);
    
    try {
      // Validate inputs
      if (!recipientAddress || !amount || parseFloat(amount) <= 0) {
        throw new Error(t('payment.invalidInput'));
      }
      
      // Check balance
      const balance = parseFloat(balances[token]);
      const withdrawAmount = parseFloat(amount);
      
      if (withdrawAmount > balance) {
        throw new Error(t('payment.insufficientBalance'));
      }
      
      // Submit withdrawal request
      const response = await fetch('/api/wallets/custodial/withdraw', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          wallet_address: walletAddress,
          token,
          amount: withdrawAmount,
          to_address: recipientAddress,
          gas_strategy: gasStrategy
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Withdrawal failed');
      }
      
      const data = await response.json();
      setTxHash(data.transaction_hash);
      setTxStatus('pending');
      
      // Poll for transaction status
      pollTransactionStatus(data.transaction_hash);
      
    } catch (err) {
      console.error('Withdrawal failed:', err);
      setError(err.message);
      setLoading(false);
    }
  };
  
  /**
   * Poll transaction status
   */
  const pollTransactionStatus = async (hash) => {
    const maxAttempts = 60; // 5 minutes (5s intervals)
    let attempts = 0;
    
    const poll = setInterval(async () => {
      try {
        const response = await fetch(`/api/wallets/custodial/transaction/${hash}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (!response.ok) throw new Error('Failed to check status');
        
        const data = await response.json();
        
        if (data.status === 'confirmed') {
          setTxStatus('confirmed');
          setLoading(false);
          clearInterval(poll);
          
          // Reload balances
          loadBalances();
          
          // Notify parent
          if (onSuccess) {
            onSuccess(data);
          }
        } else if (data.status === 'failed') {
          setTxStatus('failed');
          setError(t('payment.transactionFailed'));
          setLoading(false);
          clearInterval(poll);
        }
        
        attempts++;
        if (attempts >= maxAttempts) {
          clearInterval(poll);
          setLoading(false);
          setError(t('payment.statusCheckTimeout'));
        }
      } catch (err) {
        console.error('Status check failed:', err);
        attempts++;
        if (attempts >= maxAttempts) {
          clearInterval(poll);
          setLoading(false);
        }
      }
    }, 5000); // Check every 5 seconds
  };
  
  /**
   * Handle dialog close
   */
  const handleClose = () => {
    if (!loading) {
      setAmount('');
      setRecipientAddress('');
      setError(null);
      setTxHash(null);
      setTxStatus(null);
      setGasEstimate(null);
      onClose();
    }
  };
  
  /**
   * Get Etherscan URL
   */
  const getEtherscanUrl = (hash) => {
    const network = process.env.REACT_APP_ETHEREUM_NETWORK || 'sepolia';
    if (network === 'mainnet') {
      return `https://etherscan.io/tx/${hash}`;
    }
    return `https://${network}.etherscan.io/tx/${hash}`;
  };
  
  /**
   * Format balance display
   */
  const formatBalance = (balance) => {
    const num = parseFloat(balance);
    if (num === 0) return '0';
    if (num < 0.000001) return num.toExponential(2);
    return num.toFixed(6);
  };
  
  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <Send />
          <Typography variant="h6">
            {t('payment.withdrawTokens')}
          </Typography>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        {/* Wallet Info */}
        <Box mb={2} p={2} bgcolor="background.paper" borderRadius={1}>
          <Typography variant="caption" color="textSecondary">
            {t('payment.custodialWallet')}
          </Typography>
          <Typography variant="body2" fontFamily="monospace">
            {walletAddress}
          </Typography>
        </Box>
        
        {/* Balances */}
        <Box mb={3} display="flex" gap={1} flexWrap="wrap">
          {Object.entries(balances).map(([token, balance]) => (
            <Chip
              key={token}
              icon={<AccountBalanceWallet />}
              label={`${token}: ${formatBalance(balance)}`}
              size="small"
              color={parseFloat(balance) > 0 ? 'primary' : 'default'}
            />
          ))}
        </Box>
        
        {/* Token Selection */}
        <FormControl fullWidth margin="normal">
          <InputLabel>{t('payment.selectToken')}</InputLabel>
          <Select
            value={token}
            onChange={(e) => setToken(e.target.value)}
            disabled={loading}
          >
            <MenuItem value="ETH">ETH (Ethereum)</MenuItem>
            <MenuItem value="USDT">USDT (Tether USD)</MenuItem>
            <MenuItem value="USDC">USDC (USD Coin)</MenuItem>
          </Select>
        </FormControl>
        
        {/* Amount Input */}
        <TextField
          fullWidth
          margin="normal"
          label={t('payment.amount')}
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          disabled={loading}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <Tooltip title={t('payment.maxBalance')}>
                  <IconButton
                    size="small"
                    onClick={() => setAmount(balances[token])}
                    disabled={loading}
                  >
                    <Refresh fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Typography variant="caption" color="textSecondary" ml={1}>
                  {token}
                </Typography>
              </InputAdornment>
            )
          }}
          helperText={`${t('payment.available')}: ${formatBalance(balances[token])} ${token}`}
        />
        
        {/* Recipient Address */}
        <TextField
          fullWidth
          margin="normal"
          label={t('payment.recipientAddress')}
          value={recipientAddress}
          onChange={(e) => setRecipientAddress(e.target.value)}
          disabled={loading}
          placeholder="0x..."
          helperText={t('payment.recipientAddressHelp')}
        />
        
        {/* Gas Strategy */}
        <FormControl fullWidth margin="normal">
          <InputLabel>{t('payment.gasStrategy')}</InputLabel>
          <Select
            value={gasStrategy}
            onChange={(e) => setGasStrategy(e.target.value)}
            disabled={loading}
          >
            <MenuItem value="slow">{t('payment.gasSlow')} (🐢 {t('payment.cheapest')})</MenuItem>
            <MenuItem value="standard">{t('payment.gasStandard')} (⚡ {t('payment.recommended')})</MenuItem>
            <MenuItem value="fast">{t('payment.gasFast')} (🚀 {t('payment.fastest')})</MenuItem>
          </Select>
        </FormControl>
        
        {/* Gas Estimate */}
        {estimating && (
          <Box mt={2} display="flex" alignItems="center" gap={1}>
            <CircularProgress size={16} />
            <Typography variant="caption" color="textSecondary">
              {t('payment.estimatingGas')}...
            </Typography>
          </Box>
        )}
        
        {gasEstimate && !estimating && (
          <Box mt={2} p={2} bgcolor="info.light" borderRadius={1}>
            <Typography variant="caption" color="textSecondary">
              {t('payment.estimatedGasCost')}
            </Typography>
            <Typography variant="body2">
              {gasEstimate.gas_cost_eth} ETH (≈ ${gasEstimate.gas_cost_usd})
            </Typography>
            <Typography variant="caption" color="textSecondary">
              {t('payment.gasLimit')}: {gasEstimate.gas_limit} | 
              {t('payment.gasPrice')}: {gasEstimate.gas_price_gwei} gwei
            </Typography>
          </Box>
        )}
        
        {/* Error Display */}
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
        
        {/* Transaction Status */}
        {txHash && (
          <Box mt={2}>
            {txStatus === 'pending' && (
              <Alert severity="info" icon={<CircularProgress size={20} />}>
                {t('payment.transactionPending')}
                <Link 
                  href={getEtherscanUrl(txHash)} 
                  target="_blank"
                  rel="noopener"
                  sx={{ ml: 1 }}
                >
                  {t('payment.viewOnEtherscan')} <OpenInNew fontSize="small" />
                </Link>
              </Alert>
            )}
            
            {txStatus === 'confirmed' && (
              <Alert severity="success" icon={<CheckCircle />}>
                {t('payment.transactionConfirmed')}
                <Link 
                  href={getEtherscanUrl(txHash)} 
                  target="_blank"
                  rel="noopener"
                  sx={{ ml: 1 }}
                >
                  {t('payment.viewOnEtherscan')} <OpenInNew fontSize="small" />
                </Link>
              </Alert>
            )}
            
            {txStatus === 'failed' && (
              <Alert severity="error" icon={<ErrorIcon />}>
                {t('payment.transactionFailed')}
                <Link 
                  href={getEtherscanUrl(txHash)} 
                  target="_blank"
                  rel="noopener"
                  sx={{ ml: 1 }}
                >
                  {t('payment.viewOnEtherscan')} <OpenInNew fontSize="small" />
                </Link>
              </Alert>
            )}
          </Box>
        )}
      </DialogContent>
      
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          {txStatus === 'confirmed' ? t('common.close') : t('common.cancel')}
        </Button>
        
        {txStatus !== 'confirmed' && (
          <Button
            variant="contained"
            onClick={handleWithdraw}
            disabled={
              loading || 
              !amount || 
              !recipientAddress || 
              parseFloat(amount) <= 0 ||
              parseFloat(amount) > parseFloat(balances[token])
            }
            startIcon={loading ? <CircularProgress size={20} /> : <Send />}
          >
            {loading ? t('payment.processing') : t('payment.withdraw')}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default ERC20WithdrawalDialog;
