import React, { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar, IconButton, PrimaryButton, SectionHeader } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { buildAssistantReply, buildContextualNiaTip } from '../utils/profileAi';
import { colors } from '../theme';

const portfolio = [
  { id: '1', icon: 'phone-portrait-outline', title: 'Campus Connect', detail: 'React Native · Firebase', tone: colors.bluePale },
  { id: '2', icon: 'globe-outline', title: 'LocalBiz Directory', detail: 'JavaScript · Web app', tone: colors.mint },
];

const experience = [
  { id: '1', title: 'Frontend Developer Intern', organisation: 'Moyo Digital Studio', dates: 'Jun – Aug 2025', icon: 'briefcase-outline' },
  { id: '2', title: 'Student Ambassador', organisation: 'Richfield', dates: '2024 – present', icon: 'ribbon-outline' },
];

export default function ProfileScreen() {
  const { user, isDemo, changeDemoRole, signOut } = useAuth();
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [rolesOpen, setRolesOpen] = useState(false);
  const [visibility, setVisibility] = useState('Connections');
  const niaTip = useMemo(() => buildContextualNiaTip(user || {}), [user]);

  if (!user || !user.id) {
    return <SafeAreaView style={styles.safe} edges={['top']}><View style={styles.content}><Text style={styles.name}>Loading profile…</Text></View></SafeAreaView>;
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topActions}><IconButton name="eye-outline" onPress={() => setVisibility(visibility === 'Connections' ? 'Public' : 'Connections')} /><View style={{ flex: 1 }} /><IconButton name="share-social-outline" /><IconButton name="settings-outline" /></View>
        <LinearGradient colors={['#0D3B2E', '#1E654A']} style={styles.cover}><View style={styles.coverOrb} /><Text style={styles.coverMonogram}>SN</Text></LinearGradient>
        <View style={styles.profileCard}>
          <View style={styles.avatarWrap}><Avatar initials={user.initials} size={82} color={colors.mint} /><View style={styles.verified}><Ionicons name="checkmark" size={12} color={colors.white} /></View></View>
          <Pressable style={styles.editButton}><Ionicons name="create-outline" size={15} color={colors.green} /><Text style={styles.editText}>Edit profile</Text></Pressable>
          <Text style={styles.name}>{user.name}</Text><Text style={styles.headline}>{user.headline}</Text>
          <Text style={styles.meta}><Ionicons name="location-outline" size={12} /> {user.campus ? `${user.campus}  ·  ` : ''}{user.year || ''}</Text>
          <View style={styles.connections}><Text style={styles.connectionValue}>{user.role === 'business' ? '3.8k' : '126'}</Text><Text style={styles.connectionLabel}>{user.role === 'business' ? ' followers' : ' connections'}</Text><View style={styles.dot} /><Text style={styles.connectionValue}>{user.role === 'business' ? '148' : '284'}</Text><Text style={styles.connectionLabel}>{user.role === 'business' ? ' applicants' : ' profile views'}</Text></View>
          <View style={styles.profileActions}><PrimaryButton compact icon="person-add-outline">Connect</PrimaryButton><Pressable style={styles.messageButton}><Ionicons name="chatbubble-outline" size={17} color={colors.green} /><Text style={styles.messageText}>Message</Text></Pressable><IconButton name="ellipsis-horizontal" size={40} /></View>
        </View>

        <Pressable onPress={() => setAssistantOpen(true)} style={styles.coachCard}>
          <View style={styles.coachIcon}><Ionicons name="sparkles" size={22} color={colors.forest} /></View>
          <View style={{ flex: 1 }}><Text style={styles.coachEyebrow}>AI PROFILE COACH</Text><Text style={styles.coachTitle}>Your profile is {user.completion}% complete</Text><Text style={styles.coachCopy}>{niaTip}</Text></View>
          <View style={styles.progressCircle}><Text style={styles.progressText}>{user.completion}%</Text></View>
        </Pressable>

        <View style={styles.visibilityRow}><Ionicons name={visibility === 'Public' ? 'globe-outline' : 'people-outline'} size={16} color={colors.green} /><Text style={styles.visibilityText}>Viewing as: <Text style={styles.visibilityStrong}>{visibility}</Text></Text><Pressable onPress={() => setVisibility(visibility === 'Connections' ? 'Public' : 'Connections')}><Text style={styles.visibilityAction}>Change</Text></Pressable></View>

        <ProfileSection title="About" action="Edit">
          <Text style={styles.about}>I’m a curious product-minded developer who enjoys turning human problems into thoughtful mobile experiences. I’m especially interested in fintech, accessibility and tools that open doors for young people.</Text>
          <View style={styles.infoLine}><Ionicons name="school-outline" size={18} color={colors.green} /><View><Text style={styles.infoTitle}>{user.programme}</Text><Text style={styles.infoDetail}>Richfield · Expected graduation 2026</Text></View></View>
          <View style={styles.linkRow}><Ionicons name="logo-github" size={17} color={colors.ink} /><Text style={styles.linkText}>github.com/thandomokoena</Text><Ionicons name="open-outline" size={14} color={colors.green} /></View>
          <View style={styles.linkRow}><Ionicons name="logo-linkedin" size={17} color={colors.blue} /><Text style={styles.linkText}>linkedin.com/in/thando-mokoena</Text><Ionicons name="open-outline" size={14} color={colors.green} /></View>
        </ProfileSection>

        <ProfileSection title="Skills & endorsements" action="Add skill">
          <View style={styles.skills}>{(user.skills || []).map((skill, index) => <View key={skill} style={styles.skill}><Text style={styles.skillName}>{skill}</Text><View style={styles.endorsements}><Ionicons name="people" size={11} color={colors.green} /><Text style={styles.endorsementText}>{14 - index * 2}</Text></View></View>)}</View>
        </ProfileSection>

        <ProfileSection title="Featured projects" action="See all">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.projectRow}>{portfolio.map(project => <Pressable key={project.id} style={styles.project}><View style={[styles.projectIcon, { backgroundColor: project.tone }]}><Ionicons name={project.icon} size={23} color={colors.green} /></View><Text style={styles.projectTitle}>{project.title}</Text><Text style={styles.projectDetail}>{project.detail}</Text><View style={styles.projectLink}><Text style={styles.projectLinkText}>View project</Text><Ionicons name="arrow-forward" size={13} color={colors.green} /></View></Pressable>)}</ScrollView>
        </ProfileSection>

        <ProfileSection title="Experience" action="Add">
          {experience.map((item, index) => <View key={item.id} style={styles.experience}><View style={styles.experienceIcon}><Ionicons name={item.icon} size={19} color={colors.green} /></View><View style={{ flex: 1 }}><Text style={styles.experienceTitle}>{item.title}</Text><Text style={styles.experienceOrg}>{item.organisation}</Text><Text style={styles.experienceDates}>{item.dates}</Text></View>{index === 0 ? <Ionicons name="create-outline" size={16} color={colors.subtle} /> : null}</View>)}
        </ProfileSection>

        <ProfileSection title="Achievements" action="Add">
          <View style={styles.achievement}><View style={styles.achievementIcon}><Ionicons name="trophy" size={21} color="#9C6A00" /></View><View style={{ flex: 1 }}><Text style={styles.experienceTitle}>Richfield Innovation Challenge</Text><Text style={styles.experienceOrg}>Finalist · 2025</Text></View></View>
          <View style={styles.achievement}><View style={[styles.achievementIcon, { backgroundColor: colors.bluePale }]}><Ionicons name="ribbon" size={21} color={colors.blue} /></View><View style={{ flex: 1 }}><Text style={styles.experienceTitle}>Google Cloud Skills Boost</Text><Text style={styles.experienceOrg}>4 digital badges · View on Credly</Text></View></View>
        </ProfileSection>

        {isDemo ? <View style={styles.demoPanel}><Text style={styles.demoTitle}>Role preview</Text><Text style={styles.demoCopy}>Switch persona to inspect role-based content and analytics.</Text><Pressable onPress={() => setRolesOpen(true)} style={styles.roleSwitcher}><Text style={styles.roleSwitcherText}>{user.role[0].toUpperCase() + user.role.slice(1)} experience</Text><Ionicons name="chevron-down" size={16} color={colors.green} /></Pressable></View> : null}
        <Pressable onPress={signOut} style={styles.signOut}><Ionicons name="log-out-outline" size={18} color={colors.coral} /><Text style={styles.signOutText}>{isDemo ? 'Exit interactive preview' : 'Sign out'}</Text></Pressable>
      </ScrollView>
      <AssistantModal visible={assistantOpen} onClose={() => setAssistantOpen(false)} user={user} />
      <RoleModal visible={rolesOpen} onClose={() => setRolesOpen(false)} onSelect={role => { changeDemoRole(role); setRolesOpen(false); }} current={user.role} />
    </SafeAreaView>
  );
}

function ProfileSection({ title, action, children }) {
  return <View style={styles.section}><SectionHeader title={title} action={action} /><View style={styles.sectionCard}>{children}</View></View>;
}

function AssistantModal({ visible, onClose, user }) {
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState([{ id: 'welcome', mine: false, text: `Hi ${user.firstName}! I reviewed your profile. Your skills are strong; let’s make your project impact clearer. What would you like to improve?` }]);
  const assistantUrl = process.env.EXPO_PUBLIC_PROFILE_ASSISTANT_URL;
  async function ask(prompt = draft) {
    if (!prompt.trim()) return;
    const text = prompt.trim();
    setMessages(current => [...current, { id: `${Date.now()}-user`, mine: true, text }]);
    setDraft(''); setBusy(true);
    try {
      let answer;
      if (assistantUrl) {
        const response = await fetch(assistantUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: text, profile: user }) });
        if (!response.ok) throw new Error('Assistant request failed');
        answer = (await response.json()).answer;
      } else {
        answer = buildAssistantReply(text, user);
      }
      setMessages(current => [...current, { id: `${Date.now()}-assistant`, mine: false, text: answer }]);
    } catch {
      setMessages(current => [...current, { id: `${Date.now()}-error`, mine: false, text: 'I could not reach the profile assistant just now. Your message is safe — please try again shortly.' }]);
    } finally { setBusy(false); }
  }
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.assistantPage}>
        <LinearGradient colors={['#0D3B2E', '#1D6148']} style={styles.assistantHeader}><View style={styles.assistantSpark}><Ionicons name="sparkles" size={21} color={colors.forest} /></View><View style={{ flex: 1 }}><Text style={styles.assistantTitle}>Nia · Profile coach</Text><Text style={styles.assistantStatus}>AI assistant · Online</Text></View><IconButton dark name="close" onPress={onClose} /></LinearGradient>
        <ScrollView contentContainerStyle={styles.assistantMessages}>
          <Text style={styles.assistantIntro}>Ask Nia for specific, employer-focused guidance at any time.</Text>
          {messages.map(message => <View key={message.id} style={[styles.assistantBubble, message.mine && styles.assistantBubbleMine]}><Text style={[styles.assistantBubbleText, message.mine && styles.assistantBubbleTextMine]}>{message.text}</Text></View>)}
          {busy ? <View style={styles.thinking}><View style={styles.thinkingDot} /><View style={styles.thinkingDot} /><View style={styles.thinkingDot} /></View> : null}
          <Text style={styles.tryLabel}>TRY ASKING</Text>
          <View style={styles.promptList}>{['Strengthen my headline', 'What skills am I missing?', 'Help describe a project'].map(prompt => <Pressable key={prompt} onPress={() => ask(prompt)} style={styles.prompt}><Ionicons name="sparkles-outline" size={14} color={colors.green} /><Text style={styles.promptText}>{prompt}</Text></Pressable>)}</View>
        </ScrollView>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}><View style={styles.assistantComposer}><TextInput value={draft} onChangeText={setDraft} onSubmitEditing={() => ask()} placeholder="Ask about your profile…" placeholderTextColor={colors.subtle} style={styles.assistantInput} /><Pressable onPress={() => ask()} style={styles.assistantSend}><Ionicons name="arrow-up" size={18} color={colors.white} /></Pressable></View></KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

function RoleModal({ visible, onClose, onSelect, current }) {
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}><Pressable style={styles.overlay} onPress={onClose}><View style={styles.roleSheet}><Text style={styles.roleSheetTitle}>Preview an experience</Text>{['student', 'alumni', 'business', 'admin'].map(role => <Pressable key={role} onPress={() => onSelect(role)} style={styles.roleOption}><View style={[styles.roleOptionIcon, role === current && { backgroundColor: colors.lime }]}><Ionicons name={role === 'student' ? 'school-outline' : role === 'alumni' ? 'ribbon-outline' : role === 'business' ? 'business-outline' : 'shield-checkmark-outline'} size={20} color={colors.green} /></View><Text style={styles.roleOptionText}>{role[0].toUpperCase() + role.slice(1)}</Text>{role === current ? <Ionicons name="checkmark-circle" size={21} color={colors.green} /> : null}</Pressable>)}</View></Pressable></Modal>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream }, content: { paddingBottom: 120 },
  topActions: { position: 'absolute', zIndex: 3, top: 13, left: 18, right: 18, flexDirection: 'row', gap: 8 },
  cover: { height: 168, overflow: 'hidden', justifyContent: 'center', alignItems: 'flex-end', paddingRight: 28 },
  coverOrb: { position: 'absolute', width: 210, height: 210, borderRadius: 105, borderWidth: 1, borderColor: 'rgba(201,242,123,0.24)', right: -30, bottom: -120 },
  coverMonogram: { color: 'rgba(255,255,255,0.07)', fontWeight: '900', fontSize: 80 },
  profileCard: { backgroundColor: colors.white, marginHorizontal: 18, marginTop: -35, borderRadius: 25, padding: 17, borderWidth: 1, borderColor: colors.line },
  avatarWrap: { marginTop: -54, alignSelf: 'flex-start', borderWidth: 5, borderColor: colors.white, borderRadius: 48 },
  verified: { position: 'absolute', right: -1, bottom: 2, width: 22, height: 22, borderRadius: 11, backgroundColor: colors.green, borderWidth: 2, borderColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  editButton: { position: 'absolute', right: 16, top: 15, height: 36, borderRadius: 12, borderWidth: 1, borderColor: colors.green, paddingHorizontal: 11, flexDirection: 'row', gap: 6, alignItems: 'center' },
  editText: { color: colors.green, fontSize: 9, fontWeight: '900' },
  name: { color: colors.ink, fontSize: 23, fontWeight: '900', letterSpacing: -0.7, marginTop: 10 },
  headline: { color: colors.ink, fontSize: 12, fontWeight: '700', marginTop: 4 },
  meta: { color: colors.muted, fontSize: 9, marginTop: 7 },
  connections: { flexDirection: 'row', alignItems: 'center', marginTop: 13 },
  connectionValue: { color: colors.green, fontSize: 10, fontWeight: '900' },
  connectionLabel: { color: colors.muted, fontSize: 9 }, dot: { width: 3, height: 3, borderRadius: 2, backgroundColor: colors.subtle, marginHorizontal: 8 },
  profileActions: { flexDirection: 'row', gap: 8, marginTop: 16 }, messageButton: { flex: 1, borderWidth: 1, borderColor: colors.green, borderRadius: 13, flexDirection: 'row', gap: 7, alignItems: 'center', justifyContent: 'center' }, messageText: { color: colors.green, fontSize: 11, fontWeight: '900' },
  coachCard: { margin: 18, marginBottom: 11, borderRadius: 22, backgroundColor: colors.lime, padding: 15, flexDirection: 'row', gap: 11, alignItems: 'center' },
  coachIcon: { width: 44, height: 44, borderRadius: 15, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  coachEyebrow: { color: colors.green, fontSize: 7, letterSpacing: 1.2, fontWeight: '900' }, coachTitle: { color: colors.forest, fontSize: 12, fontWeight: '900', marginTop: 3 }, coachCopy: { color: '#4A704E', fontSize: 8, marginTop: 3 },
  progressCircle: { width: 43, height: 43, borderRadius: 22, borderWidth: 5, borderColor: colors.green, alignItems: 'center', justifyContent: 'center' }, progressText: { color: colors.forest, fontSize: 9, fontWeight: '900' },
  visibilityRow: { marginHorizontal: 18, paddingHorizontal: 13, height: 42, borderRadius: 14, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, flexDirection: 'row', alignItems: 'center', gap: 8 },
  visibilityText: { color: colors.muted, fontSize: 9, flex: 1 }, visibilityStrong: { color: colors.ink, fontWeight: '800' }, visibilityAction: { color: colors.green, fontSize: 9, fontWeight: '900' },
  section: { marginHorizontal: 18, marginTop: 27 }, sectionCard: { borderRadius: 22, padding: 16, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line },
  about: { color: colors.muted, fontSize: 11, lineHeight: 18 }, infoLine: { flexDirection: 'row', gap: 11, marginTop: 17, paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.line }, infoTitle: { color: colors.ink, fontSize: 11, fontWeight: '800' }, infoDetail: { color: colors.muted, fontSize: 8, marginTop: 3 },
  linkRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 13 }, linkText: { color: colors.green, fontSize: 9, fontWeight: '700', flex: 1 },
  skills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, skill: { flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: colors.mint, borderRadius: 13, paddingHorizontal: 11, paddingVertical: 9 }, skillName: { color: colors.forest, fontSize: 10, fontWeight: '800' }, endorsements: { flexDirection: 'row', gap: 3 }, endorsementText: { color: colors.green, fontSize: 8, fontWeight: '900' },
  projectRow: { gap: 10, paddingRight: 15 }, project: { width: 190, borderRadius: 18, padding: 14, backgroundColor: colors.cream }, projectIcon: { width: 43, height: 43, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }, projectTitle: { color: colors.ink, fontSize: 12, fontWeight: '900', marginTop: 11 }, projectDetail: { color: colors.muted, fontSize: 8, marginTop: 3 }, projectLink: { flexDirection: 'row', gap: 5, alignItems: 'center', marginTop: 12 }, projectLinkText: { color: colors.green, fontSize: 9, fontWeight: '900' },
  experience: { flexDirection: 'row', gap: 11, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: colors.line }, experienceIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.mint, alignItems: 'center', justifyContent: 'center' }, experienceTitle: { color: colors.ink, fontSize: 11, fontWeight: '900' }, experienceOrg: { color: colors.muted, fontSize: 9, marginTop: 3 }, experienceDates: { color: colors.subtle, fontSize: 8, marginTop: 4 },
  achievement: { flexDirection: 'row', gap: 11, alignItems: 'center', paddingVertical: 9 }, achievementIcon: { width: 44, height: 44, borderRadius: 15, backgroundColor: colors.goldPale, alignItems: 'center', justifyContent: 'center' },
  demoPanel: { margin: 18, marginTop: 27, padding: 16, backgroundColor: colors.white, borderRadius: 20, borderWidth: 1, borderColor: colors.line }, demoTitle: { color: colors.ink, fontSize: 13, fontWeight: '900' }, demoCopy: { color: colors.muted, fontSize: 9, marginTop: 4 }, roleSwitcher: { marginTop: 12, backgroundColor: colors.cream, height: 42, borderRadius: 13, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, roleSwitcherText: { color: colors.green, fontSize: 10, fontWeight: '900' },
  signOut: { marginHorizontal: 18, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', padding: 16 }, signOutText: { color: colors.coral, fontSize: 11, fontWeight: '800' },
  assistantPage: { flex: 1, backgroundColor: colors.cream }, assistantHeader: { padding: 18, flexDirection: 'row', gap: 11, alignItems: 'center' }, assistantSpark: { width: 43, height: 43, borderRadius: 15, backgroundColor: colors.lime, alignItems: 'center', justifyContent: 'center' }, assistantTitle: { color: colors.white, fontSize: 14, fontWeight: '900' }, assistantStatus: { color: colors.lime, fontSize: 8, marginTop: 3 },
  assistantMessages: { padding: 18, paddingBottom: 30 }, assistantIntro: { color: colors.muted, fontSize: 10, textAlign: 'center', marginBottom: 20 }, assistantBubble: { maxWidth: '84%', alignSelf: 'flex-start', backgroundColor: colors.white, borderRadius: 18, borderBottomLeftRadius: 5, padding: 13, marginBottom: 10, borderWidth: 1, borderColor: colors.line }, assistantBubbleMine: { alignSelf: 'flex-end', backgroundColor: colors.forest, borderBottomLeftRadius: 18, borderBottomRightRadius: 5 }, assistantBubbleText: { color: colors.ink, fontSize: 11, lineHeight: 17 }, assistantBubbleTextMine: { color: colors.white }, thinking: { flexDirection: 'row', gap: 4, backgroundColor: colors.white, borderRadius: 15, padding: 13, alignSelf: 'flex-start' }, thinkingDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.subtle }, tryLabel: { color: colors.green, fontSize: 8, letterSpacing: 1.2, fontWeight: '900', marginTop: 22, marginBottom: 8 }, promptList: { gap: 7 }, prompt: { flexDirection: 'row', gap: 8, alignItems: 'center', borderWidth: 1, borderColor: colors.line, borderRadius: 14, padding: 11, backgroundColor: colors.white }, promptText: { color: colors.ink, fontSize: 10, fontWeight: '700' },
  assistantComposer: { padding: 13, paddingBottom: 22, flexDirection: 'row', gap: 9, backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.line }, assistantInput: { flex: 1, height: 47, borderRadius: 16, backgroundColor: colors.cream, paddingHorizontal: 14, color: colors.ink, fontSize: 11 }, assistantSend: { width: 47, height: 47, borderRadius: 16, backgroundColor: colors.forest, alignItems: 'center', justifyContent: 'center' },
  overlay: { flex: 1, backgroundColor: 'rgba(10,25,19,0.38)', justifyContent: 'flex-end' }, roleSheet: { backgroundColor: colors.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 22, paddingBottom: 35 }, roleSheetTitle: { color: colors.ink, fontSize: 19, fontWeight: '900', marginBottom: 12 }, roleOption: { flexDirection: 'row', gap: 12, height: 57, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.line }, roleOptionIcon: { width: 40, height: 40, borderRadius: 13, backgroundColor: colors.cream, alignItems: 'center', justifyContent: 'center' }, roleOptionText: { color: colors.ink, fontSize: 12, fontWeight: '800', flex: 1 },
});
