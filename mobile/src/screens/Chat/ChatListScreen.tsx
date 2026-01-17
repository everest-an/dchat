import React, { useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { COLORS, SIZES } from '@/constants/config';
import { useChatStore } from '@/store/chatStore';
import type { ChatStackNavigationProp } from '@/types';

const ChatListScreen = () => {
  const navigation = useNavigation<ChatStackNavigationProp<'ChatList'>>();
  const { conversations, loadConversations } = useChatStore();

  useEffect(() => {
    loadConversations();
  }, []);

  const renderConversation = ({ item }: any) => (
    <TouchableOpacity
      style={styles.conversationCard}
      onPress={() => navigation.navigate('ChatDetail', { chatId: item.id })}
      activeOpacity={0.7}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{item.name[0]}</Text>
      </View>
      <View style={styles.conversationContent}>
        <View style={styles.conversationHeader}>
          <Text style={styles.conversationName}>{item.name}</Text>
          <Text style={styles.conversationTime}>{item.lastMessageTime}</Text>
        </View>
        <View style={styles.conversationFooter}>
          <Text style={styles.lastMessage} numberOfLines={1}>{item.lastMessage}</Text>
          {item.unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>{item.unreadCount}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
        <TouchableOpacity onPress={() => navigation.navigate('NewChat')}>
          <Icon name="create-outline" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>
      
      <FlatList
        data={conversations}
        renderItem={renderConversation}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: SIZES.lg, paddingVertical: SIZES.md, borderBottomWidth: 1, borderBottomColor: COLORS.border
  },
  headerTitle: { fontSize: SIZES.h3, fontWeight: 'bold', color: COLORS.textPrimary },
  list: { paddingVertical: SIZES.sm },
  conversationCard: {
    flexDirection: 'row', padding: SIZES.md, borderBottomWidth: 1, borderBottomColor: COLORS.divider
  },
  avatar: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.primary,
    justifyContent: 'center', alignItems: 'center', marginRight: SIZES.md
  },
  avatarText: { fontSize: SIZES.h4, fontWeight: 'bold', color: COLORS.white },
  conversationContent: { flex: 1, justifyContent: 'center' },
  conversationHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: SIZES.xs },
  conversationName: { fontSize: SIZES.h6, fontWeight: '600', color: COLORS.textPrimary },
  conversationTime: { fontSize: SIZES.caption, color: COLORS.textTertiary },
  conversationFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  lastMessage: { flex: 1, fontSize: SIZES.bodySmall, color: COLORS.textSecondary },
  unreadBadge: {
    backgroundColor: COLORS.primary, borderRadius: 10, minWidth: 20, height: 20,
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: SIZES.xs
  },
  unreadText: { fontSize: SIZES.caption, fontWeight: 'bold', color: COLORS.white },
});

export default ChatListScreen;
