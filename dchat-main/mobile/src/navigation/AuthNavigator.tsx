/**
 * Auth Navigator
 * 
 * Navigation for authentication flow.
 * 
 * @author Manus AI
 * @date 2024-11-13
 */

import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { AuthStackParamList } from '@/types';

// Screens (placeholders - will be created)
import WelcomeScreen from '@/screens/Auth/WelcomeScreen';
import ConnectWalletScreen from '@/screens/Auth/ConnectWalletScreen';
import CreateProfileScreen from '@/screens/Auth/CreateProfileScreen';

const Stack = createStackNavigator<AuthStackParamList>();

const AuthNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: '#FFFFFF' },
      }}
    >
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="ConnectWallet" component={ConnectWalletScreen} />
      <Stack.Screen name="CreateProfile" component={CreateProfileScreen} />
    </Stack.Navigator>
  );
};

export default AuthNavigator;
