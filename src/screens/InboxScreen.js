import React, { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar, IconButton, Pill } from '../components/ui';
import { conversations } from '../data/demoData';
import { useAuth } from '../context/AuthContext';
import { listenToConversations, listenToMessages, sendMessage } from '../firebase/dataService';
import { colors } from '../theme';

export default function InboxScreen() {
  const { user, isDemo } = useAuth();
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState('All');
  const [liveConversations, setLiveConversations] = useState([]);

  useEffect(() => {
    if (isDemo || !user?.id) return undefined;
    return listenToConversations(user.id, setLiveConversations, error => Alert.alert('Inbox error', error.message || 'Conversations are unavailable.'));
  }, [isDemo, user?.id]);

  const conversationItems = liveConversations.length ? liveConversations.map(item => ({
    ...item,
    name: item.name || 'StudentNet connection',
    initials: item.initials || 'SN',
    text: item.lastMessage || 'Start a conversation',
    time: 'recent',
    unread: 0,
    color: colors.mint,
    online: false,
  })) : conversations;
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}><View><Text style={styles.eyebrow}>STAY CONNECTED</Text><Text style={styles.title}>Messages</Text></View><IconButton name="create-outline" /></View>
      <View style={styles.search}><Ionicons name="search-outline" size={19} color={colors.subtle} /><TextInput placeholder="Search conversations" placeholderTextColor={colors.subtle} style={styles.searchInput} /></View>
      <View style={styles.filters}>{['All', 'Unread', 'Recruiters'].map(item => <Pill key={item} active={filter === item} onPress={() => setFilter(item)}>{item}</Pill>)}</View>
      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        <View style={styles.requests}><View style={styles.requestIcon}><Ionicons name="mail-unread-outline" size={20} color={colors.green} /></View><View style={{ flex: 1 }}><Text style={styles.requestTitle}>Message requests</Text><Text style={styles.requestCopy}>2 people outside your network</Text></View><View style={styles.requestCount}><Text style={styles.requestCountText}>2</Text></View><Ionicons name="chevron-forward" size={17} color={colors.subtle} /></View>
        <Text style={styles.listEyebrow}>RECENT</Text>
        {conversationItems.map(item => (
          <Pressable key={item.id} onPress={() => setSelected(item)} style={styles.conversation}>
            <Avatar initials={item.initials} color={item.color} size={53} online={item.online} />
            <View style={styles.conversationCopy}><Text style={styles.conversationName}>{item.name}</Text><Text numberOfLines={1} style={[styles.conversationText, item.unread && styles.unreadText]}>{item.text}</Text></View>
            <View style={styles.conversationMeta}><Text style={styles.time}>{item.time}</Text>{item.unread ? <View style={styles.unread}><Text style={styles.unreadCount}>{item.unread}</Text></View> : null}</View>
          </Pressable>
        ))}
      </ScrollView>
      <ConversationModal conversation={selected} onClose={() => setSelected(null)} />
    </SafeAreaView>
  );
}

function ConversationModal({ conversation, onClose }) {
  const { user, isDemo } = useAuth();
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState([
    { id: '1', mine: false, text: 'Hi! I came across your profile through the BSc IT community.', time: '09:36' },
    { id: '2', mine: false, text: conversation?.text || '', time: '09:42' },
    { id: '3', mine: true, text: 'Thank you — I would really appreciate that!', time: '09:44' },
  ]);
  useEffect(() => {
    if (!conversation || isDemo || !conversation.id || !conversation.participants) return undefined;
    return listenToMessages(conversation.id, items => setMessages(items.map(item => ({ ...item, mine: item.senderId === user.id, time: item.createdAt?.toDate?.()?.toLocaleTimeString?.([], { hour: '2-digit', minute: '2-digit' }) || 'now' }))), error => Alert.alert('Message error', error.message || 'Messages are unavailable.'));
  }, [conversation, isDemo, user.id]);
  if (!conversation) return null;
  async function submit() {
    if (!draft.trim()) return;
    const text = draft.trim();
    try {
      if (!isDemo) {
        const recipientIds = conversation.participants?.filter(id => id !== user.id) || [conversation.recipientId];
        await sendMessage(conversation.id, user.id, recipientIds, text);
      }
      setMessages(current => [...current, { id: `${Date.now()}`, mine: true, text, time: 'now' }]);
      setDraft('');
    } catch (error) {
      Alert.alert('Message error', error.message || 'The message could not be sent.');
    }
  }
  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.chatPage}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.chatHeader}><IconButton name="arrow-back" onPress={onClose} /><Avatar initials={conversation.initials} color={conversation.color} size={42} online={conversation.online} /><View style={{ flex: 1 }}><Text style={styles.chatName}>{conversation.name}</Text><Text style={styles.chatStatus}>{conversation.online ? 'Active now' : 'Typically replies today'}</Text></View><IconButton name="videocam-outline" /><IconButton name="information-circle-outline" /></View>
          <ScrollView contentContainerStyle={styles.messages}>
            <View style={styles.dayPill}><Text style={styles.dayText}>TODAY</Text></View>
            {messages.map(message => <View key={message.id} style={[styles.bubbleWrap, message.mine && styles.bubbleWrapMine]}><View style={[styles.bubble, message.mine && styles.bubbleMine]}><Text style={[styles.bubbleText, message.mine && styles.bubbleTextMine]}>{message.text}</Text></View><Text style={styles.bubbleTime}>{message.time}</Text></View>)}
          </ScrollView>
          <View style={styles.messageComposer}><IconButton name="add" /><View style={styles.messageInputWrap}><TextInput value={draft} onChangeText={setDraft} onSubmitEditing={submit} placeholder="Write a message…" placeholderTextColor={colors.subtle} style={styles.messageInput} /><Ionicons name="happy-outline" size={21} color={colors.subtle} /></View><Pressable onPress={submit} style={styles.send}><Ionicons name="send" size={18} color={colors.white} /></Pressable></View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 18, paddingTop: 8 },
  eyebrow: { color: colors.green, fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
  title: { color: colors.ink, fontSize: 27, fontWeight: '900', letterSpacing: -0.9, marginTop: 4 },
  search: { height: 51, borderRadius: 17, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, marginHorizontal: 18, marginTop: 20, paddingHorizontal: 15, flexDirection: 'row', gap: 9, alignItems: 'center' },
  searchInput: { flex: 1, height: '100%', color: colors.ink, fontSize: 13 },
  filters: { flexDirection: 'row', gap: 8, paddingHorizontal: 18, paddingTop: 12 },
  list: { padding: 18, paddingBottom: 120 },
  requests: { flexDirection: 'row', gap: 11, alignItems: 'center', padding: 13, borderRadius: 18, backgroundColor: colors.mint, marginBottom: 23 },
  requestIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  requestTitle: { color: colors.ink, fontSize: 12, fontWeight: '900' },
  requestCopy: { color: colors.muted, fontSize: 9, marginTop: 3 },
  requestCount: { width: 20, height: 20, borderRadius: 10, backgroundColor: colors.forest, alignItems: 'center', justifyContent: 'center' },
  requestCountText: { color: colors.white, fontSize: 9, fontWeight: '900' },
  listEyebrow: { color: colors.green, fontSize: 9, fontWeight: '900', letterSpacing: 1.4, marginBottom: 5 },
  conversation: { flexDirection: 'row', alignItems: 'center', gap: 11, minHeight: 79, borderBottomWidth: 1, borderBottomColor: colors.line },
  conversationCopy: { flex: 1 },
  conversationName: { color: colors.ink, fontSize: 13, fontWeight: '900' },
  conversationText: { color: colors.muted, fontSize: 10, marginTop: 5 },
  unreadText: { color: colors.ink, fontWeight: '700' },
  conversationMeta: { alignItems: 'flex-end', gap: 9 },
  time: { color: colors.subtle, fontSize: 8 },
  unread: { minWidth: 20, height: 20, borderRadius: 10, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  unreadCount: { color: colors.white, fontSize: 9, fontWeight: '900' },
  chatPage: { flex: 1, backgroundColor: colors.cream },
  chatHeader: { height: 67, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.line },
  chatName: { color: colors.ink, fontSize: 12, fontWeight: '900' },
  chatStatus: { color: colors.green, fontSize: 8, marginTop: 2 },
  messages: { padding: 18, paddingBottom: 30 },
  dayPill: { alignSelf: 'center', backgroundColor: colors.white, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, marginBottom: 20 },
  dayText: { color: colors.subtle, fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  bubbleWrap: { alignSelf: 'flex-start', maxWidth: '82%', marginBottom: 14 },
  bubbleWrapMine: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  bubble: { backgroundColor: colors.white, borderRadius: 18, borderBottomLeftRadius: 5, paddingHorizontal: 14, paddingVertical: 11, borderWidth: 1, borderColor: colors.line },
  bubbleMine: { backgroundColor: colors.forest, borderColor: colors.forest, borderBottomLeftRadius: 18, borderBottomRightRadius: 5 },
  bubbleText: { color: colors.ink, fontSize: 12, lineHeight: 18 },
  bubbleTextMine: { color: colors.white },
  bubbleTime: { color: colors.subtle, fontSize: 8, marginTop: 4 },
  messageComposer: { padding: 12, paddingBottom: 20, flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.line },
  messageInputWrap: { flex: 1, height: 46, borderRadius: 16, paddingHorizontal: 14, backgroundColor: colors.cream, flexDirection: 'row', alignItems: 'center' },
  messageInput: { flex: 1, height: '100%', color: colors.ink, fontSize: 12 },
  send: { width: 43, height: 43, borderRadius: 15, backgroundColor: colors.forest, alignItems: 'center', justifyContent: 'center' },
});
