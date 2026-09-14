import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { IconButton, Pill, SectionHeader } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase/config';
import { colors } from '../theme';

const adminQueue = [
  { id: '1', title: 'Nova Labs Africa', detail: 'Business verification', icon: 'business-outline', tone: colors.bluePale },
  { id: '2', title: 'Graduate Data Analyst', detail: 'Opportunity approval', icon: 'briefcase-outline', tone: colors.mint },
  { id: '3', title: 'Reported career story', detail: 'Content moderation', icon: 'flag-outline', tone: colors.coralPale },
];

const safeNumber = value => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

const formatCount = value => safeNumber(value).toLocaleString();

function buildStudentData(user, posts) {
  const profileViews = safeNumber(user?.profileViews);
  const connectionCount = Array.isArray(user?.connectionIds)
    ? user.connectionIds.length
    : Array.isArray(user?.connections)
      ? user.connections.length
      : 0;
  const postEngagement = posts.reduce((sum, post) => sum + safeNumber(post.reactions) + safeNumber(post.commentCount), 0);
  const videoPosts = posts.filter(post => post?.type === 'video' || post?.mediaType === 'video').length;
  return {
    headline: 'Your community engagement is growing',
    chartLabel: 'Profile + network activity · real-time',
    cards: [
      { label: 'Profile views', value: formatCount(profileViews), delta: profileViews ? '+real' : '0' },
      { label: 'Connections', value: formatCount(connectionCount), delta: connectionCount ? '+real' : '0' },
      { label: 'Engagement', value: formatCount(postEngagement), delta: videoPosts ? `${videoPosts} video posts` : `${posts.length} posts` },
    ],
    skills: [
      { name: 'Profile reach', value: profileViews ? Math.min(100, Math.round(profileViews / 3)) : 0 },
      { name: 'Network health', value: connectionCount ? Math.min(100, Math.round(connectionCount * 3)) : 0 },
      { name: 'Post engagement', value: postEngagement ? Math.min(100, Math.round(postEngagement / 5)) : 0 },
    ],
  };
}

async function getBusinessMetrics(user) {
  const opportunitiesSnap = await getDocs(collection(db, 'opportunities'));
  const ownedOpportunities = opportunitiesSnap.docs.filter(docSnap => {
    const data = docSnap.data();
    return [data.authorId, data.userId, data.createdBy, data.ownerId, data.businessId, data.postedBy].includes(user.id);
  });

  const opportunityStats = await Promise.all(ownedOpportunities.map(async opportunityDoc => {
    const applicationSnap = await getDocs(collection(db, 'opportunities', opportunityDoc.id, 'applications'));
    return { id: opportunityDoc.id, applicantCount: applicationSnap.size, title: opportunityDoc.data().title || 'Opportunity' };
  }));

  const totalApplicants = opportunityStats.reduce((sum, item) => sum + item.applicantCount, 0);
  const totalListings = opportunityStats.length;
  const chart = opportunityStats.length ? opportunityStats.map(item => Math.max(0, item.applicantCount)) : [0, 0, 0, 0, 0, 0, 0];
  const skillCounts = {};
  ownedOpportunities.forEach(opportunityDoc => {
    const skills = Array.isArray(opportunityDoc.data().skills) ? opportunityDoc.data().skills : [];
    skills.forEach(skill => {
      const key = String(skill).trim();
      if (!key) return;
      skillCounts[key] = (skillCounts[key] || 0) + 1;
    });
  });

  return {
    headline: 'Talent pipeline is active',
    chartLabel: 'Applicants per posted opportunity',
    cards: [
      { label: 'Applicants', value: formatCount(totalApplicants), delta: totalListings ? `${totalListings} listings` : '0 listings' },
      { label: 'Open roles', value: formatCount(totalListings), delta: totalApplicants ? '+real' : '0' },
    ],
    skills: Object.entries(skillCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, count]) => ({ name, value: totalListings ? Math.min(100, Math.round((count / totalListings) * 100)) : 0 })),
    chart,
  };
}

async function getAdminMetrics() {
  const usersSnap = await getDocs(collection(db, 'users'));
  const postsSnap = await getDocs(collection(db, 'posts'));
  const pendingQuery = query(collection(db, 'users'), where('role', 'in', ['business', 'alumni']), where('status', '==', 'pending'));
  const pendingSnap = await getDocs(pendingQuery);

  const roleCounts = { student: 0, alumni: 0, business: 0, admin: 0 };
  usersSnap.docs.forEach(docSnap => {
    const role = docSnap.data().role;
    if (role && roleCounts[role] !== undefined) roleCounts[role] += 1;
  });

  const totalUsers = usersSnap.size;
  const chart = [roleCounts.student, roleCounts.alumni, roleCounts.business, roleCounts.admin, postsSnap.size, pendingSnap.size, totalUsers];
  const skillRows = Object.entries(roleCounts)
    .filter(([name]) => roleCounts[name] > 0)
    .map(([name, count]) => ({ name: name[0].toUpperCase() + name.slice(1), value: totalUsers ? Math.min(100, Math.round((count / totalUsers) * 100)) : 0 }));

  return {
    headline: 'Platform health is strong',
    chartLabel: 'Users, posts, pending approvals',
    cards: [
      { label: 'Users', value: formatCount(totalUsers), delta: `${Object.keys(roleCounts).filter(key => roleCounts[key]).length} roles` },
      { label: 'Posts', value: formatCount(postsSnap.size), delta: `${pendingSnap.size} pending` },
      { label: 'Pending', value: formatCount(pendingSnap.size), delta: 'admin review' },
    ],
    skills: skillRows,
    chart,
  };
}

export default function InsightsScreen() {
  const { user } = useAuth();
  const [data, setData] = useState({
    headline: 'Loading analytics…',
    chartLabel: 'Loading…',
    cards: [{ label: 'Profile views', value: '0', delta: '0' }],
    skills: [],
    chart: [0, 0, 0, 0, 0, 0, 0],
  });
  const [period, setPeriod] = useState('7 days');

  useEffect(() => {
    if (!db || !user) return undefined;
    let active = true;

    async function loadAnalytics() {
      try {
        if (user.role === 'admin') {
          const adminMetrics = await getAdminMetrics();
          if (active) setData(adminMetrics);
          return;
        }

        if (user.role === 'business') {
          const businessMetrics = await getBusinessMetrics(user);
          if (active) setData(businessMetrics);
          return;
        }

        const postsSnap = await getDocs(query(collection(db, 'posts'), where('authorId', '==', user.id)));
        const posts = postsSnap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
        const studentData = buildStudentData(user, posts);
        if (active) setData(studentData);
      } catch {
        if (active) {
          setData({
            headline: 'Analytics unavailable',
            chartLabel: 'Firestore data is not ready yet',
            cards: [{ label: 'Profile views', value: '0', delta: '0' }, { label: 'Connections', value: '0', delta: '0' }],
            skills: [],
            chart: [0, 0, 0, 0, 0, 0, 0],
          });
        }
      }
    }

    loadAnalytics();
    return () => { active = false; };
  }, [user]);

  const max = useMemo(() => Math.max(...data.chart, 1), [data.chart]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}><View><Text style={styles.eyebrow}>{user.role === 'admin' ? 'PLATFORM ANALYTICS' : user.role === 'business' ? 'RECRUITMENT ANALYTICS' : 'YOUR ANALYTICS'}</Text><Text style={styles.title}>Insights</Text></View><IconButton name="download-outline" /></View>
        <View style={styles.healthCard}>
          <View style={styles.ringWrap}>
            <Svg width={82} height={82} viewBox="0 0 82 82"><Circle cx="41" cy="41" r="34" fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="8" /><Circle cx="41" cy="41" r="34" fill="none" stroke={colors.lime} strokeWidth="8" strokeLinecap="round" strokeDasharray={`${2 * Math.PI * 34 * 0.84} ${2 * Math.PI * 34}`} transform="rotate(-90 41 41)" /></Svg>
            <View style={styles.ringValue}><Text style={styles.ringNumber}>{Math.min(99, Math.max(0, Math.round((data.cards[0]?.value || '0').replace(/[^0-9]/g, '') / 10)))}</Text><Text style={styles.ringPercent}>%</Text></View>
          </View>
          <View style={{ flex: 1 }}><Text style={styles.healthEyebrow}>THIS MONTH</Text><Text style={styles.healthTitle}>{data.headline}</Text><Text style={styles.healthCopy}>Live metrics are drawn from the current Firestore state.</Text></View>
        </View>

        <View style={styles.cards}>{data.cards.map((card, index) => <View style={styles.metricCard} key={`${card.label}-${index}`}><View style={[styles.metricIcon, { backgroundColor: index ? colors.goldPale : colors.mint }]}><Ionicons name={index ? 'people-outline' : 'eye-outline'} size={20} color={colors.green} /></View><Text style={styles.metricValue}>{card.value}</Text><Text style={styles.metricLabel}>{card.label}</Text><Text style={styles.metricDelta}><Ionicons name={String(card.delta).startsWith('-') ? 'arrow-down' : 'arrow-up'} size={9} /> {card.delta}</Text></View>)}</View>

        <View style={styles.panel}>
          <View style={styles.panelHeader}><View><Text style={styles.panelTitle}>Visibility trend</Text><Text style={styles.panelSubtitle}>{data.chartLabel}</Text></View><Pill onPress={() => setPeriod(period === '7 days' ? '30 days' : '7 days')}>{period}</Pill></View>
          <View style={styles.chart}>
            {data.chart.map((value, index) => <View key={`${value}-${index}`} style={styles.barColumn}><View style={[styles.bar, { height: 25 + (value / max) * 105 }, index === data.chart.length - 1 && styles.barActive]} /><Text style={styles.barLabel}>{['M', 'T', 'W', 'T', 'F', 'S', 'S'][index]}</Text></View>)}
          </View>
        </View>

        <View style={styles.section}><SectionHeader title={user.role === 'business' ? 'Candidate skill demand' : user.role === 'admin' ? 'Community by role' : 'Skills recruiters search'} action="Details" />
          <View style={styles.skillPanel}>{(data.skills || []).map(skill => <View key={skill.name} style={styles.skillItem}><View style={styles.skillHead}><Text style={styles.skillName}>{skill.name}</Text><Text style={styles.skillPercent}>{skill.value}%</Text></View><View style={styles.track}><View style={[styles.fill, { width: `${skill.value}%` }]} /></View></View>)}</View>
        </View>

        {user.role === 'admin' ? <View style={styles.section}><SectionHeader title="Review queue" action="View all" />{adminQueue.map(item => <View key={item.id} style={styles.queueItem}><View style={[styles.queueIcon, { backgroundColor: item.tone }]}><Ionicons name={item.icon} size={19} color={colors.green} /></View><View style={{ flex: 1 }}><Text style={styles.queueTitle}>{item.title}</Text><Text style={styles.queueDetail}>{item.detail}</Text></View><Pressable style={styles.reviewButton}><Text style={styles.reviewText}>Review</Text></Pressable></View>)}</View> : null}

        <View style={styles.tip}><View style={styles.tipIcon}><Ionicons name="bulb-outline" size={21} color="#986600" /></View><View style={{ flex: 1 }}><Text style={styles.tipTitle}>{user.role === 'business' ? 'Talent insight' : user.role === 'admin' ? 'Platform insight' : 'Profile insight'}</Text><Text style={styles.tipCopy}>{user.role === 'business' ? `You currently have ${data.cards[0]?.value || '0'} applicants across your live roles.` : user.role === 'admin' ? `There are ${data.cards[2]?.value || '0'} pending member approvals awaiting review.` : `Your profile engagement includes ${data.cards[2]?.value || '0'} tracked interactions across posts and video activity.`}</Text></View></View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  content: { padding: 18, paddingBottom: 120 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8 },
  eyebrow: { color: colors.green, fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
  title: { color: colors.ink, fontSize: 27, fontWeight: '900', letterSpacing: -0.9, marginTop: 4 },
  healthCard: { borderRadius: 24, padding: 18, backgroundColor: colors.forest, flexDirection: 'row', gap: 15, alignItems: 'center', marginTop: 20 },
  ringWrap: { width: 82, height: 82, alignItems: 'center', justifyContent: 'center' },
  ringValue: { position: 'absolute', flexDirection: 'row', alignItems: 'baseline' },
  ringNumber: { color: colors.white, fontSize: 20, fontWeight: '900' },
  ringPercent: { color: colors.lime, fontSize: 9, fontWeight: '900' },
  healthEyebrow: { color: colors.lime, fontSize: 8, fontWeight: '900', letterSpacing: 1.2 },
  healthTitle: { color: colors.white, fontSize: 15, fontWeight: '900', marginTop: 5 },
  healthCopy: { color: '#BFD0C8', fontSize: 9, lineHeight: 14, marginTop: 5 },
  cards: { flexDirection: 'row', gap: 10, marginTop: 11 },
  metricCard: { flex: 1, borderRadius: 21, padding: 15, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line },
  metricIcon: { width: 37, height: 37, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  metricValue: { color: colors.ink, fontSize: 24, fontWeight: '900', marginTop: 12 },
  metricLabel: { color: colors.muted, fontSize: 9, marginTop: 2 },
  metricDelta: { color: colors.green, fontSize: 9, fontWeight: '900', marginTop: 7 },
  panel: { backgroundColor: colors.white, borderRadius: 23, borderWidth: 1, borderColor: colors.line, padding: 16, marginTop: 11 },
  panelHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  panelTitle: { color: colors.ink, fontSize: 14, fontWeight: '900' },
  panelSubtitle: { color: colors.subtle, fontSize: 8, marginTop: 3 },
  chart: { height: 165, flexDirection: 'row', alignItems: 'flex-end', gap: 9, paddingTop: 20 },
  barColumn: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 7 },
  bar: { width: '68%', maxWidth: 24, borderRadius: 7, backgroundColor: '#DDE7E1' },
  barActive: { backgroundColor: colors.green },
  barLabel: { color: colors.subtle, fontSize: 8 },
  section: { marginTop: 27 },
  skillPanel: { borderRadius: 22, padding: 17, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, gap: 15 },
  skillItem: { gap: 7 },
  skillHead: { flexDirection: 'row', justifyContent: 'space-between' },
  skillName: { color: colors.ink, fontSize: 11, fontWeight: '800' },
  skillPercent: { color: colors.green, fontSize: 10, fontWeight: '900' },
  track: { height: 7, borderRadius: 4, backgroundColor: colors.cream, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4, backgroundColor: colors.green },
  queueItem: { flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.line, padding: 12 },
  queueIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  queueTitle: { color: colors.ink, fontSize: 11, fontWeight: '900' },
  queueDetail: { color: colors.muted, fontSize: 9, marginTop: 3 },
  reviewButton: { borderWidth: 1, borderColor: colors.green, borderRadius: 11, paddingHorizontal: 11, paddingVertical: 7 },
  reviewText: { color: colors.green, fontSize: 9, fontWeight: '900' },
  tip: { flexDirection: 'row', gap: 12, borderRadius: 20, padding: 15, backgroundColor: colors.goldPale, marginTop: 25 },
  tipIcon: { width: 40, height: 40, borderRadius: 14, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  tipTitle: { color: colors.ink, fontSize: 11, fontWeight: '900' },
  tipCopy: { color: '#765D2B', fontSize: 9, lineHeight: 14, marginTop: 4 },
});
