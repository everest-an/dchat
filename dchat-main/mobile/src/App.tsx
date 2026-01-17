/**
 * Dchat Mobile App
 * 
 * Main application component with navigation and providers.
 * 
 * @author Manus AI
 * @date 2024-11-13
 */

import React, { useEffect } from 'react';
import { StatusBar, LogBox } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import RootNavigator from './navigation/RootNavigator';
import { useAuthStore } from './store/authStore';
import { initializeApp } from './utils/initialization';

// Ignore specific warnings
LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
]);

const App = () => {
  const { initialize } = useAuthStore();

  useEffect(() => {
    // Initialize app
    const init = async () => {
      try {
        await initializeApp();
        await initialize();
      } catch (error) {
        console.error('App initialization failed:', error);
      }
    };

    init();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <NavigationContainer>
          <RootNavigator />
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

export default App;
