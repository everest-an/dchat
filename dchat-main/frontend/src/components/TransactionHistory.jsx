/**
 * Transaction History Component
 * 
 * Displays transaction history for custodial wallet with filtering and sorting.
 * Shows deposits, withdrawals, and internal transfers.
 * 
 * Features:
 * - Real-time transaction list
 * - Status indicators
 * - Etherscan links
 * - Filter by type/status
 * - Sort by date/amount
 * - Pagination
 * 
 * @author Manus AI
 * @date 2025-11-05
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  IconButton,
  Typography,
  Link,
  Tooltip,
  CircularProgress,
  Alert,
  FormControl,
  Select,
  MenuItem,
  InputLabel
} from '@mui/material';
import {
  OpenInNew,
  Refresh,
  ArrowUpward,
  ArrowDownward,
  SwapHoriz,
  CheckCircle,
  HourglassEmpty,
  Error as ErrorIcon
} from '@mui/icons-material';
import { useLanguage } from '../contexts/LanguageContext';

/**
 * Transaction History Component
 */
const TransactionHistory = ({ walletAddress }) => {
  const { t } = useLanguage();
  
  // Data state
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Pagination state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  
  // Filter state
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  
  /**
   * Load transactions on mount and when filters change
   */
  useEffect(() => {
    if (walletAddress) {
      loadTransactions();
    }
  }, [walletAddress, page, rowsPerPage, filterType, filterStatus]);
  
  /**
   * Load transactions from backend
   */
  const loadTransactions = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        page: page + 1,
        per_page: rowsPerPage,
        ...(filterType !== 'all' && { type: filterType }),
        ...(filterStatus !== 'all' && { status: filterStatus })
      });
      
      const response = await fetch(
        `/api/wallets/custodial/${walletAddress}/transactions?${params}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      
      if (!response.ok) throw new Error('Failed to load transactions');
      
      const data = await response.json();
      setTransactions(data.transactions || []);
      setTotalCount(data.total || 0);
    } catch (err) {
      console.error('Failed to load transactions:', err);
      setError(t('payment.transactionLoadFailed'));
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * Handle page change
   */
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };
  
  /**
   * Handle rows per page change
   */
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };
  
  /**
   * Get transaction type icon
   */
  const getTypeIcon = (type) => {
    switch (type) {
      case 'deposit':
        return <ArrowDownward fontSize="small" color="success" />;
      case 'withdrawal':
        return <ArrowUpward fontSize="small" color="error" />;
      case 'transfer':
      case 'payment':
        return <SwapHoriz fontSize="small" color="primary" />;
      default:
        return null;
    }
  };
  
  /**
   * Get status chip
   */
  const getStatusChip = (status) => {
    switch (status) {
      case 'confirmed':
        return (
          <Chip 
            icon={<CheckCircle />}
            label={t('payment.statusConfirmed')}
            color="success"
            size="small"
          />
        );
      case 'pending':
        return (
          <Chip 
            icon={<HourglassEmpty />}
            label={t('payment.statusPending')}
            color="warning"
            size="small"
          />
        );
      case 'failed':
        return (
          <Chip 
            icon={<ErrorIcon />}
            label={t('payment.statusFailed')}
            color="error"
            size="small"
          />
        );
      default:
        return <Chip label={status} size="small" />;
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
   * Format amount
   */
  const formatAmount = (amount, token) => {
    const num = parseFloat(amount);
    if (num === 0) return '0';
    if (num < 0.000001) return num.toExponential(2);
    return num.toFixed(6);
  };
  
  /**
   * Format date
   */
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };
  
  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">
          {t('payment.transactionHistory')}
        </Typography>
        
        <Tooltip title={t('common.refresh')}>
          <IconButton onClick={loadTransactions} disabled={loading}>
            <Refresh />
          </IconButton>
        </Tooltip>
      </Box>
      
      {/* Filters */}
      <Box display="flex" gap={2} mb={2}>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>{t('payment.filterType')}</InputLabel>
          <Select
            value={filterType}
            onChange={(e) => {
              setFilterType(e.target.value);
              setPage(0);
            }}
            label={t('payment.filterType')}
          >
            <MenuItem value="all">{t('common.all')}</MenuItem>
            <MenuItem value="deposit">{t('payment.typeDeposit')}</MenuItem>
            <MenuItem value="withdrawal">{t('payment.typeWithdrawal')}</MenuItem>
            <MenuItem value="transfer">{t('payment.typeTransfer')}</MenuItem>
            <MenuItem value="payment">{t('payment.typePayment')}</MenuItem>
          </Select>
        </FormControl>
        
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>{t('payment.filterStatus')}</InputLabel>
          <Select
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value);
              setPage(0);
            }}
            label={t('payment.filterStatus')}
          >
            <MenuItem value="all">{t('common.all')}</MenuItem>
            <MenuItem value="pending">{t('payment.statusPending')}</MenuItem>
            <MenuItem value="confirmed">{t('payment.statusConfirmed')}</MenuItem>
            <MenuItem value="failed">{t('payment.statusFailed')}</MenuItem>
          </Select>
        </FormControl>
      </Box>
      
      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      {/* Loading State */}
      {loading && transactions.length === 0 && (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      )}
      
      {/* Transaction Table */}
      {!loading || transactions.length > 0 ? (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>{t('payment.type')}</TableCell>
                <TableCell>{t('payment.token')}</TableCell>
                <TableCell align="right">{t('payment.amount')}</TableCell>
                <TableCell>{t('payment.status')}</TableCell>
                <TableCell>{t('payment.date')}</TableCell>
                <TableCell>{t('payment.transaction')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <Typography color="textSecondary">
                      {t('payment.noTransactions')}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                transactions.map((tx) => (
                  <TableRow key={tx.id} hover>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        {getTypeIcon(tx.transaction_type)}
                        <Typography variant="body2">
                          {t(`payment.type${tx.transaction_type.charAt(0).toUpperCase() + tx.transaction_type.slice(1)}`)}
                        </Typography>
                      </Box>
                    </TableCell>
                    
                    <TableCell>
                      <Chip label={tx.token} size="small" />
                    </TableCell>
                    
                    <TableCell align="right">
                      <Typography 
                        variant="body2"
                        color={tx.transaction_type === 'deposit' ? 'success.main' : 'text.primary'}
                      >
                        {tx.transaction_type === 'deposit' ? '+' : '-'}
                        {formatAmount(tx.amount, tx.token)} {tx.token}
                      </Typography>
                      {tx.amount_usd && (
                        <Typography variant="caption" color="textSecondary">
                          ≈ ${tx.amount_usd.toFixed(2)}
                        </Typography>
                      )}
                    </TableCell>
                    
                    <TableCell>
                      {getStatusChip(tx.status)}
                    </TableCell>
                    
                    <TableCell>
                      <Typography variant="body2">
                        {formatDate(tx.created_at)}
                      </Typography>
                      {tx.confirmed_at && tx.status === 'confirmed' && (
                        <Typography variant="caption" color="textSecondary">
                          {t('payment.confirmed')}: {formatDate(tx.confirmed_at)}
                        </Typography>
                      )}
                    </TableCell>
                    
                    <TableCell>
                      {tx.transaction_hash ? (
                        <Link
                          href={getEtherscanUrl(tx.transaction_hash)}
                          target="_blank"
                          rel="noopener"
                          sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
                        >
                          <Typography variant="caption" fontFamily="monospace">
                            {tx.transaction_hash.slice(0, 10)}...
                          </Typography>
                          <OpenInNew fontSize="small" />
                        </Link>
                      ) : (
                        <Typography variant="caption" color="textSecondary">
                          -
                        </Typography>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          
          {/* Pagination */}
          <TablePagination
            component="div"
            count={totalCount}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[5, 10, 25, 50]}
            labelRowsPerPage={t('common.rowsPerPage')}
          />
        </TableContainer>
      ) : null}
    </Box>
  );
};

export default TransactionHistory;
