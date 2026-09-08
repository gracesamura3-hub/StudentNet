import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar, IconButton, Pill, SectionHeader } from '../components/ui';
import { people as seedPeople } from '../data/demoData';
import { useAuth } from '../context/AuthContext';
import { requestConnection } from '../firebase/dataService';
import { colors } from '../theme';

const pathways = [
  { id: '1', name: 'Software engineering', alumni: '42 alumni', icon: 'code-slash-outline', tone: colors.bluePale, roles: 'Developer → Tech Lead → Architect' },
  { id: '2', name: 'Product & UX', alumni: '28 alumni', icon: 'color-palette-outline', tone: colors.coralPale, roles: 'Designer → Product Lead → Head of UX' },
  { id: '3', name: 'Data & AI', alumni: '35 alumni', icon: 'analytics-outline', tone: colors.mint, roles: 'Analyst → Data Scientist → ML Lead' },
];

export default function NetworkScreen() {
  const { user, isDemo } = useAuth();
  const [people, setPeople] = useState(seedPeople);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('Suggested');
  const filteredPeople = useMemo(() => people.filter(person => `${person.name} ${person.headline}`.toLowerCase().includes(query.toLowerCase())), [people, query]);

  async function connect(person) {
    if (person.status === 'Pending') return;
    setPeople(current => current.map(item => item.id === person.id ? { ...item, status: 'Pending' } : item));
    if (!isDemo) await requestConnection(user, person.id);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}><View><Text style={styles.eyebrow}>YOUR COMMUNITY</Text><Text style={styles.title}>Grow your network</Text></View><IconButton name="person-add-outline" /></View>
        <View style={styles.search}><Ionicons name="search-outline" size={19} color={colors.subtle} /><TextInput value={query} onChangeText={setQuery} placeholder="People, skills or companies" placeholderTextColor={colors.subtle} style={styles.searchInput} /><Ionicons name="options-outline" size={18} color={colors.green} /></View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          {['Suggested', 'Alumni', 'Students', 'Mentors', 'Recruiters'].map(item => <Pill key={item} active={filter === item} onPress={() => setFilter(item)}>{item}</Pill>)}
        </ScrollView>

        <View style={styles.mentorBanner}>
          <View style={styles.mentorIcon}><Ionicons name="compass-outline" size={26} color={colors.forest} /></View>
          <View style={{ flex: 1 }}><Text style={styles.mentorEyebrow}>MENTOR MATCH</Text><Text style={styles.mentorTitle}>Learn from someone who has been there.</Text><Text style={styles.mentorCopy}>We found 6 alumni mentors aligned with your goals.</Text></View>
          <Ionicons name="arrow-forward" size={20} color={colors.forest} />
        </View>

        <View style={styles.section}>
          <SectionHeader title="People to know" action="See all" />
          {filteredPeople.map(person => (
            <View key={person.id} style={styles.personCard}>
              <Avatar initials={person.initials} color={person.color} size={52} />
              <View style={styles.personCopy}><Text style={styles.personName}>{person.name}</Text><Text numberOfLines={1} style={styles.personHeadline}>{person.headline}</Text><Text style={styles.personShared}>{person.shared}</Text></View>
              <Pressable onPress={() => connect(person)} style={[styles.connectButton, person.status === 'Pending' && styles.pendingButton]}>
                <Text style={[styles.connectText, person.status === 'Pending' && styles.pendingText]}>{person.status}</Text>
              </Pressable>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <SectionHeader title="Explore career paths" action="All pathways" />
          <Text style={styles.sectionIntro}>See where alumni from your programme built their careers.</Text>
          {pathways.map(path => (
            <Pressable key={path.id} style={styles.pathCard}>
              <View style={[styles.pathIcon, { backgroundColor: path.tone }]}><Ionicons name={path.icon} size={22} color={colors.green} /></View>
              <View style={{ flex: 1 }}><Text style={styles.pathName}>{path.name}</Text><Text style={styles.pathRoles}>{path.roles}</Text><Text style={styles.pathAlumni}>{path.alumni}</Text></View>
              <Ionicons name="chevron-forward" size={18} color={colors.subtle} />
            </Pressable>
          ))}
        </View>
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
  search: { height: 51, borderRadius: 17, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, marginTop: 20, paddingHorizontal: 15, flexDirection: 'row', gap: 9, alignItems: 'center' },
  searchInput: { flex: 1, height: '100%', color: colors.ink, fontSize: 13 },
  filters: { gap: 8, paddingTop: 12, paddingRight: 12 },
  mentorBanner: { flexDirection: 'row', gap: 13, borderRadius: 23, padding: 17, backgroundColor: colors.lime, marginTop: 20, alignItems: 'center' },
  mentorIcon: { width: 50, height: 50, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.55)', alignItems: 'center', justifyContent: 'center' },
  mentorEyebrow: { color: colors.green, fontSize: 8, letterSpacing: 1.2, fontWeight: '900' },
  mentorTitle: { color: colors.forest, fontSize: 14, lineHeight: 18, fontWeight: '900', marginTop: 4 },
  mentorCopy: { color: '#47704C', fontSize: 9, marginTop: 4 },
  section: { marginTop: 28 },
  sectionIntro: { color: colors.muted, fontSize: 11, marginTop: -9, marginBottom: 12 },
  personCard: { flexDirection: 'row', gap: 11, alignItems: 'center', padding: 13, borderRadius: 19, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white, marginBottom: 9 },
  personCopy: { flex: 1 },
  personName: { color: colors.ink, fontSize: 13, fontWeight: '900' },
  personHeadline: { color: colors.muted, fontSize: 10, marginTop: 3 },
  personShared: { color: colors.subtle, fontSize: 9, marginTop: 4 },
  connectButton: { height: 34, borderRadius: 12, backgroundColor: colors.forest, justifyContent: 'center', paddingHorizontal: 12 },
  connectText: { color: colors.white, fontSize: 10, fontWeight: '900' },
  pendingButton: { backgroundColor: colors.cream, borderWidth: 1, borderColor: colors.line },
  pendingText: { color: colors.muted },
  pathCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.white, borderRadius: 19, padding: 14, borderWidth: 1, borderColor: colors.line, marginBottom: 9 },
  pathIcon: { width: 49, height: 49, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  pathName: { color: colors.ink, fontSize: 13, fontWeight: '900' },
  pathRoles: { color: colors.muted, fontSize: 9, marginTop: 3 },
  pathAlumni: { color: colors.green, fontSize: 9, fontWeight: '800', marginTop: 4 },
});
