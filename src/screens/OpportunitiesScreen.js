import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconButton, Pill, PrimaryButton } from '../components/ui';
import { opportunities as seedOpportunities } from '../data/demoData';
import { useAuth } from '../context/AuthContext';
import { expressInterest, listenToApprovedOpportunities, saveOpportunity } from '../firebase/dataService';
import { colors } from '../theme';

const filterOptions = ['Best matches', 'Internships', 'Graduate', 'Learnerships'];

export default function OpportunitiesScreen() {
  const { user, isDemo } = useAuth();
  const [jobs, setJobs] = useState(seedOpportunities);
  const [selected, setSelected] = useState(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('Best matches');
  const [applied, setApplied] = useState([]);

  const studentSkills = useMemo(() => {
    if (!user || !Array.isArray(user.skills)) return [];
    return user.skills.map(skill => String(skill).trim().toLowerCase()).filter(Boolean);
  }, [user]);

  const jobsWithMatch = useMemo(() => {
    const studentSkillSet = new Set(studentSkills);
    return jobs.map(job => {
      const requiredSkills = Array.isArray(job.skills) ? job.skills.map(skill => String(skill).trim().toLowerCase()).filter(Boolean) : [];
      const overlap = requiredSkills.filter(skill => studentSkillSet.has(skill)).length;
      const match = requiredSkills.length ? Math.round((overlap / requiredSkills.length) * 100) : 0;
      return { ...job, match };
    });
  }, [jobs, studentSkills]);

  const filteredJobs = useMemo(() => jobsWithMatch.filter(job => `${job.title} ${job.company} ${job.skills.join(' ')}`.toLowerCase().includes(query.toLowerCase())), [jobsWithMatch, query]);
  const topMatchJob = useMemo(() => [...jobsWithMatch].sort((a, b) => b.match - a.match)[0], [jobsWithMatch]);
  const isBusiness = user.role === 'business';
  const isAdmin = user.role === 'admin';

  useEffect(() => {
    if (isDemo || isBusiness || isAdmin) return undefined;
    return listenToApprovedOpportunities(liveJobs => setJobs(liveJobs.map(job => ({
      ...job,
      logo: job.logo || job.company?.[0],
      color: job.color || colors.bluePale,
      skills: job.skills || [],
      posted: 'recently',
    }))), () => {});
  }, [isAdmin, isBusiness, isDemo]);

  async function save(job) {
    setJobs(current => current.map(item => item.id === job.id ? { ...item, saved: !item.saved } : item));
    if (!isDemo && !job.saved) await saveOpportunity(user.id, job.id);
  }

  async function apply(job) {
    setApplied(current => [...current, job.id]);
    if (!isDemo) await expressInterest(user, job.id);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View><Text style={styles.eyebrow}>{isBusiness ? 'YOUR RECRUITMENT HUB' : isAdmin ? 'OPPORTUNITY OVERSIGHT' : 'CURATED FOR YOU'}</Text><Text style={styles.title}>{isBusiness ? 'Find great talent' : isAdmin ? 'Manage opportunities' : 'Your next move'}</Text></View>
          <IconButton name={isBusiness ? 'add' : isAdmin ? 'shield-checkmark-outline' : 'bookmark-outline'} />
        </View>

        {(isBusiness || isAdmin) ? (
          <LinearGradient colors={['#0D3B2E', '#1D664B']} style={styles.managementCard}>
            <View><Text style={styles.managementValue}>{isBusiness ? '148' : '12'}</Text><Text style={styles.managementLabel}>{isBusiness ? 'total applicants' : 'listings pending review'}</Text></View>
            <View style={styles.managementDivider} />
            <View><Text style={styles.managementValue}>{isBusiness ? '3' : '48'}</Text><Text style={styles.managementLabel}>{isBusiness ? 'active opportunities' : 'approved this month'}</Text></View>
            <Pressable style={styles.manageArrow}><Ionicons name="arrow-forward" size={18} color={colors.forest} /></Pressable>
          </LinearGradient>
        ) : (
          <View style={styles.matchCard}>
            <View style={styles.matchRing}><Text style={styles.matchValue}>{topMatchJob?.match ?? 0}%</Text><Text style={styles.matchLabel}>MATCH</Text></View>
            <View style={{ flex: 1 }}><Text style={styles.matchEyebrow}>YOUR TOP MATCH</Text><Text style={styles.matchTitle}>{topMatchJob?.title || 'No matches yet'}</Text><Text style={styles.matchCopy}>{topMatchJob ? `Your skills line up with ${topMatchJob?.skills?.filter(skill => studentSkills.includes(String(skill).trim().toLowerCase())).length || 0} of ${topMatchJob?.skills?.length || 0} requirements.` : 'Add skills to your profile to improve matches.'}</Text></View>
            <Ionicons name="chevron-forward" size={19} color={colors.green} />
          </View>
        )}

        <View style={styles.search}><Ionicons name="search-outline" size={19} color={colors.subtle} /><TextInput value={query} onChangeText={setQuery} placeholder="Search roles, companies or skills" placeholderTextColor={colors.subtle} style={styles.searchInput} /><Ionicons name="options-outline" size={18} color={colors.green} /></View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          {filterOptions.map(item => <Pill key={item} active={filter === item} onPress={() => setFilter(item)}>{item}</Pill>)}
        </ScrollView>

        <View style={styles.listHeading}><Text style={styles.listTitle}>{isBusiness ? 'Your listings' : isAdmin ? 'Published opportunities' : `${filteredJobs.length} roles for you`}</Text><Text style={styles.sort}>Most relevant <Ionicons name="chevron-down" size={11} /></Text></View>
        {filteredJobs.map(job => (
          <Pressable key={job.id} onPress={() => setSelected(job)} style={styles.jobCard}>
            <View style={styles.jobTop}>
              <View style={[styles.companyLogo, { backgroundColor: job.color }]}><Text style={styles.companyLetter}>{job.logo}</Text></View>
              <View style={styles.jobIdentity}><Text style={styles.company}>{job.company}</Text><Text style={styles.jobTitle}>{job.title}</Text></View>
              {!isBusiness && !isAdmin ? <Pressable onPress={() => save(job)} hitSlop={10}><Ionicons name={job.saved ? 'bookmark' : 'bookmark-outline'} size={21} color={job.saved ? colors.green : colors.subtle} /></Pressable> : <Pill active={isAdmin}>Live</Pill>}
            </View>
            <View style={styles.jobMeta}><Text style={styles.metaText}><Ionicons name="location-outline" size={12} /> {job.location}</Text><Text style={styles.metaText}><Ionicons name="time-outline" size={12} /> {job.type}</Text></View>
            <View style={styles.skillRow}>{job.skills.map(skill => <View key={skill} style={styles.skill}><Text style={styles.skillText}>{skill}</Text></View>)}</View>
            <View style={styles.jobBottom}>
              <Text style={styles.posted}>{job.posted}</Text>
              {!isBusiness && !isAdmin ? <View style={styles.matchPill}><Ionicons name="sparkles" size={12} color={colors.green} /><Text style={styles.matchPillText}>{job.match}% skill match</Text></View> : <Text style={styles.applicantCount}>{Math.round(job.match * 0.7)} applicants</Text>}
            </View>
          </Pressable>
        ))}
      </ScrollView>
      <JobModal job={selected} onClose={() => setSelected(null)} onApply={apply} alreadyApplied={selected && applied.includes(selected.id)} canApply={!isBusiness && !isAdmin} />
    </SafeAreaView>
  );
}

function JobModal({ job, onClose, onApply, alreadyApplied, canApply }) {
  if (!job) return null;
  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.modalPage}>
        <View style={styles.modalHeader}><IconButton name="close" onPress={onClose} /><Text style={styles.modalHeaderTitle}>Opportunity</Text><IconButton name="share-outline" /></View>
        <ScrollView contentContainerStyle={styles.modalContent}>
          <View style={[styles.companyLogoLarge, { backgroundColor: job.color }]}><Text style={styles.companyLetterLarge}>{job.logo}</Text></View>
          <Text style={styles.modalCompany}>{job.company}</Text><Text style={styles.modalTitle}>{job.title}</Text>
          <Text style={styles.modalMeta}>{job.location}  ·  {job.type}</Text>
          <View style={styles.matchDetail}><View style={styles.matchDetailIcon}><Ionicons name="sparkles" size={20} color={colors.green} /></View><View><Text style={styles.matchDetailTitle}>{job.match}% profile match</Text><Text style={styles.matchDetailCopy}>Your experience and interests strongly align.</Text></View></View>
          <Text style={styles.detailHeading}>About the opportunity</Text><Text style={styles.detailCopy}>{job.description} You will collaborate with experienced mentors, contribute to real customer outcomes, and follow a structured growth plan.</Text>
          <Text style={styles.detailHeading}>Skills that stand out</Text><View style={styles.skillRow}>{job.skills.map(skill => <Pill key={skill} icon="checkmark-circle">{skill}</Pill>)}</View>
          <Text style={styles.detailHeading}>What you will do</Text>
          {['Build thoughtful features with a cross-functional team', 'Learn through feedback, pairing and structured mentorship', 'Share your perspective and contribute to an inclusive culture'].map(item => <View style={styles.bullet} key={item}><View style={styles.bulletDot} /><Text style={styles.detailCopy}>{item}</Text></View>)}
        </ScrollView>
        {canApply ? <View style={styles.modalFooter}><PrimaryButton disabled={alreadyApplied} onPress={() => onApply(job)} icon={alreadyApplied ? 'checkmark' : 'arrow-forward'}>{alreadyApplied ? 'Interest submitted' : 'Express interest'}</PrimaryButton></View> : null}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  content: { padding: 18, paddingBottom: 120 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8 },
  eyebrow: { color: colors.green, fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
  title: { color: colors.ink, fontSize: 27, fontWeight: '900', letterSpacing: -0.9, marginTop: 4 },
  managementCard: { borderRadius: 23, padding: 18, flexDirection: 'row', alignItems: 'center', marginTop: 20 },
  managementValue: { color: colors.white, fontSize: 24, fontWeight: '900' },
  managementLabel: { color: '#BFD0C8', fontSize: 8, maxWidth: 92, marginTop: 2 },
  managementDivider: { width: 1, height: 42, backgroundColor: 'rgba(255,255,255,0.2)', marginHorizontal: 17 },
  manageArrow: { width: 36, height: 36, borderRadius: 13, backgroundColor: colors.lime, marginLeft: 'auto', alignItems: 'center', justifyContent: 'center' },
  matchCard: { borderRadius: 23, padding: 17, backgroundColor: colors.lime, flexDirection: 'row', gap: 13, alignItems: 'center', marginTop: 20 },
  matchRing: { width: 61, height: 61, borderRadius: 31, backgroundColor: colors.white, borderWidth: 5, borderColor: '#ACDA63', alignItems: 'center', justifyContent: 'center' },
  matchValue: { color: colors.forest, fontSize: 16, fontWeight: '900' },
  matchLabel: { color: colors.green, fontSize: 6, fontWeight: '900', letterSpacing: 0.8 },
  matchEyebrow: { color: colors.green, fontSize: 8, letterSpacing: 1.1, fontWeight: '900' },
  matchTitle: { color: colors.forest, fontSize: 13, fontWeight: '900', marginTop: 3 },
  matchCopy: { color: '#49724F', fontSize: 9, marginTop: 4 },
  search: { height: 51, borderRadius: 17, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, marginTop: 17, paddingHorizontal: 15, flexDirection: 'row', gap: 9, alignItems: 'center' },
  searchInput: { flex: 1, height: '100%', color: colors.ink, fontSize: 13 },
  filters: { gap: 8, paddingTop: 12, paddingRight: 12 },
  listHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 25, marginBottom: 11 },
  listTitle: { color: colors.ink, fontSize: 18, fontWeight: '900' },
  sort: { color: colors.muted, fontSize: 9, fontWeight: '700' },
  jobCard: { borderRadius: 22, padding: 16, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, marginBottom: 11 },
  jobTop: { flexDirection: 'row', alignItems: 'center' },
  companyLogo: { width: 48, height: 48, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  companyLetter: { color: colors.ink, fontSize: 18, fontWeight: '900' },
  jobIdentity: { flex: 1, marginLeft: 11 },
  company: { color: colors.muted, fontSize: 9, fontWeight: '700' },
  jobTitle: { color: colors.ink, fontSize: 14, fontWeight: '900', marginTop: 3 },
  jobMeta: { flexDirection: 'row', gap: 16, marginTop: 13 },
  metaText: { color: colors.muted, fontSize: 9 },
  skillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 13 },
  skill: { backgroundColor: colors.cream, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  skillText: { color: colors.muted, fontSize: 8, fontWeight: '700' },
  jobBottom: { borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 11, marginTop: 13, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  posted: { color: colors.subtle, fontSize: 8 },
  matchPill: { flexDirection: 'row', gap: 5, alignItems: 'center' },
  matchPillText: { color: colors.green, fontSize: 9, fontWeight: '900' },
  applicantCount: { color: colors.green, fontSize: 9, fontWeight: '900' },
  modalPage: { flex: 1, backgroundColor: colors.cream },
  modalHeader: { paddingHorizontal: 18, height: 66, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modalHeaderTitle: { color: colors.ink, fontSize: 14, fontWeight: '900' },
  modalContent: { padding: 22, paddingBottom: 130 },
  companyLogoLarge: { width: 70, height: 70, borderRadius: 23, alignItems: 'center', justifyContent: 'center', marginBottom: 17 },
  companyLetterLarge: { color: colors.ink, fontSize: 26, fontWeight: '900' },
  modalCompany: { color: colors.green, fontSize: 11, fontWeight: '900' },
  modalTitle: { color: colors.ink, fontSize: 29, lineHeight: 34, fontWeight: '900', letterSpacing: -1, marginTop: 5 },
  modalMeta: { color: colors.muted, fontSize: 11, marginTop: 9 },
  matchDetail: { flexDirection: 'row', gap: 11, alignItems: 'center', backgroundColor: colors.mint, borderRadius: 18, padding: 14, marginTop: 20 },
  matchDetailIcon: { width: 43, height: 43, borderRadius: 14, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  matchDetailTitle: { color: colors.forest, fontSize: 12, fontWeight: '900' },
  matchDetailCopy: { color: colors.green, fontSize: 9, marginTop: 3 },
  detailHeading: { color: colors.ink, fontSize: 15, fontWeight: '900', marginTop: 24 },
  detailCopy: { color: colors.muted, fontSize: 12, lineHeight: 19, marginTop: 8, flex: 1 },
  bullet: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  bulletDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.green, marginTop: 14 },
  modalFooter: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 18, paddingBottom: 28, backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.line },
});
