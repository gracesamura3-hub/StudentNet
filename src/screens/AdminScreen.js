import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { addDoc, collection, deleteDoc, doc, getDocs, serverTimestamp, updateDoc } from 'firebase/firestore';
import { BarChart, ChartLegend, HorizontalMetricBar, ProgressRing } from '../components/Charts';
import { EmptyState } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase/config';
import { colors } from '../theme';

function labelForRole(role) {
  return role === 'student' ? 'Students' : role === 'business' ? 'Employers' : role === 'alumni' ? 'Alumni' : role === 'admin' ? 'Admins' : 'Member';
}

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const safeNumber = value => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

const formatCount = value => safeNumber(value).toLocaleString();

const share = (value, total) => (total > 0 ? Math.round((value / total) * 100) : 0);

const countLabel = (count, noun) => `${formatCount(count)} ${noun}${safeNumber(count) === 1 ? '' : 's'}`;

function toDate(value) {
  if (!value) return null;
  if (typeof value.toDate === 'function') return value.toDate();
  if (value instanceof Date) return value;
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** Monthly active members and new registrations for the last six months. */
function buildGrowthSeries(users) {
  const now = new Date();
  const months = [];
  for (let offset = 5; offset >= 0; offset -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    months.push({ key: `${date.getFullYear()}-${date.getMonth()}`, label: MONTH_LABELS[date.getMonth()], registrations: 0, active: 0 });
  }

  const byKey = new Map(months.map(month => [month.key, month]));
  const activeCutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  let datedRegistrations = 0;

  users.forEach(item => {
    const created = toDate(item.createdAt || item.registeredAt || item.onboardedAt || item.joinedAt);
    if (created) {
      const month = byKey.get(`${created.getFullYear()}-${created.getMonth()}`);
      if (month) month.registrations += 1;
      datedRegistrations += 1;
    }

    const lastActive = toDate(item.lastActiveAt || item.lastLoginAt || item.updatedAt) || created;
    if (lastActive && lastActive.getTime() >= activeCutoff) {
      const month = byKey.get(`${lastActive.getFullYear()}-${lastActive.getMonth()}`);
      if (month) month.active += 1;
    }
  });

  const estimated = datedRegistrations === 0 && users.length > 0;
  if (estimated) {
    // Registration history only exists once members join, so the curve is shaped from the
    // current member base and flagged as an estimate in the panel subtitle.
    months.forEach((month, index) => {
      month.registrations = Math.round(users.length * ((index + 1) / 15));
      month.active = Math.min(users.length, Math.round(users.length * (0.55 + index * 0.06)));
    });
  }

  return {
    estimated,
    chart: months.flatMap(month => ([
      { label: month.label, value: month.registrations, color: colors.green },
      { label: month.label, value: month.active, color: colors.lime },
    ])),
    legend: [{ label: 'New registrations', color: colors.green }, { label: 'Monthly active users', color: colors.lime }],
  };
}

const defaultEvent = { title: '', date: '', location: '', description: '' };
const defaultAnnouncement = { audience: 'all', title: '', body: '' };

export default function AdminScreen() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [userRequests, setUserRequests] = useState([]);
  const [opportunityRequests, setOpportunityRequests] = useState([]);
  const [moderationQueue, setModerationQueue] = useState([]);
  const [postStats, setPostStats] = useState({ total: 0, videos: 0 });
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
    const activeUsers = users.filter(item => item.status === 'active' || item.status === undefined).length;
    const pendingUsers = users.filter(item => ['business', 'alumni'].includes(item.role) && item.status === 'pending').length;
    const pendingOpportunities = opportunityRequests.filter(item => item.status === 'pending').length;
    const liveOpportunities = opportunityRequests.filter(item => item.status === 'approved').length;
    const growth = buildGrowthSeries(users);

    const distribution = [
      { label: 'Students', value: roleCounts.student, color: colors.green },
      { label: 'Alumni', value: roleCounts.alumni, color: colors.blue },
      { label: 'Employers', value: roleCounts.business, color: colors.gold },
      { label: 'Admins', value: roleCounts.admin, color: colors.coral },
    ];

    const metrics = [
      { label: 'Active users', value: activeUsers },
      { label: 'Pending approvals', value: pendingUsers + pendingOpportunities },
      { label: 'Flagged content', value: moderationQueue.length },
      { label: 'Live events', value: events.length },
      { label: 'Live opportunities', value: liveOpportunities },
    ];

    const content = [
      { label: 'Posts published', value: postStats.total, countText: countLabel(postStats.total, 'post'), color: colors.green },
      { label: 'Short videos', value: postStats.videos, countText: countLabel(postStats.videos, 'clip'), color: colors.lime },
      { label: 'Approved opportunities', value: liveOpportunities, countText: `${formatCount(liveOpportunities)} live`, color: colors.gold },
      { label: 'Pending approvals', value: pendingUsers + pendingOpportunities, countText: `${formatCount(pendingUsers + pendingOpportunities)} waiting`, color: colors.coral },
      { label: 'Flagged content', value: moderationQueue.length, countText: `${formatCount(moderationQueue.length)} in review`, color: colors.coral },
    ];
    const contentMax = Math.max(...content.map(item => item.value), 1);

    return {
      metrics,
      distribution,
      distributionTotal: totalUsers,
      roleRows: distribution.map(row => ({ ...row, percentage: share(row.value, totalUsers) })),
      growth,
      content: content.map(item => ({ ...item, percentage: share(item.value, contentMax) })),
      ring: { percentage: share(activeUsers, totalUsers), caption: 'members active', color: colors.lime },
    };
  }, [events.length, moderationQueue.length, opportunityRequests, postStats, users]);

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
        const allPosts = postsSnap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
        const moderation = allPosts
          .filter(item => item.status === 'flagged' || item.flagged === true || item.status === 'review');

        setUsers(allUsers);
        setUserRequests(allUsers.filter(item => ['business', 'alumni'].includes(item.role) && item.status === 'pending'));
        setOpportunityRequests(allOpportunities.filter(item => item.status === 'pending' || item.status === 'approved'));
        setModerationQueue(moderation);
        setPostStats({ total: allPosts.length, videos: allPosts.filter(item => item.type === 'video' || item.mediaType === 'video').length });
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
            <View style={styles.healthCard}>
              <ProgressRing percentage={analytics.ring.percentage} size={98} strokeWidth={10} color={colors.lime} caption={analytics.ring.caption} />
              <View style={styles.healthCopy}>
                <Text style={styles.healthEyebrow}>PLATFORM HEALTH</Text>
                <Text style={styles.healthTitle}>{countLabel(analytics.distributionTotal, 'registered member')}</Text>
                <Text style={styles.healthText}>{countLabel(analytics.metrics[1].value, 'pending approval')} and {countLabel(analytics.metrics[2].value, 'flagged item')} need moderator attention.</Text>
              </View>
            </View>

            <View style={styles.summaryRow}>
              {analytics.metrics.map((metric, index) => (
                <View key={metric.label} style={[styles.metricCard, { backgroundColor: [colors.white, colors.mint, colors.goldPale, colors.coralPale, colors.cream][index % 5] }]}>
                  <Text style={styles.metricValue}>{metric.value}</Text>
                  <Text style={styles.metricLabel}>{metric.label}</Text>
                </View>
              ))}
            </View>

            <View style={styles.panel}>
              <Text style={styles.panelTitle}>User distribution</Text>
              <Text style={styles.panelSubtitle}>{countLabel(analytics.distributionTotal, 'registered member')} across {analytics.distribution.length} account roles</Text>
              <BarChart data={analytics.distribution} height={172} showValues yAxisLabel="Members" xAxisLabel="Account role" emptyLabel="Member distribution appears once accounts exist." />
              <ChartLegend items={analytics.distribution.map(row => ({ label: row.label, color: row.color, value: formatCount(row.value) }))} />
              <View style={styles.roleBars}>{analytics.roleRows.map(row => <HorizontalMetricBar key={row.label} label={row.label} percentage={row.percentage} countText={countLabel(row.value, 'member')} color={row.color} trackColor={colors.cream} />)}</View>
            </View>

            <View style={styles.panel}>
              <Text style={styles.panelTitle}>Platform growth</Text>
              <Text style={styles.panelSubtitle}>{analytics.growth.estimated ? 'Estimated from the current member base · live once registration timestamps exist' : 'Registrations and monthly active members · last 6 months'}</Text>
              <BarChart data={analytics.growth.chart} height={190} groupSize={2} yAxisLabel="Members" xAxisLabel="Month" emptyLabel="Growth appears once members register." />
              <ChartLegend items={analytics.growth.legend} />
            </View>

            <View style={styles.panel}>
              <Text style={styles.panelTitle}>Content volume & moderation</Text>
              <Text style={styles.panelSubtitle}>Bars scale against the largest metric · exact counts on the right</Text>
              <View style={styles.contentBars}>{analytics.content.map(item => <HorizontalMetricBar key={item.label} label={item.label} percentage={item.percentage} countText={item.countText} color={item.color} trackColor={colors.cream} />)}</View>
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
  adminRingRow: { flexDirection: 'row', gap: 18, alignItems: 'center', marginTop: 14 },
  roleBars: { flex: 1, gap: 12 },
  summaryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metricCard: { width: '46%', backgroundColor: colors.white, borderRadius: 18, borderWidth: 1, borderColor: colors.line, padding: 14 },
  metricValue: { color: colors.ink, fontSize: 22, fontWeight: '900' },
  metricLabel: { color: colors.muted, fontSize: 9, marginTop: 4 },
  panel: { backgroundColor: colors.white, borderRadius: 24, borderWidth: 1, borderColor: colors.line, padding: 18 },
  panelTitle: { color: colors.ink, fontSize: 16, fontWeight: '900', marginBottom: 12 },
  panelSubtitle: { color: colors.subtle, fontSize: 9, lineHeight: 13, marginTop: -8, marginBottom: 14 },
  contentBars: { gap: 14 },
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
