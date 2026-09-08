import React, { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme';
import { PrimaryButton } from '../components/ui';

const roles = [
  { id: 'student', label: 'Student', icon: 'school-outline' },
  { id: 'alumni', label: 'Alumni', icon: 'ribbon-outline' },
  { id: 'business', label: 'Business', icon: 'business-outline' },
  { id: 'admin', label: 'Admin', icon: 'shield-checkmark-outline' },
];

export default function AuthScreen() {
  const { signIn, register, enterDemo, configured } = useAuth();
  const [mode, setMode] = useState('welcome');
  const [role, setRole] = useState('student');
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', verificationReference: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const setField = (key, value) => setForm(current => ({ ...current, [key]: value }));

  async function submit() {
    setError('');
    setBusy(true);
    try {
      if (mode === 'login') await signIn(form.email, form.password);
      else {
        const result = await register({ ...form, role });
        if (result.status === 'pending') setError('Account created. Check your email or wait for identity verification before signing in.');
        setMode('login');
      }
    } catch (submissionError) {
      setError(submissionError.message.replace('Firebase: ', '').replace(/\s*\(auth\/.*\)\.?$/, ''));
    } finally {
      setBusy(false);
    }
  }

  if (mode === 'welcome') {
    return (
      <View style={styles.welcomePage}>
        <LinearGradient colors={['#0B3328', '#164D3C', '#286D50']} style={StyleSheet.absoluteFill} />
        <SafeAreaView style={styles.welcomeSafe}>
          <View style={styles.brandRow}>
            <View style={styles.brandMark}><Ionicons name="people" size={19} color={colors.forest} /></View>
            <Text style={styles.brandWhite}>StudentNet</Text>
            <View style={styles.trustedPill}><Ionicons name="shield-checkmark" size={12} color={colors.lime} /><Text style={styles.trustedText}>Trusted community</Text></View>
          </View>
          <View style={styles.heroVisual}>
            <View style={[styles.orbit, styles.orbitOne]} />
            <View style={[styles.orbit, styles.orbitTwo]} />
            <View style={styles.heroCard}>
              <View style={styles.heroAvatar}><Text style={styles.heroInitials}>TM</Text></View>
              <View style={styles.heroLines}><View style={styles.heroLineWide} /><View style={styles.heroLineShort} /></View>
              <View style={styles.heroMatch}><Ionicons name="sparkles" size={14} color={colors.forest} /><Text style={styles.heroMatchText}>94% match</Text></View>
            </View>
            <View style={[styles.floatIcon, styles.floatIconTop]}><Ionicons name="briefcase" size={22} color={colors.blue} /></View>
            <View style={[styles.floatIcon, styles.floatIconBottom]}><Ionicons name="chatbubbles" size={22} color={colors.coral} /></View>
            <View style={[styles.floatPerson, styles.floatPersonLeft]}><Text style={styles.floatPersonText}>LN</Text></View>
            <View style={[styles.floatPerson, styles.floatPersonRight]}><Text style={styles.floatPersonText}>AK</Text></View>
          </View>
          <View style={styles.welcomeCopy}>
            <Text style={styles.eyebrow}>YOUR CAREER COMMUNITY</Text>
            <Text style={styles.heroTitle}>Where ambition{`\n`}meets opportunity.</Text>
            <Text style={styles.heroBody}>Build a portfolio that speaks for you. Meet mentors, discover careers, and find your next opportunity.</Text>
          </View>
          <View style={styles.welcomeActions}>
            <Pressable style={styles.lightButton} onPress={() => setMode('register')}>
              <Text style={styles.lightButtonText}>Create your profile</Text><Ionicons name="arrow-forward" size={19} color={colors.forest} />
            </Pressable>
            <Pressable style={styles.ghostButton} onPress={() => setMode('login')}><Text style={styles.ghostButtonText}>I already have an account</Text></Pressable>
            <Pressable onPress={() => enterDemo('student')} style={styles.previewLink}>
              <Ionicons name="play-circle-outline" size={17} color={colors.lime} /><Text style={styles.previewLinkText}>Explore the interactive preview</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  const isRegister = mode === 'register';
  return (
    <SafeAreaView style={styles.formPage}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.formScroll} keyboardShouldPersistTaps="handled">
          <View style={styles.formTop}>
            <Pressable onPress={() => { setMode('welcome'); setError(''); }} style={styles.back}><Ionicons name="arrow-back" size={22} color={colors.ink} /></Pressable>
            <View style={styles.smallBrand}><Ionicons name="people" size={18} color={colors.white} /></View>
          </View>
          <Text style={styles.formTitle}>{isRegister ? 'Start your story.' : 'Welcome back.'}</Text>
          <Text style={styles.formSubtitle}>{isRegister ? 'Create a verified profile for the Richfield community.' : 'Sign in to continue building your future.'}</Text>

          {isRegister ? (
            <>
              <Text style={styles.label}>I am joining as</Text>
              <View style={styles.roleGrid}>
                {roles.filter(item => item.id !== 'admin').map(item => (
                  <Pressable key={item.id} onPress={() => setRole(item.id)} style={[styles.roleCard, role === item.id && styles.roleCardActive]}>
                    <Ionicons name={item.icon} size={20} color={role === item.id ? colors.white : colors.green} />
                    <Text style={[styles.roleLabel, role === item.id && styles.roleLabelActive]}>{item.label}</Text>
                  </Pressable>
                ))}
              </View>
              <View style={styles.nameRow}>
                <Field label="First name" value={form.firstName} onChangeText={value => setField('firstName', value)} style={{ flex: 1 }} />
                <Field label="Last name" value={form.lastName} onChangeText={value => setField('lastName', value)} style={{ flex: 1 }} />
              </View>
            </>
          ) : null}
          <Field label="Email address" value={form.email} onChangeText={value => setField('email', value)} keyboardType="email-address" autoCapitalize="none" icon="mail-outline" placeholder={role === 'student' ? 'name@my.richfield.ac.za' : 'you@example.com'} />
          <Field label="Password" value={form.password} onChangeText={value => setField('password', value)} secureTextEntry icon="lock-closed-outline" placeholder="At least 8 characters" />
          {isRegister && role !== 'student' ? (
            <Field
              label={role === 'alumni' ? 'Student or graduation number' : 'Company website or registration number'}
              value={form.verificationReference}
              onChangeText={value => setField('verificationReference', value)}
              icon="shield-checkmark-outline"
              placeholder="Used only for verification"
            />
          ) : null}
          {!configured ? <View style={styles.configNote}><Ionicons name="information-circle" size={18} color={colors.blue} /><Text style={styles.configText}>Authentication activates when Firebase values are added to .env. The interactive preview is available now.</Text></View> : null}
          {error ? <View style={[styles.errorBox, error.startsWith('Account created') && styles.successBox]}><Text style={styles.errorText}>{error}</Text></View> : null}
          <PrimaryButton onPress={submit} disabled={busy || !configured} icon={busy ? undefined : 'arrow-forward'}>
            {busy ? <ActivityIndicator color={colors.white} /> : (isRegister ? 'Create verified account' : 'Sign in securely')}
          </PrimaryButton>
          <View style={styles.switchRow}>
            <Text style={styles.switchCopy}>{isRegister ? 'Already part of StudentNet?' : 'New to the community?'}</Text>
            <Pressable onPress={() => { setMode(isRegister ? 'login' : 'register'); setError(''); }}><Text style={styles.switchAction}>{isRegister ? ' Sign in' : ' Create profile'}</Text></Pressable>
          </View>

          <View style={styles.previewBox}>
            <Text style={styles.previewTitle}>Preview every role</Text>
            <Text style={styles.previewCopy}>Explore role-specific experiences without creating placeholder credentials.</Text>
            <View style={styles.previewRoles}>
              {roles.map(item => <Pressable key={item.id} onPress={() => enterDemo(item.id)} style={styles.previewRole}><Ionicons name={item.icon} size={18} color={colors.green} /><Text style={styles.previewRoleText}>{item.label}</Text></Pressable>)}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({ label, icon, style, ...inputProps }) {
  return (
    <View style={style}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputWrap}>
        {icon ? <Ionicons name={icon} size={18} color={colors.subtle} /> : null}
        <TextInput placeholderTextColor={colors.subtle} style={styles.input} {...inputProps} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  welcomePage: { flex: 1, backgroundColor: colors.forest },
  welcomeSafe: { flex: 1, paddingHorizontal: 24 },
  brandRow: { flexDirection: 'row', alignItems: 'center', paddingTop: 10 },
  brandMark: { width: 35, height: 35, borderRadius: 12, backgroundColor: colors.lime, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  brandWhite: { color: colors.white, fontSize: 20, fontWeight: '900', letterSpacing: -0.6 },
  trustedPill: { marginLeft: 'auto', flexDirection: 'row', gap: 5, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 7 },
  trustedText: { color: '#DDEBE5', fontSize: 10, fontWeight: '700' },
  heroVisual: { height: 235, marginTop: 18, alignItems: 'center', justifyContent: 'center' },
  orbit: { position: 'absolute', borderWidth: 1, borderColor: 'rgba(201,242,123,0.2)', borderRadius: 999 },
  orbitOne: { width: 245, height: 170, transform: [{ rotate: '-12deg' }] },
  orbitTwo: { width: 285, height: 125, transform: [{ rotate: '17deg' }] },
  heroCard: { width: 235, height: 94, borderRadius: 24, padding: 16, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.96)', transform: [{ rotate: '-2deg' }] },
  heroAvatar: { width: 52, height: 52, borderRadius: 18, backgroundColor: '#DDE8FF', alignItems: 'center', justifyContent: 'center' },
  heroInitials: { color: colors.ink, fontWeight: '900', fontSize: 16 },
  heroLines: { flex: 1, marginLeft: 13, gap: 8 },
  heroLineWide: { width: '88%', height: 9, borderRadius: 5, backgroundColor: '#DCE2DE' },
  heroLineShort: { width: '60%', height: 7, borderRadius: 4, backgroundColor: '#EDF0EC' },
  heroMatch: { position: 'absolute', right: 13, bottom: 10, paddingHorizontal: 9, paddingVertical: 6, borderRadius: 10, backgroundColor: colors.lime, flexDirection: 'row', gap: 5 },
  heroMatchText: { color: colors.forest, fontSize: 10, fontWeight: '900' },
  floatIcon: { position: 'absolute', width: 47, height: 47, borderRadius: 17, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  floatIconTop: { top: 25, right: 34, transform: [{ rotate: '8deg' }] },
  floatIconBottom: { bottom: 22, left: 30, transform: [{ rotate: '-8deg' }] },
  floatPerson: { position: 'absolute', width: 43, height: 43, borderRadius: 22, borderWidth: 3, borderColor: colors.green, alignItems: 'center', justifyContent: 'center' },
  floatPersonLeft: { left: 2, top: 54, backgroundColor: '#FCE5DC' },
  floatPersonRight: { right: 3, bottom: 42, backgroundColor: '#DBF0E7' },
  floatPersonText: { fontSize: 11, color: colors.ink, fontWeight: '900' },
  welcomeCopy: { marginTop: 4 },
  eyebrow: { color: colors.lime, fontSize: 11, fontWeight: '900', letterSpacing: 2, marginBottom: 10 },
  heroTitle: { color: colors.white, fontSize: 40, lineHeight: 44, fontWeight: '900', letterSpacing: -1.5 },
  heroBody: { color: '#C7D8D1', fontSize: 14, lineHeight: 21, marginTop: 13, maxWidth: 350 },
  welcomeActions: { marginTop: 'auto', paddingBottom: 16 },
  lightButton: { height: 55, borderRadius: 18, paddingHorizontal: 20, backgroundColor: colors.white, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  lightButtonText: { color: colors.forest, fontWeight: '900', fontSize: 15 },
  ghostButton: { height: 47, alignItems: 'center', justifyContent: 'center' },
  ghostButtonText: { color: colors.white, fontSize: 14, fontWeight: '700' },
  previewLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  previewLinkText: { color: colors.lime, fontSize: 12, fontWeight: '800' },
  formPage: { flex: 1, backgroundColor: colors.cream },
  formScroll: { padding: 24, paddingBottom: 50 },
  formTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 26 },
  back: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  smallBrand: { width: 39, height: 39, borderRadius: 13, backgroundColor: colors.forest, alignItems: 'center', justifyContent: 'center' },
  formTitle: { color: colors.ink, fontSize: 35, fontWeight: '900', letterSpacing: -1.3 },
  formSubtitle: { color: colors.muted, fontSize: 14, lineHeight: 21, marginTop: 8, marginBottom: 25 },
  label: { color: colors.ink, fontSize: 12, fontWeight: '800', marginBottom: 8, marginTop: 14 },
  roleGrid: { flexDirection: 'row', gap: 8 },
  roleCard: { flex: 1, minHeight: 67, borderRadius: 17, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center', gap: 5 },
  roleCardActive: { backgroundColor: colors.forest, borderColor: colors.forest },
  roleLabel: { color: colors.muted, fontWeight: '800', fontSize: 11 },
  roleLabelActive: { color: colors.white },
  nameRow: { flexDirection: 'row', gap: 12 },
  inputWrap: { height: 53, borderWidth: 1, borderColor: colors.line, borderRadius: 16, backgroundColor: colors.white, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 10 },
  input: { flex: 1, height: '100%', color: colors.ink, fontSize: 14 },
  configNote: { flexDirection: 'row', gap: 9, backgroundColor: colors.bluePale, borderRadius: 14, padding: 13, marginTop: 18 },
  configText: { flex: 1, color: '#415184', fontSize: 11, lineHeight: 16 },
  errorBox: { backgroundColor: colors.coralPale, borderRadius: 13, padding: 12, marginTop: 14 },
  successBox: { backgroundColor: colors.mint },
  errorText: { color: colors.ink, fontSize: 12, lineHeight: 17 },
  switchRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  switchCopy: { color: colors.muted, fontSize: 12 },
  switchAction: { color: colors.green, fontSize: 12, fontWeight: '900' },
  previewBox: { backgroundColor: colors.white, borderRadius: 22, borderWidth: 1, borderColor: colors.line, padding: 17, marginTop: 28 },
  previewTitle: { color: colors.ink, fontWeight: '900', fontSize: 15 },
  previewCopy: { color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 4 },
  previewRoles: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 13 },
  previewRole: { width: '48%', flexDirection: 'row', gap: 7, padding: 10, backgroundColor: colors.cream, borderRadius: 12, alignItems: 'center' },
  previewRoleText: { color: colors.ink, fontSize: 11, fontWeight: '800' },
});
