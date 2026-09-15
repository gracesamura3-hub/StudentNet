import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar, IconButton, Pill, SectionHeader } from '../components/ui';
import { notifications as seedNotifications, posts as seedPosts, stories } from '../data/demoData';
import { useAuth } from '../context/AuthContext';
import { createPost, listenToFeed, listenToPublishedAnnouncements, listenToPublishedEvents, toggleReaction } from '../firebase/dataService';
import { colors, shadow } from '../theme';
import { pickDocumentAsset, pickImageAsset, uploadMediaAsset } from '../utils/mediaUpload';

const roleContent = {
  student: { eyebrow: 'YOUR NEXT STEP', title: '3 new roles match your skills', detail: 'Based on React Native, JavaScript and your BSc IT programme.', action: 'See my matches', icon: 'sparkles' },
  alumni: { eyebrow: 'GIVE BACK', title: '2 students requested mentorship', detail: 'Share the lessons you wish you had known before graduating.', action: 'View requests', icon: 'people' },
  business: { eyebrow: 'TALENT PIPELINE', title: '18 strong candidates this week', detail: 'Seven candidates match all essential skills for your active role.', action: 'Review candidates', icon: 'briefcase' },
  admin: { eyebrow: 'COMMUNITY HEALTH', title: '17 items need your attention', detail: 'Nine employer approvals, five opportunities and three reports.', action: 'Open review queue', icon: 'shield-checkmark' },
};

export default function HomeScreen({ navigation }) {
  const { user, isDemo, notifications: liveNotifications, dismissNotification } = useAuth();
  const [feed, setFeed] = useState(seedPosts);
  const [events, setEvents] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [composerOpen, setComposerOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [attachments, setAttachments] = useState([]);
  const banner = roleContent[user.role] || roleContent.student;
  const greeting = useMemo(() => new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening', []);

  useEffect(() => {
    if (isDemo) return undefined;
    const stopFeed = listenToFeed(user.id, livePosts => setFeed(livePosts.map(post => ({
      ...post,
      initials: post.initials || post.author?.split(' ').map(part => part[0]).join('').slice(0, 2),
      role: post.authorHeadline || post.authorRole,
      time: 'recently',
      accent: colors.mint,
      reactions: post.reactions || 0,
      comments: post.commentCount || 0,
      tag: post.tag || '#ProfessionalUpdate',
    }))), () => {});
    const stopEvents = listenToPublishedEvents(items => setEvents(items.slice(0, 3)), () => {});
    const stopAnnouncements = listenToPublishedAnnouncements(items => setAnnouncements(items.slice(0, 3)), () => {});
    return () => { stopFeed(); stopEvents(); stopAnnouncements(); };
  }, [isDemo, user.id]);

  const publishPost = useCallback(async () => {
    if (!draft.trim() && !attachments.length) return;
    const preparedAttachments = await Promise.all(attachments.map(async attachment => {
      const uploaded = await uploadMediaAsset(attachment);
      return {
        ...uploaded,
        uploadedUrl: uploaded.uploadedUrl || uploaded.uri,
      };
    }));

    const newPost = {
      id: `local-${Date.now()}`, authorId: user.id, author: user.name, initials: user.initials,
      role: user.headline, time: 'now', accent: colors.mint, body: draft.trim(), tag: '#ProfessionalUpdate', reactions: 0, comments: 0,
      attachments: preparedAttachments,
    };
    setFeed(current => [newPost, ...current]);
    setDraft('');
    setAttachments([]);
    setComposerOpen(false);
    if (!isDemo) await createPost(user, newPost.body, preparedAttachments);
  }, [attachments, draft, isDemo, user]);

  const react = useCallback(async post => {
    setFeed(current => current.map(item => item.id === post.id ? { ...item, reacted: !item.reacted, reactions: item.reactions + (item.reacted ? -1 : 1) } : item));
    if (!isDemo && !post.id.startsWith('local-')) await toggleReaction(post.id, user.id, post.reacted);
  }, [isDemo, user.id]);

  const addAttachment = useCallback(async type => {
    try {
      const asset = type === 'image' ? await pickImageAsset() : await pickDocumentAsset();
      if (!asset) return;
      setAttachments(current => [...current, asset]);
    } catch (error) {
      Alert.alert('Upload unavailable', error.message || 'Unable to access media right now.');
    }
  }, []);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{greeting},</Text>
            <View style={styles.nameRow}><Text style={styles.name}>{user.firstName}</Text><Ionicons name="sparkles-outline" size={18} color={colors.gold} /></View>
          </View>
          <View style={styles.headerActions}>
            <IconButton name="search-outline" />
            <IconButton name="notifications-outline" badge="3" onPress={() => setNotificationsOpen(true)} />
          </View>
        </View>

        <LinearGradient colors={['#0D3B2E', '#1A5B44']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.banner}>
          <View style={styles.bannerGlow} />
          <View style={styles.bannerIcon}><Ionicons name={banner.icon} size={21} color={colors.forest} /></View>
          <View style={styles.bannerCopy}>
            <Text style={styles.bannerEyebrow}>{banner.eyebrow}</Text>
            <Text style={styles.bannerTitle}>{banner.title}</Text>
            <Text style={styles.bannerDetail}>{banner.detail}</Text>
            <Pressable style={styles.bannerAction} onPress={() => navigation.navigate(user.role === 'admin' ? 'Insights' : 'Opportunities')}>
              <Text style={styles.bannerActionText}>{banner.action}</Text><Ionicons name="arrow-forward" size={15} color={colors.forest} />
            </Pressable>
          </View>
        </LinearGradient>

        <View style={styles.quickRow}>
          <QuickAction icon="create-outline" label="Share update" tone={colors.coralPale} iconColor={colors.coral} onPress={() => setComposerOpen(true)} />
          <QuickAction icon="people-outline" label="Find people" tone={colors.bluePale} iconColor={colors.blue} onPress={() => navigation.navigate('Network')} />
          <QuickAction icon="stats-chart-outline" label="My insights" tone={colors.goldPale} iconColor="#A97105" onPress={() => navigation.navigate('Insights')} />
        </View>

        {announcements.length ? <View style={styles.section}><SectionHeader title="Announcements" action="Latest" /><View style={styles.noticeList}>{announcements.map(item => (
          <View key={item.id} style={styles.noticeCard}><Text style={styles.noticeEyebrow}>{item.audience || 'All users'}</Text><Text style={styles.noticeTitle}>{item.title}</Text><Text style={styles.noticeBody}>{item.body}</Text></View>
        ))}</View></View> : null}

        {events.length ? <View style={styles.section}><SectionHeader title="Official events" action="View all" /><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.eventRow}>{events.map(event => (
          <View key={event.id} style={styles.eventCard}><Text style={styles.eventDate}>{event.date || 'TBC'}</Text><Text style={styles.eventTitle}>{event.title}</Text><Text style={styles.eventMeta}>{event.location || 'Richfield Campus'}</Text></View>
        ))}</ScrollView></View> : null}

        <View style={styles.section}>
          <SectionHeader title="Career stories" action="View all" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.storyRow}>
            <Pressable style={styles.story}>
              <View style={styles.addStory}><Ionicons name="add" size={23} color={colors.green} /></View>
              <Text style={styles.storyName}>Add yours</Text><Text style={styles.storyLabel}>Share a moment</Text>
            </Pressable>
            {stories.map(story => (
              <Pressable style={styles.story} key={story.id}>
                <View style={styles.storyRing}><Avatar initials={story.initials} size={56} color={story.color} /></View>
                <Text style={styles.storyName}>{story.name}</Text><Text numberOfLines={1} style={styles.storyLabel}>{story.label}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        <View style={styles.feedHeader}>
          <SectionHeader title="For you" />
          <Pill icon="options-outline">Relevant</Pill>
        </View>
        {feed.map(post => <PostCard key={post.id} post={post} onReact={() => react(post)} />)}
      </ScrollView>

      <ComposeModal visible={composerOpen} onClose={() => setComposerOpen(false)} user={user} draft={draft} setDraft={setDraft} attachments={attachments} setAttachments={setAttachments} publish={publishPost} onAddAttachment={addAttachment} />
      <NotificationsModal visible={notificationsOpen} onClose={() => setNotificationsOpen(false)} />
    </SafeAreaView>
  );
}

const QuickAction = React.memo(function QuickAction({ icon, label, tone, iconColor, onPress }) {
  return <Pressable onPress={onPress} style={styles.quick}><View style={[styles.quickIcon, { backgroundColor: tone }]}><Ionicons name={icon} size={20} color={iconColor} /></View><Text style={styles.quickLabel}>{label}</Text></Pressable>;
});

const PostCard = React.memo(function PostCard({ post, onReact }) {
  return (
    <View style={styles.post}>
      <View style={styles.postHeader}>
        <Avatar initials={post.initials} color={post.accent} />
        <View style={styles.postIdentity}><Text style={styles.postAuthor}>{post.author}</Text><Text numberOfLines={1} style={styles.postRole}>{post.role}</Text><Text style={styles.postTime}>{post.time} · <Ionicons name="people" size={11} /></Text></View>
        <IconButton name="ellipsis-horizontal" size={36} />
      </View>
      {post.thumbnailUrl || post.thumbnailUri ? <Pressable style={styles.videoPreview}><Image source={{ uri: post.thumbnailUrl || post.thumbnailUri }} style={styles.videoThumbnail} resizeMode="cover" /><View style={styles.videoPlay}><Ionicons name="play" size={20} color={colors.forest} /></View><Text style={styles.videoLabel}>Video story</Text></Pressable> : null}
      <Text style={styles.postBody}>{post.body}</Text>
      <Text style={styles.postTag}>{post.tag}</Text>
      <View style={styles.postStats}><Text style={styles.postStat}><Text style={styles.reactionBubble}>👏</Text> {post.reactions}</Text><Text style={styles.postStat}>{post.comments} comments</Text></View>
      <View style={styles.postActions}>
        <Pressable onPress={onReact} style={styles.postAction}><Ionicons name={post.reacted ? 'heart' : 'heart-outline'} size={20} color={post.reacted ? colors.coral : colors.muted} /><Text style={[styles.postActionText, post.reacted && { color: colors.coral }]}>Celebrate</Text></Pressable>
        <Pressable style={styles.postAction}><Ionicons name="chatbubble-outline" size={19} color={colors.muted} /><Text style={styles.postActionText}>Comment</Text></Pressable>
        <Pressable style={styles.postAction}><Ionicons name="paper-plane-outline" size={19} color={colors.muted} /><Text style={styles.postActionText}>Send</Text></Pressable>
      </View>
    </View>
  );
});

const ComposeModal = React.memo(function ComposeModal({ visible, onClose, user, draft, setDraft, publish, onAddAttachment, attachments = [], setAttachments }) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.modalPage}>
        <View style={styles.modalHeader}><Pressable onPress={onClose}><Text style={styles.modalCancel}>Cancel</Text></Pressable><Text style={styles.modalTitle}>Create a post</Text><Pressable onPress={publish}><Text style={[styles.modalPublish, !draft.trim() && !attachments.length && { opacity: 0.35 }]}>Post</Text></Pressable></View>
        <View style={styles.composerIdentity}><Avatar initials={user.initials} color={colors.mint} /><View><Text style={styles.postAuthor}>{user.name}</Text><Pill icon="people-outline">Connections</Pill></View></View>
        <TextInput autoFocus multiline value={draft} onChangeText={setDraft} placeholder="Share an achievement, idea or career update…" placeholderTextColor={colors.subtle} style={styles.composerInput} />
        {attachments.length ? <View style={styles.attachmentRow}>{attachments.map(attachment => <View key={attachment.id} style={styles.attachmentCard}><Text numberOfLines={1} style={styles.attachmentName}>{attachment.name}</Text><Pressable onPress={() => setAttachments(current => current.filter(item => item.id !== attachment.id))}><Ionicons name="close-circle" size={16} color={colors.coral} /></Pressable></View>)}</View> : null}
        <View style={styles.composerTools}>
          <Pressable onPress={() => onAddAttachment('image')}><View style={styles.toolButton}><Ionicons name="image-outline" size={20} color={colors.green} /></View></Pressable>
          <Pressable onPress={() => onAddAttachment('document')}><View style={styles.toolButton}><Ionicons name="document-text-outline" size={20} color={colors.green} /></View></Pressable>
          <View style={{ flex: 1 }} /><Text style={styles.characterCount}>{draft.length}/1,500</Text>
        </View>
      </SafeAreaView>
    </Modal>
  );
});

const NotificationsModal = React.memo(function NotificationsModal({ visible, onClose }) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.modalPage}>
        <View style={styles.modalHeader}><Pressable onPress={onClose}><Ionicons name="close" size={24} color={colors.ink} /></Pressable><Text style={styles.modalTitle}>Notifications</Text><Text style={styles.modalPublish}>Read all</Text></View>
        <ScrollView contentContainerStyle={styles.notificationList}>
          <Text style={styles.notificationEyebrow}>NEW</Text>
          {items.map(item => (
            <Pressable onPress={() => onRead?.(item.id)} style={styles.notification} key={item.id}>
              <View style={[styles.notificationIcon, { backgroundColor: item.tone === 'green' ? colors.mint : item.tone === 'blue' ? colors.bluePale : colors.goldPale }]}><Ionicons name={item.icon} size={20} color={colors.green} /></View>
              <View style={{ flex: 1 }}><Text style={styles.notificationTitle}>{item.title}</Text><Text style={styles.notificationDetail}>{item.detail}</Text></View><Text style={styles.notificationTime}>{item.time}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  content: { paddingHorizontal: 18, paddingBottom: 120 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10, paddingBottom: 18 },
  greeting: { color: colors.muted, fontSize: 13, fontWeight: '600' },
  name: { color: colors.ink, fontSize: 25, fontWeight: '900', letterSpacing: -0.8, marginTop: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  headerActions: { flexDirection: 'row', gap: 9 },
  banner: { minHeight: 190, borderRadius: 27, padding: 22, overflow: 'hidden', flexDirection: 'row', ...shadow },
  bannerGlow: { position: 'absolute', width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(201,242,123,0.1)', right: -60, top: -70 },
  bannerIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.lime, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  bannerCopy: { flex: 1 },
  bannerEyebrow: { color: colors.lime, fontSize: 9, fontWeight: '900', letterSpacing: 1.5, marginTop: 2 },
  bannerTitle: { color: colors.white, fontSize: 20, lineHeight: 24, fontWeight: '900', letterSpacing: -0.5, marginTop: 7 },
  bannerDetail: { color: '#C4D5CE', fontSize: 11, lineHeight: 16, marginTop: 7 },
  bannerAction: { alignSelf: 'flex-start', height: 36, borderRadius: 12, paddingHorizontal: 13, backgroundColor: colors.lime, flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 13 },
  bannerActionText: { color: colors.forest, fontSize: 11, fontWeight: '900' },
  quickRow: { flexDirection: 'row', gap: 9, marginTop: 14 },
  quick: { flex: 1, minHeight: 85, borderRadius: 19, padding: 12, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line },
  quickIcon: { width: 35, height: 35, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  quickLabel: { color: colors.ink, fontSize: 11, fontWeight: '800' },
  section: { marginTop: 26 },
  noticeList: { gap: 10, marginTop: 10 },
  noticeCard: { backgroundColor: colors.white, borderRadius: 18, borderWidth: 1, borderColor: colors.line, padding: 14 },
  noticeEyebrow: { color: colors.green, fontSize: 8, fontWeight: '900', letterSpacing: 1.3 },
  noticeTitle: { color: colors.ink, fontSize: 12, fontWeight: '900', marginTop: 5 },
  noticeBody: { color: colors.muted, fontSize: 10, lineHeight: 16, marginTop: 5 },
  eventRow: { gap: 10, paddingRight: 10 },
  eventCard: { width: 170, borderRadius: 18, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, padding: 14 },
  eventDate: { color: colors.green, fontSize: 9, fontWeight: '900', letterSpacing: 1.2 },
  eventTitle: { color: colors.ink, fontSize: 12, fontWeight: '900', marginTop: 8 },
  eventMeta: { color: colors.muted, fontSize: 9, marginTop: 5 },
  storyRow: { gap: 13, paddingRight: 12 },
  story: { width: 68, alignItems: 'center' },
  storyRing: { borderWidth: 2, borderColor: colors.lime, padding: 3, borderRadius: 34 },
  addStory: { width: 64, height: 64, borderRadius: 32, borderWidth: 1.5, borderColor: colors.line, borderStyle: 'dashed', backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  storyName: { color: colors.ink, fontSize: 10, fontWeight: '800', marginTop: 7 },
  storyLabel: { color: colors.subtle, fontSize: 8, marginTop: 2, width: 68, textAlign: 'center' },
  feedHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 29, marginBottom: 0 },
  post: { backgroundColor: colors.white, borderRadius: 24, padding: 17, borderWidth: 1, borderColor: colors.line, marginBottom: 13 },
  postHeader: { flexDirection: 'row', alignItems: 'center' },
  postIdentity: { flex: 1, marginLeft: 11 },
  postAuthor: { color: colors.ink, fontSize: 14, fontWeight: '900' },
  postRole: { color: colors.muted, fontSize: 10, marginTop: 2 },
  postTime: { color: colors.subtle, fontSize: 9, marginTop: 3 },
  postBody: { color: colors.ink, fontSize: 13, lineHeight: 20, marginTop: 15 },
  videoPreview: { height: 190, borderRadius: 18, overflow: 'hidden', marginTop: 14, backgroundColor: colors.forest, alignItems: 'center', justifyContent: 'center' },
  videoThumbnail: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' }, videoPlay: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.lime, alignItems: 'center', justifyContent: 'center' }, videoLabel: { position: 'absolute', left: 12, bottom: 10, color: colors.white, fontSize: 9, fontWeight: '900' },
  postTag: { color: colors.green, fontSize: 11, fontWeight: '800', marginTop: 8 },
  postStats: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.line },
  postStat: { color: colors.muted, fontSize: 10 },
  reactionBubble: { fontSize: 12 },
  postActions: { flexDirection: 'row', justifyContent: 'space-around', paddingTop: 12 },
  postAction: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  postActionText: { color: colors.muted, fontSize: 10, fontWeight: '700' },
  modalPage: { flex: 1, backgroundColor: colors.cream },
  modalHeader: { height: 62, paddingHorizontal: 19, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: colors.line },
  modalCancel: { color: colors.muted, fontSize: 14 },
  modalTitle: { color: colors.ink, fontSize: 16, fontWeight: '900' },
  modalPublish: { color: colors.green, fontSize: 13, fontWeight: '900' },
  composerIdentity: { flexDirection: 'row', alignItems: 'center', gap: 11, padding: 20 },
  composerInput: { minHeight: 190, paddingHorizontal: 20, color: colors.ink, fontSize: 18, lineHeight: 27, textAlignVertical: 'top' },
  videoAttachment: { flexDirection: 'row', gap: 10, alignItems: 'center', marginHorizontal: 20, padding: 10, borderRadius: 15, backgroundColor: colors.mint }, attachmentThumbnail: { width: 58, height: 48, borderRadius: 10 }, documentPreview: { width: 58, height: 48, borderRadius: 10, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' }, attachmentTitle: { color: colors.forest, fontSize: 11, fontWeight: '900' }, attachmentDetail: { color: colors.green, fontSize: 9, marginTop: 3 }, mediaError: { color: colors.coral, fontSize: 10, lineHeight: 15, marginHorizontal: 20, marginTop: 10 },
  composerTools: { flexDirection: 'row', gap: 10, padding: 20, borderTopWidth: 1, borderTopColor: colors.line, alignItems: 'center' },
  toolButton: { width: 40, height: 40, borderRadius: 13, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  attachmentRow: { paddingHorizontal: 20, marginBottom: 10, gap: 8 },
  attachmentCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, borderRadius: 12, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 12, paddingVertical: 9 },
  attachmentName: { color: colors.ink, fontSize: 10, fontWeight: '700', flex: 1 },
  characterCount: { color: colors.subtle, fontSize: 10 },
  notificationList: { padding: 20 },
  notificationEyebrow: { color: colors.green, fontSize: 10, fontWeight: '900', letterSpacing: 1.5, marginBottom: 9 },
  notification: { flexDirection: 'row', gap: 12, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: colors.line, alignItems: 'center' },
  notificationIcon: { width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  notificationTitle: { color: colors.ink, fontSize: 12, fontWeight: '900' },
  notificationDetail: { color: colors.muted, fontSize: 10, marginTop: 3, lineHeight: 15 },
  notificationTime: { color: colors.subtle, fontSize: 9 },
});
