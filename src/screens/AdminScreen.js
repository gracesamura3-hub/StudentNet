import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { addDoc, collection, deleteDoc, doc, getDocs, serverTimestamp, updateDoc } from 'firebase/firestore';
import { EmptyState } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase/config';
import { colors } from '../theme';

function labelForRole(role) {
  return role === 'business' ? 'Business' : role === 'alumni' ? 'Alumni' : role === 'admin' ? 'Admin' : 'Member';
}

const defaultEvent = { title: '', date: '', location: '', description: '' };
const defaultAnnouncement = { audience: 'all', title: '', body: '' };

export default function AdminScreen() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [userRequests, setUserRequests] = useState([]);
  const [opportunityRequests, setOpportunityRequests] = useState([]);
  const [moderationQueue, setModerationQueue] = useState([]);
  const [events, setEvents] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [eventForm, setEventForm] = useState(defaultEvent);
  const [announcementForm, setAnnouncementForm] = useState(defaultAnnouncement);
  const [editingEventId, setEditingEventId] = useState(null);
  const [editingAnnouncementId, setEditingAnnouncementId] = useState(null);
  const [loading, setLoading] = useState(true);

  const analytics = useMemo(() => {
    const roleCounts = { student: 0, alumni: 0, business: 0, admin: 0 };
    users.forEach(item => {
      if (roleCounts[item.role] !== undefined) roleCounts[item.role] += 1;
    });

    const totalUsers = users.length;
    const pendingUsers = users.filter(item => ['business', 'alumni'].includes(item.role) && item.status === 'pending').length;
    const liveOpportunities = opportunityRequests.filter(item => item.status === 'approved').length;

    return {
      labels: ['Students', 'Alumni', 'Business', 'Admin'],
      values: [roleCounts.student, roleCounts.alumni, roleCounts.business, roleCounts.admin],
      metrics: [
        { label: 'Active users', value: totalUsers },
        { label: 'Pending approvals', value: pendingUsers },
        { label: 'Flagged content', value: moderationQueue.length },
        { label: 'Live events', value: events.length },
        { label: 'Live opportunities', value: liveOpportunities },
      ],
    };
  }, [events.length, moderationQueue.length, opportunityRequests, users]);

  useEffect(() => {
    if (!db || !user || user.role !== 'admin') return undefined;

    let active = true;

    async function loadAdminData() {
      try {
        const [usersSnap, postsSnap, opportunitiesSnap, eventsSnap, announcementsSnap] = await Promise.all([
          getDocs(collection(db, 'users')),
          getDocs(collection(db, 'posts')),
          getDocs(collection(db, 'opportunities')),
          getDocs(collection(db, 'events')),
          getDocs(collection(db, 'announcements')),
        ]);

        if (!active) return;

        const allUsers = usersSnap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
        const allOpportunities = opportunitiesSnap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
        const moderation = postsSnap.docs
          .map(docSnap => ({ id: docSnap.id, ...docSnap.data() }))
          .filter(item => item.status === 'flagged' || item.flagged === true || item.status === 'review');

        setUsers(allUsers);
        setUserRequests(allUsers.filter(item => ['business', 'alumni'].includes(item.role) && item.status === 'pending'));
        setOpportunityRequests(allOpportunities.filter(item => item.status === 'pending' || item.status === 'approved'));
        setModerationQueue(moderation);
        setEvents(eventsSnap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }))); 
        setAnnouncements(announcementsSnap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() })));
      } finally {
        if (active) setLoading(false);
      }
    }

    loadAdminData();
    return () => { active = false; };
  }, [user]);

  const handleDecision = async (profileId, nextStatus) => {
    if (!db || !profileId) return;
    await updateDoc(doc(db, 'users', profileId), {
      status: nextStatus,
      updatedAt: serverTimestamp(),
    });
  };

  const handleOpportunityDecision = async (opportunityId, nextStatus) => {
    if (!db || !opportunityId) return;
    await updateDoc(doc(db, 'opportunities', opportunityId), {
      status: nextStatus,
      updatedAt: serverTimestamp(),
    });
  };

  const handleModerationAction = async (postId, nextStatus) => {
    if (!db || !postId) return;

    if (nextStatus === 'removed') {
      await deleteDoc(doc(db, 'posts', postId));
      return;
    }

    await updateDoc(doc(db, 'posts', postId), {
      status: nextStatus,
      flagged: false,
      reviewedBy: user.id,
      updatedAt: serverTimestamp(),
    });
  };

  const refreshEventData = async () => {
    const eventsSnap = await getDocs(collection(db, 'events'));
    setEvents(eventsSnap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() })));
  };

  const refreshAnnouncementData = async () => {
    const announcementsSnap = await getDocs(collection(db, 'announcements'));
    setAnnouncements(announcementsSnap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() })));
  };

  const createEvent = async () => {
    if (!eventForm.title.trim() || !eventForm.description.trim()) return;
    if (editingEventId) {
      await updateDoc(doc(db, 'events', editingEventId), {
        title: eventForm.title.trim(),
        date: eventForm.date.trim() || 'TBC',
        location: eventForm.location.trim() || 'Richfield Campus',
        description: eventForm.description.trim(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await addDoc(collection(db, 'events'), {
        title: eventForm.title.trim(),
        date: eventForm.date.trim() || 'TBC',
        location: eventForm.location.trim() || 'Richfield Campus',
        description: eventForm.description.trim(),
        status: 'published',
        createdBy: user.id,
        createdAt: serverTimestamp(),
      });
    }
    setEventForm(defaultEvent);
    setEditingEventId(null);
    setLoading(true);
    await refreshEventData();
    setLoading(false);
  };

  const publishAnnouncement = async () => {
    if (!announcementForm.title.trim() || !announcementForm.body.trim()) return;
    if (editingAnnouncementId) {
      await updateDoc(doc(db, 'announcements', editingAnnouncementId), {
        title: announcementForm.title.trim(),
        body: announcementForm.body.trim(),
        audience: announcementForm.audience,
        updatedAt: serverTimestamp(),
      });
    } else {
      await addDoc(collection(db, 'announcements'), {
        title: announcementForm.title.trim(),
        body: announcementForm.body.trim(),
        audience: announcementForm.audience,
        createdBy: user.id,
        createdAt: serverTimestamp(),
        status: 'published',
      });
    }
    setAnnouncementForm(defaultAnnouncement);
    setEditingAnnouncementId(null);
    setLoading(true);
    await refreshAnnouncementData();
    setLoading(false);
  };

  const totalUsers = users.length;
  const maxBar = Math.max(...analytics.values, 1);

  if (!user || user.role !== 'admin') return null;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>ADMIN PANEL</Text>
            <Text style={styles.title}>Platform operations</Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.loading}><ActivityIndicator color={colors.green} size="small" /></View>
        ) : (
          <View style={styles.stack}>
            <View style={styles.summaryRow}>
              {analytics.metrics.map(metric => (
                <View key={metric.label} style={styles.metricCard}>
                  <Text style={styles.metricValue}>{metric.value}</Text>
                  <Text style={styles.metricLabel}>{metric.label}</Text>
                </View>
              ))}
            </View>

            <View style={styles.panel}>
              <Text style={styles.panelTitle}>Platform analytics</Text>
              <View style={styles.chartWrap}>
                {analytics.labels.map((label, index) => (
                  <View key={label} style={styles.barGroup}>
                    <Text style={styles.barValue}>{analytics.values[index]}</Text>
                    <View style={styles.barTrack}>
                      <View style={[styles.barFill, { height: `${Math.max(12, (analytics.values[index] / maxBar) * 100)}%` }]} />
                    </View>
                    <Text style={styles.barLabel}>{label}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.panel}>
              <Text style={styles.panelTitle}>User management</Text>
              {users.length ? users.slice(0, 5).map(profile => (
                <View key={profile.id} style={styles.rowCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle}>{profile.name || `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || 'User'}</Text>
                    <Text style={styles.rowMeta}>{labelForRole(profile.role)} · {profile.status || 'active'} · {profile.email}</Text>
                  </View>
                  <View style={styles.inlineActions}>
                    <Pressable onPress={() => handleDecision(profile.id, 'active')} style={styles.smallAction}><Text style={styles.smallActionText}>Approve</Text></Pressable>
                    <Pressable onPress={() => handleDecision(profile.id, 'suspended')} style={styles.smallActionSecondary}><Text style={styles.smallActionSecondaryText}>Suspend</Text></Pressable>
                    <Pressable onPress={() => handleDecision(profile.id, 'removed')} style={styles.smallActionDanger}><Text style={styles.smallActionDangerText}>Remove</Text></Pressable>
                  </View>
                </View>
              )) : <EmptyState icon="people-outline" title="No users found" detail="New member registrations will appear here." />}
            </View>

            <View style={styles.panel}>
              <Text style={styles.panelTitle}>Review queue</Text>
              {userRequests.length > 0 || opportunityRequests.filter(item => item.status === 'pending').length > 0 ? (
                <>
                  {userRequests.map(profile => (
                    <View key={`user-${profile.id}`} style={styles.rowCard}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.rowTitle}>{profile.name || `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || 'Pending member'}</Text>
                        <Text style={styles.rowMeta}>{labelForRole(profile.role)} · {profile.verificationReference || 'Unverified'}</Text>
                      </View>
                      <View style={styles.inlineActions}>
                        <Pressable onPress={() => handleDecision(profile.id, 'active')} style={styles.smallAction}><Text style={styles.smallActionText}>Approve</Text></Pressable>
                        <Pressable onPress={() => handleDecision(profile.id, 'rejected')} style={styles.smallActionSecondary}><Text style={styles.smallActionSecondaryText}>Reject</Text></Pressable>
                      </View>
                    </View>
                  ))}
                  {opportunityRequests.filter(item => item.status === 'pending').map(opportunity => (
                    <View key={`opp-${opportunity.id}`} style={styles.rowCard}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.rowTitle}>{opportunity.title || 'Opportunity pending approval'}</Text>
                        <Text style={styles.rowMeta}>{opportunity.company || 'Unspecified company'} · {opportunity.type || 'Role'}</Text>
                      </View>
                      <View style={styles.inlineActions}>
                        <Pressable onPress={() => handleOpportunityDecision(opportunity.id, 'approved')} style={styles.smallAction}><Text style={styles.smallActionText}>Approve</Text></Pressable>
                        <Pressable onPress={() => handleOpportunityDecision(opportunity.id, 'rejected')} style={styles.smallActionSecondary}><Text style={styles.smallActionSecondaryText}>Reject</Text></Pressable>
                      </View>
                    </View>
                  ))}
                </>
              ) : <EmptyState icon="shield-checkmark-outline" title="No pending approvals" detail="New member and opportunity approvals will appear here." />}
            </View>

            <View style={styles.panel}>
              <Text style={styles.panelTitle}>Content moderation</Text>
              {moderationQueue.length ? moderationQueue.map(item => (
                <View key={`moderation-${item.id}`} style={styles.rowCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle}>{item.author || 'Flagged content'}</Text>
                    <Text style={styles.rowMeta}>{item.body || item.title || 'Content requires review'}</Text>
                  </View>
                  <View style={styles.inlineActions}>
                    <Pressable onPress={() => handleModerationAction(item.id, 'reviewed')} style={styles.smallAction}><Text style={styles.smallActionText}>Keep</Text></Pressable>
                    <Pressable onPress={() => handleModerationAction(item.id, 'removed')} style={styles.smallActionDanger}><Text style={styles.smallActionDangerText}>Remove</Text></Pressable>
                  </View>
                </View>
              )) : <EmptyState icon="flag-outline" title="No flagged content" detail="Moderation cases will appear here." />}
            </View>

            <View style={styles.panel}>
              <Text style={styles.panelTitle}>Create official event</Text>
              <TextInput value={eventForm.title} onChangeText={value => setEventForm(current => ({ ...current, title: value }))} placeholder="Event title" style={styles.input} />
              <TextInput value={eventForm.date} onChangeText={value => setEventForm(current => ({ ...current, date: value }))} placeholder="Date and time" style={styles.input} />
              <TextInput value={eventForm.location} onChangeText={value => setEventForm(current => ({ ...current, location: value }))} placeholder="Location" style={styles.input} />
              <TextInput value={eventForm.description} onChangeText={value => setEventForm(current => ({ ...current, description: value }))} placeholder="Description" multiline numberOfLines={3} style={[styles.input, styles.textArea]} />
              <Pressable onPress={createEvent} style={styles.primaryButton}><Text style={styles.primaryButtonText}>Publish event</Text></Pressable>
            </View>

            <View style={styles.panel}>
              <Text style={styles.panelTitle}>Broadcast announcement</Text>
              <TextInput value={announcementForm.title} onChangeText={value => setAnnouncementForm(current => ({ ...current, title: value }))} placeholder="Announcement title" style={styles.input} />
              <TextInput value={announcementForm.body} onChangeText={value => setAnnouncementForm(current => ({ ...current, body: value }))} placeholder="Message" multiline numberOfLines={4} style={[styles.input, styles.textArea]} />
              <View style={styles.audienceRow}>
                {['all', 'students', 'alumni', 'business'].map(option => (
                  <Pressable key={option} onPress={() => setAnnouncementForm(current => ({ ...current, audience: option }))} style={[styles.audiencePill, announcementForm.audience === option && styles.audiencePillActive]}>
                    <Text style={[styles.audienceText, announcementForm.audience === option && styles.audienceTextActive]}>{option}</Text>
                  </Pressable>
                ))}
              </View>
              <Pressable onPress={publishAnnouncement} style={styles.primaryButton}><Text style={styles.primaryButtonText}>Send announcement</Text></Pressable>
            </View>

            <View style={styles.panel}>
              <Text style={styles.panelTitle}>Published events</Text>
              {events.length ? events.map(event => (
                <View key={event.id} style={styles.rowCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle}>{event.title}</Text>
                    <Text style={styles.rowMeta}>{event.date} · {event.location}</Text>
                  </View>
                </View>
              )) : <EmptyState icon="calendar-outline" title="No events yet" detail="Official Richfield events will appear here." />}
            </View>

            <View style={styles.panel}>
              <Text style={styles.panelTitle}>Announcements</Text>
              {announcements.length ? announcements.map(item => (
                <View key={item.id} style={styles.rowCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle}>{item.title}</Text>
                    <Text style={styles.rowMeta}>{item.audience} · {item.body}</Text>
                  </View>
                </View>
              )) : <EmptyState icon="megaphone-outline" title="No announcements" detail="Platform-wide notices will appear here." />}
            </View>

            <Text style={styles.footerMeta}>Total users in database: {totalUsers}</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  content: { padding: 18, paddingBottom: 140 },
  header: { marginBottom: 16 },
  eyebrow: { color: colors.green, fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
  title: { color: colors.ink, fontSize: 28, fontWeight: '900', letterSpacing: -0.8, marginTop: 5 },
  loading: { paddingTop: 30, alignItems: 'center' },
  stack: { gap: 18 },
  summaryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metricCard: { width: '46%', backgroundColor: colors.white, borderRadius: 18, borderWidth: 1, borderColor: colors.line, padding: 14 },
  metricValue: { color: colors.ink, fontSize: 22, fontWeight: '900' },
  metricLabel: { color: colors.muted, fontSize: 9, marginTop: 4 },
  panel: { backgroundColor: colors.white, borderRadius: 24, borderWidth: 1, borderColor: colors.line, padding: 18 },
  panelTitle: { color: colors.ink, fontSize: 16, fontWeight: '900', marginBottom: 12 },
  chartWrap: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 180, paddingTop: 10 },
  barGroup: { flex: 1, alignItems: 'center', gap: 8 },
  barValue: { color: colors.muted, fontSize: 8, fontWeight: '800' },
  barTrack: { width: 18, height: 110, borderRadius: 10, backgroundColor: colors.cream, justifyContent: 'flex-end', overflow: 'hidden' },
  barFill: { width: '100%', backgroundColor: colors.green, borderRadius: 10 },
  barLabel: { color: colors.subtle, fontSize: 8, textAlign: 'center' },
  rowCard: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.line },
  rowTitle: { color: colors.ink, fontSize: 12, fontWeight: '900' },
  rowMeta: { color: colors.muted, fontSize: 9, marginTop: 4, lineHeight: 15 },
  inlineActions: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' },
  smallAction: { backgroundColor: colors.forest, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 7 },
  smallActionText: { color: colors.white, fontSize: 9, fontWeight: '900' },
  smallActionSecondary: { backgroundColor: colors.cream, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 7 },
  smallActionSecondaryText: { color: colors.ink, fontSize: 9, fontWeight: '900' },
  smallActionDanger: { backgroundColor: colors.coralPale, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 7 },
  smallActionDangerText: { color: colors.coral, fontSize: 9, fontWeight: '900' },
  input: { borderWidth: 1, borderColor: colors.line, backgroundColor: colors.cream, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 12, color: colors.ink, marginBottom: 10, fontSize: 12 },
  textArea: { minHeight: 86, textAlignVertical: 'top' },
  primaryButton: { backgroundColor: colors.forest, borderRadius: 14, paddingVertical: 12, alignItems: 'center', justifyContent: 'center' },
  primaryButtonText: { color: colors.white, fontSize: 12, fontWeight: '900' },
  audienceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  audiencePill: { borderRadius: 999, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 10, paddingVertical: 8 },
  audiencePillActive: { backgroundColor: colors.green, borderColor: colors.green },
  audienceText: { color: colors.muted, fontSize: 9, fontWeight: '800', textTransform: 'uppercase' },
  audienceTextActive: { color: colors.white },
  footerMeta: { color: colors.muted, fontSize: 10, textAlign: 'center', paddingTop: 6 },
});
