/**
 * Profile Navigator
 * 
 * Stack navigation for profile screens.
 * 
 * @author Manus AI
 * @date 2024-11-13
 */

import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { ProfileStackParamList } from '@/types';

// Screens (placeholders)
import ProfileHomeScreen from '@/screens/Profile/ProfileHomeScreen';
import EditProfileScreen from '@/screens/Profile/EditProfileScreen';
import SettingsScreen from '@/screens/Profile/SettingsScreen';
import ProjectsScreen from '@/screens/Profile/ProjectsScreen';
import AddProjectScreen from '@/screens/Profile/AddProjectScreen';
import EditProjectScreen from '@/screens/Profile/EditProjectScreen';

const Stack = createStackNavigator<ProfileStackParamList>();

const ProfileNavigator = () => {
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
        name="ProfileHome" 
        component={ProfileHomeScreen}
        options={{ title: 'Profile' }}
      />
      <Stack.Screen 
        name="EditProfile" 
        component={EditProfileScreen}
        options={{ title: 'Edit Profile' }}
      />
      <Stack.Screen 
        name="Settings" 
        component={SettingsScreen}
        options={{ title: 'Settings' }}
      />
      <Stack.Screen 
        name="Projects" 
        component={ProjectsScreen}
        options={{ title: 'Projects' }}
      />
      <Stack.Screen 
        name="AddProject" 
        component={AddProjectScreen}
        options={{ title: 'Add Project' }}
      />
      <Stack.Screen 
        name="EditProject" 
        component={EditProjectScreen}
        options={{ title: 'Edit Project' }}
      />
    </Stack.Navigator>
  );
};

export default ProfileNavigator;
