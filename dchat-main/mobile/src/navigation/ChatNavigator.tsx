/**
 * Chat Navigator
 * 
 * Stack navigation for chat screens.
 * 
 * @author Manus AI
 * @date 2024-11-13
 */

import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { ChatStackParamList } from '@/types';

// Screens (placeholders)
import ChatListScreen from '@/screens/Chat/ChatListScreen';
import ChatDetailScreen from '@/screens/Chat/ChatDetailScreen';
import NewChatScreen from '@/screens/Chat/NewChatScreen';
import GroupInfoScreen from '@/screens/Chat/GroupInfoScreen';

const Stack = createStackNavigator<ChatStackParamList>();

const ChatNavigator = () => {
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
        name="ChatList" 
        component={ChatListScreen}
        options={{ title: 'Chats' }}
      />
      <Stack.Screen 
        name="ChatDetail" 
        component={ChatDetailScreen}
        options={{ title: '' }}
      />
      <Stack.Screen 
        name="NewChat" 
        component={NewChatScreen}
        options={{ title: 'New Chat' }}
      />
      <Stack.Screen 
        name="GroupInfo" 
        component={GroupInfoScreen}
        options={{ title: 'Group Info' }}
      />
    </Stack.Navigator>
  );
};

export default ChatNavigator;
