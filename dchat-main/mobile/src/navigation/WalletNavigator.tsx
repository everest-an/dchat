/**
 * Wallet Navigator
 * 
 * Stack navigation for wallet screens.
 * 
 * @author Manus AI
 * @date 2024-11-13
 */

import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { WalletStackParamList } from '@/types';

// Screens (placeholders)
import WalletHomeScreen from '@/screens/Wallet/WalletHomeScreen';
import SendScreen from '@/screens/Wallet/SendScreen';
import ReceiveScreen from '@/screens/Wallet/ReceiveScreen';
import TransactionDetailScreen from '@/screens/Wallet/TransactionDetailScreen';
import TokenDetailScreen from '@/screens/Wallet/TokenDetailScreen';

const Stack = createStackNavigator<WalletStackParamList>();

const WalletNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: '#FFFFFF',
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: '#E5E5EA',
        },
        headerTintColor: '#000000',
        headerTitleStyle: {
          fontWeight: '600',
          fontSize: 18,
        },
      }}
    >
      <Stack.Screen 
        name="WalletHome" 
        component={WalletHomeScreen}
        options={{ title: 'Wallet' }}
      />
      <Stack.Screen 
        name="Send" 
        component={SendScreen}
        options={{ title: 'Send' }}
      />
      <Stack.Screen 
        name="Receive" 
        component={ReceiveScreen}
        options={{ title: 'Receive' }}
      />
      <Stack.Screen 
        name="TransactionDetail" 
        component={TransactionDetailScreen}
        options={{ title: 'Transaction' }}
      />
      <Stack.Screen 
        name="TokenDetail" 
        component={TokenDetailScreen}
        options={{ title: '' }}
      />
    </Stack.Navigator>
  );
};

export default WalletNavigator;
