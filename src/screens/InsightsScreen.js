import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconButton, Pill, SectionHeader } from '../components/ui';
import { analytics } from '../data/demoData';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme';

const adminQueue = [
  { id: '1', title: 'Nova Labs Africa', detail: 'Business verification', icon: 'business-outline', tone: colors.bluePale },
  { id: '2', title: 'Graduate Data Analyst', detail: 'Opportunity approval', icon: 'briefcase-outline', tone: colors.mint },
  { id: '3', title: 'Reported career story', detail: 'Content moderation', icon: 'flag-outline', tone: colors.coralPale },
];

export default function InsightsScreen() {
  const { user } = useAuth();
  const roleKey = user.role === 'alumni' ? 'student' : user.role;
  const data = analytics[roleKey] || analytics.student;
  const [period, setPeriod] = useState('7 days');
  const max = Math.max(...data.chart);
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}><View><Text style={styles.eyebrow}>{user.role === 'admin' ? 'PLATFORM ANALYTICS' : user.role === 'business' ? 'RECRUITMENT ANALYTICS' : 'YOUR ANALYTICS'}</Text><Text style={styles.title}>Insights</Text></View><IconButton name="download-outline" /></View>
        <View style={styles.healthCard}>
          <View style={styles.ringWrap}>
            <Svg width={82} height={82} viewBox="0 0 82 82"><Circle cx="41" cy="41" r="34" fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="8" /><Circle cx="41" cy="41" r="34" fill="none" stroke={colors.lime} strokeWidth="8" strokeLinecap="round" strokeDasharray={`${2 * Math.PI * 34 * 0.84} ${2 * Math.PI * 34}`} transform="rotate(-90 41 41)" /></Svg>
            <View style={styles.ringValue}><Text style={styles.ringNumber}>84</Text><Text style={styles.ringPercent}>%</Text></View>
          </View>
          <View style={{ flex: 1 }}><Text style={styles.healthEyebrow}>THIS MONTH</Text><Text style={styles.healthTitle}>{data.headline}</Text><Text style={styles.healthCopy}>You are performing better than 72% of comparable profiles.</Text></View>
        </View>

        <View style={styles.cards}>{data.cards.map((card, index) => <View style={styles.metricCard} key={card.label}><View style={[styles.metricIcon, { backgroundColor: index ? colors.goldPale : colors.mint }]}><Ionicons name={index ? 'people-outline' : 'eye-outline'} size={20} color={colors.green} /></View><Text style={styles.metricValue}>{card.value}</Text><Text style={styles.metricLabel}>{card.label}</Text><Text style={styles.metricDelta}><Ionicons name={card.delta.startsWith('-') ? 'arrow-down' : 'arrow-up'} size={9} /> {card.delta}</Text></View>)}</View>

        <View style={styles.panel}>
          <View style={styles.panelHeader}><View><Text style={styles.panelTitle}>Visibility trend</Text><Text style={styles.panelSubtitle}>{data.chartLabel}</Text></View><Pill onPress={() => setPeriod(period === '7 days' ? '30 days' : '7 days')}>{period}</Pill></View>
          <View style={styles.chart}>
            {data.chart.map((value, index) => <View key={`${value}-${index}`} style={styles.barColumn}><View style={[styles.bar, { height: 25 + (value / max) * 105 }, index === data.chart.length - 1 && styles.barActive]} /><Text style={styles.barLabel}>{['M', 'T', 'W', 'T', 'F', 'S', 'S'][index]}</Text></View>)}
          </View>
        </View>

        <View style={styles.section}><SectionHeader title={user.role === 'business' ? 'Candidate skill demand' : user.role === 'admin' ? 'Community by role' : 'Skills recruiters search'} action="Details" />
          <View style={styles.skillPanel}>{data.skills.map(skill => <View key={skill.name} style={styles.skillItem}><View style={styles.skillHead}><Text style={styles.skillName}>{skill.name}</Text><Text style={styles.skillPercent}>{skill.value}%</Text></View><View style={styles.track}><View style={[styles.fill, { width: `${skill.value}%` }]} /></View></View>)}</View>
        </View>

        {user.role === 'admin' ? <View style={styles.section}><SectionHeader title="Review queue" action="View all" />{adminQueue.map(item => <View key={item.id} style={styles.queueItem}><View style={[styles.queueIcon, { backgroundColor: item.tone }]}><Ionicons name={item.icon} size={19} color={colors.green} /></View><View style={{ flex: 1 }}><Text style={styles.queueTitle}>{item.title}</Text><Text style={styles.queueDetail}>{item.detail}</Text></View><Pressable style={styles.reviewButton}><Text style={styles.reviewText}>Review</Text></Pressable></View>)}</View> : null}

        <View style={styles.tip}><View style={styles.tipIcon}><Ionicons name="bulb-outline" size={21} color="#986600" /></View><View style={{ flex: 1 }}><Text style={styles.tipTitle}>{user.role === 'business' ? 'Talent insight' : user.role === 'admin' ? 'Platform insight' : 'Profile insight'}</Text><Text style={styles.tipCopy}>{user.role === 'business' ? 'Candidates engage 2.4× more with listings that show a salary range.' : user.role === 'admin' ? 'Business approval time improved by 18% this month.' : 'Adding one project with a live link could move your profile into the top 15%.'}</Text></View></View>
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
