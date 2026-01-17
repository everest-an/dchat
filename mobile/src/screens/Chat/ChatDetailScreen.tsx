import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { COLORS, SIZES } from '@/constants/config';
import { useChatStore } from '@/store/chatStore';

const ChatDetailScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { chatId } = route.params as any;
  const { messages, sendMessage, loadMessages } = useChatStore();
  const [inputText, setInputText] = useState('');

  useEffect(() => {
    loadMessages(chatId);
  }, [chatId]);

  const handleSend = () => {
    if (inputText.trim()) {
      sendMessage(chatId, inputText.trim());
      setInputText('');
    }
  };

  const renderMessage = ({ item }: any) => (
    <View style={[styles.messageBubble, item.isSent ? styles.sentBubble : styles.receivedBubble]}>
      <Text style={[styles.messageText, item.isSent ? styles.sentText : styles.receivedText]}>
        {item.content}
      </Text>
      <Text style={[styles.messageTime, item.isSent ? styles.sentTime : styles.receivedTime]}>
        {item.timestamp}
      </Text>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chat</Text>
        <TouchableOpacity>
          <Icon name="videocam-outline" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messageList}
        inverted
      />

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          placeholderTextColor={COLORS.textPlaceholder}
          value={inputText}
          onChangeText={setInputText}
          multiline
        />
        <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
          <Icon name="send" size={20} color={COLORS.white} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: SIZES.lg, paddingVertical: SIZES.md, borderBottomWidth: 1, borderBottomColor: COLORS.border
  },
  headerTitle: { fontSize: SIZES.h5, fontWeight: '600', color: COLORS.textPrimary },
  messageList: { paddingHorizontal: SIZES.md, paddingVertical: SIZES.sm },
  messageBubble: {
    maxWidth: '75%', borderRadius: SIZES.radiusMd, padding: SIZES.md, marginVertical: SIZES.xs
  },
  sentBubble: { alignSelf: 'flex-end', backgroundColor: COLORS.messageSent },
  receivedBubble: { alignSelf: 'flex-start', backgroundColor: COLORS.messageReceived },
  messageText: { fontSize: SIZES.body, marginBottom: SIZES.xs },
  sentText: { color: COLORS.messageText },
  receivedText: { color: COLORS.messageTextReceived },
  messageTime: { fontSize: SIZES.tiny, alignSelf: 'flex-end' },
  sentTime: { color: COLORS.white, opacity: 0.8 },
  receivedTime: { color: COLORS.textTertiary },
  inputContainer: {
    flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm, borderTopWidth: 1, borderTopColor: COLORS.border
  },
  input: {
    flex: 1, backgroundColor: COLORS.gray1, borderRadius: SIZES.radiusLg,
    paddingHorizontal: SIZES.md, paddingVertical: SIZES.sm, marginRight: SIZES.sm,
    maxHeight: 100, fontSize: SIZES.body, color: COLORS.textPrimary
  },
  sendButton: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primary,
    justifyContent: 'center', alignItems: 'center'
  },
});

export default ChatDetailScreen;
