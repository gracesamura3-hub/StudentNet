import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrimaryButton } from '../components/ui';
import { buildContextualNiaTip } from '../utils/profileAi';
import { colors } from '../theme';

const steps = [
  { eyebrow: 'STEP 1 OF 3', icon: 'id-card-outline', title: 'Your story starts with a strong profile.', copy: 'Showcase your skills, experience, projects and ambitions in one professional portfolio.', note: 'Profiles with a photo and at least five skills are discovered more often.', accent: colors.bluePale },
  { eyebrow: 'STEP 2 OF 3', icon: 'people-outline', title: 'Build relationships that move you forward.', copy: 'Meet classmates, follow alumni career journeys, and learn directly from verified mentors.', note: 'Thoughtful connection notes receive significantly more responses.', accent: colors.coralPale },
  { eyebrow: 'STEP 3 OF 3', icon: 'sparkles-outline', title: 'Opportunities matched to your potential.', copy: 'We surface internships, graduate roles and events based on your programme, skills and interests.', note: 'Nia, your AI profile coach, is always available when you need guidance.', accent: colors.mint },
];

export default function OnboardingScreen({ user, onComplete }) {
  const [index, setIndex] = useState(0);
  const step = steps[index];
  const final = index === steps.length - 1;
  const niaTip = useMemo(() => buildContextualNiaTip(user || {}), [user]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.top}><View style={styles.brand}><Ionicons name="people" size={18} color={colors.white} /></View><Text style={styles.brandName}>StudentNet</Text><Text style={styles.counter}>{index + 1} / {steps.length}</Text></View>
      <View style={styles.visual}>
        <LinearGradient colors={['#EAF2EC', step.accent]} style={styles.visualGradient}>
          <View style={styles.orbitOne} /><View style={styles.orbitTwo} />
          <View style={styles.mainIcon}><Ionicons name={step.icon} size={48} color={colors.forest} /></View>
          <View style={[styles.floatChip, styles.floatChipTop]}><Ionicons name="checkmark-circle" size={16} color={colors.green} /><Text style={styles.floatText}>Verified community</Text></View>
          <View style={[styles.floatChip, styles.floatChipBottom]}><Ionicons name="trending-up" size={16} color={colors.blue} /><Text style={styles.floatText}>{index === 0 ? '84% complete' : index === 1 ? '126 connections' : '94% match'}</Text></View>
        </LinearGradient>
      </View>
      <View style={styles.copy}>
        <Text style={styles.eyebrow}>{step.eyebrow}</Text><Text style={styles.title}>{step.title}</Text><Text style={styles.body}>{step.copy}</Text>
        <View style={styles.note}><View style={styles.noteIcon}><Ionicons name="bulb-outline" size={19} color="#956600" /></View><Text style={styles.noteText}>{final ? niaTip : step.note}</Text></View>
      </View>
      <View style={styles.footer}>
        <View style={styles.dots}>{steps.map((_, dotIndex) => <View key={dotIndex} style={[styles.dot, dotIndex === index && styles.dotActive]} />)}</View>
        <PrimaryButton onPress={() => final ? onComplete() : setIndex(current => current + 1)} icon="arrow-forward">{final ? `Let’s build, ${user.firstName}` : 'Continue'}</PrimaryButton>
        {index > 0 ? <Pressable onPress={() => setIndex(current => current - 1)}><Text style={styles.back}>Back</Text></Pressable> : <View style={{ height: 35 }} />}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream, paddingHorizontal: 22 },
  top: { height: 64, flexDirection: 'row', alignItems: 'center' }, brand: { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.forest, alignItems: 'center', justifyContent: 'center' }, brandName: { color: colors.ink, fontSize: 17, fontWeight: '900', marginLeft: 9 }, counter: { marginLeft: 'auto', color: colors.muted, fontSize: 11, fontWeight: '700' },
  visual: { flex: 1, maxHeight: 300, paddingVertical: 14 }, visualGradient: { flex: 1, borderRadius: 30, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  orbitOne: { position: 'absolute', width: 230, height: 230, borderRadius: 115, borderWidth: 1, borderColor: 'rgba(13,59,46,0.1)' }, orbitTwo: { position: 'absolute', width: 165, height: 165, borderRadius: 83, borderWidth: 1, borderColor: 'rgba(13,59,46,0.13)' },
  mainIcon: { width: 100, height: 100, borderRadius: 34, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  floatChip: { position: 'absolute', flexDirection: 'row', gap: 7, alignItems: 'center', backgroundColor: colors.white, borderRadius: 14, paddingHorizontal: 11, paddingVertical: 9 }, floatChipTop: { top: 31, right: 19, transform: [{ rotate: '4deg' }] }, floatChipBottom: { bottom: 30, left: 18, transform: [{ rotate: '-4deg' }] }, floatText: { color: colors.ink, fontSize: 9, fontWeight: '800' },
  copy: { paddingTop: 22 }, eyebrow: { color: colors.green, fontSize: 9, fontWeight: '900', letterSpacing: 1.5 }, title: { color: colors.ink, fontSize: 31, lineHeight: 36, fontWeight: '900', letterSpacing: -1, marginTop: 9 }, body: { color: colors.muted, fontSize: 13, lineHeight: 20, marginTop: 11 },
  note: { flexDirection: 'row', gap: 10, alignItems: 'center', backgroundColor: colors.goldPale, borderRadius: 17, padding: 12, marginTop: 18 }, noteIcon: { width: 37, height: 37, borderRadius: 13, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' }, noteText: { color: '#765D2B', fontSize: 9, lineHeight: 14, flex: 1 },
  footer: { marginTop: 'auto', paddingTop: 18 }, dots: { flexDirection: 'row', gap: 5, justifyContent: 'center', marginBottom: 17 }, dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#CDD3CE' }, dotActive: { width: 22, backgroundColor: colors.green }, back: { textAlign: 'center', color: colors.green, fontSize: 11, fontWeight: '800', padding: 11 },
});
