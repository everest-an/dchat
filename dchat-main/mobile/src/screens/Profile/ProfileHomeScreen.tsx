import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { COLORS, SIZES } from '@/constants/config';
import { useAuthStore } from '@/store/authStore';
import { formatAddress } from '@/utils/format';

const ProfileHomeScreen = () => {
  const navigation = useNavigation();
  const { user, logout } = useAuthStore();

  const menuItems = [
    { id: 'edit', icon: 'person-outline', label: 'Edit Profile', onPress: () => navigation.navigate('EditProfile') },
    { id: 'projects', icon: 'briefcase-outline', label: 'My Projects', onPress: () => navigation.navigate('Projects') },
    { id: 'settings', icon: 'settings-outline', label: 'Settings', onPress: () => navigation.navigate('Settings') },
    { id: 'logout', icon: 'log-out-outline', label: 'Logout', onPress: logout, color: COLORS.error },
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.profileCard}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.name?.[0] || 'U'}</Text>
          </View>
        </View>
        <Text style={styles.name}>{user?.name || 'Anonymous'}</Text>
        <Text style={styles.title}>{user?.title || 'Professional'}</Text>
        <Text style={styles.address}>{formatAddress(user?.walletAddress || '')}</Text>
        
        <View style={styles.stats}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>0</Text>
            <Text style={styles.statLabel}>Projects</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>0</Text>
            <Text style={styles.statLabel}>Connections</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>0</Text>
            <Text style={styles.statLabel}>Reviews</Text>
          </View>
        </View>
      </View>

      <View style={styles.menu}>
        {menuItems.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.menuItem}
            onPress={item.onPress}
            activeOpacity={0.7}
          >
            <View style={styles.menuItemLeft}>
              <Icon name={item.icon} size={24} color={item.color || COLORS.textPrimary} />
              <Text style={[styles.menuItemLabel, item.color && { color: item.color }]}>
                {item.label}
              </Text>
            </View>
            <Icon name="chevron-forward" size={20} color={COLORS.textTertiary} />
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.backgroundSecondary },
  profileCard: {
    backgroundColor: COLORS.white, padding: SIZES.xl, alignItems: 'center', marginBottom: SIZES.md
  },
  avatarContainer: { marginBottom: SIZES.md },
  avatar: {
    width: 100, height: 100, borderRadius: 50, backgroundColor: COLORS.primary,
    justifyContent: 'center', alignItems: 'center'
  },
  avatarText: { fontSize: 40, fontWeight: 'bold', color: COLORS.white },
  name: { fontSize: SIZES.h3, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: SIZES.xs },
  title: { fontSize: SIZES.body, color: COLORS.textSecondary, marginBottom: SIZES.xs },
  address: { fontSize: SIZES.bodySmall, color: COLORS.textTertiary, marginBottom: SIZES.lg },
  stats: {
    flexDirection: 'row', width: '100%', justifyContent: 'space-around', paddingTop: SIZES.lg,
    borderTopWidth: 1, borderTopColor: COLORS.border
  },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: SIZES.h4, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: SIZES.xs },
  statLabel: { fontSize: SIZES.caption, color: COLORS.textSecondary },
  statDivider: { width: 1, backgroundColor: COLORS.border },
  menu: { backgroundColor: COLORS.white, marginBottom: SIZES.md },
  menuItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: SIZES.lg, paddingVertical: SIZES.md,
    borderBottomWidth: 1, borderBottomColor: COLORS.divider
  },
  menuItemLeft: { flexDirection: 'row', alignItems: 'center' },
  menuItemLabel: { fontSize: SIZES.body, color: COLORS.textPrimary, marginLeft: SIZES.md },
});

export default ProfileHomeScreen;
