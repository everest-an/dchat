#!/bin/bash

# Create placeholder screen component
create_screen() {
    local dir=$1
    local name=$2
    local title=$3
    
    mkdir -p "$dir"
    cat > "$dir/${name}.tsx" << SCREEN
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, SIZES } from '@/constants/config';

const ${name} = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>${title}</Text>
      <Text style={styles.subtitle}>Coming soon...</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: SIZES.lg,
  },
  title: {
    fontSize: SIZES.h3,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: SIZES.sm,
  },
  subtitle: {
    fontSize: SIZES.body,
    color: COLORS.textSecondary,
  },
});

export default ${name};
SCREEN
}

# Auth screens
create_screen "Auth" "WelcomeScreen" "Welcome to Dchat"
create_screen "Auth" "ConnectWalletScreen" "Connect Wallet"
create_screen "Auth" "CreateProfileScreen" "Create Profile"

# Chat screens
create_screen "Chat" "ChatListScreen" "Chats"
create_screen "Chat" "ChatDetailScreen" "Chat"
create_screen "Chat" "NewChatScreen" "New Chat"
create_screen "Chat" "GroupInfoScreen" "Group Info"

# Contacts screen
create_screen "Contacts" "ContactsScreen" "Contacts"

# Wallet screens
create_screen "Wallet" "WalletHomeScreen" "Wallet"
create_screen "Wallet" "SendScreen" "Send"
create_screen "Wallet" "ReceiveScreen" "Receive"
create_screen "Wallet" "TransactionDetailScreen" "Transaction"
create_screen "Wallet" "TokenDetailScreen" "Token"

# Profile screens
create_screen "Profile" "ProfileHomeScreen" "Profile"
create_screen "Profile" "EditProfileScreen" "Edit Profile"
create_screen "Profile" "SettingsScreen" "Settings"
create_screen "Profile" "ProjectsScreen" "Projects"
create_screen "Profile" "AddProjectScreen" "Add Project"
create_screen "Profile" "EditProjectScreen" "Edit Project"

echo "✅ All placeholder screens created"
