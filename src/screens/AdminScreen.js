import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { collection, doc, onSnapshot, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { EmptyState } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase/config';
import { colors } from '../theme';

function labelForRole(role) {
  return role === 'business' ? 'Business' : role === 'alumni' ? 'Alumni' : 'Member';
}

export default function AdminScreen() {
  const { user } = useAuth();
  const [userRequests, setUserRequests] = useState([]);
  const [opportunityRequests, setOpportunityRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db || !user || user.role !== 'admin') return undefined;

    const userQuery = query(
      collection(db, 'users'),
      where('role', 'in', ['business', 'alumni']),
      where('status', '==', 'pending'),
    );

    const opportunityQuery = query(
      collection(db, 'opportunities'),
      where('status', '==', 'pending'),
    );

    const unsubscribeUsers = onSnapshot(
      userQuery,
      snapshot => {
        const items = snapshot.docs
          .map(docSnap => ({ id: docSnap.id, ...docSnap.data() }))
          .sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));
        setUserRequests(items);
        setLoading(false);
      },
      () => setLoading(false),
    );

    const unsubscribeOpportunities = onSnapshot(
      opportunityQuery,
      snapshot => {
        const items = snapshot.docs
          .map(docSnap => ({ id: docSnap.id, ...docSnap.data() }))
          .sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));
        setOpportunityRequests(items);
        setLoading(false);
      },
      () => setLoading(false),
    );

    return () => {
      unsubscribeUsers();
      unsubscribeOpportunities();
    };
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

  if (!user || user.role !== 'admin') return null;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>ADMIN REVIEW</Text>
            <Text style={styles.title}>Verification queue</Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.loading}><ActivityIndicator color={colors.green} size="small" /></View>
        ) : (
          <View style={styles.list}>
            {userRequests.length > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Pending member requests</Text>
                {userRequests.map(profile => (
                  <View key={profile.id} style={styles.card}>
                    <View style={styles.cardHeader}>
                      <View style={styles.avatarWrap}>
                        <Text style={styles.avatarText}>{(profile.firstName || profile.name || 'U').slice(0, 1).toUpperCase()}{(profile.lastName || '').slice(0, 1).toUpperCase() || ''}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.name}>{profile.name || `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || 'Pending member'}</Text>
                        <Text style={styles.meta}>{labelForRole(profile.role)} · {profile.email}</Text>
                      </View>
                      <View style={styles.badge}><Text style={styles.badgeText}>{profile.role}</Text></View>
                    </View>

                    <View style={styles.metaRow}>
                      <Ionicons name={profile.role === 'business' ? 'business-outline' : 'ribbon-outline'} size={16} color={colors.green} />
                      <Text style={styles.reference}>
                        {profile.verificationReference || 'No verification reference provided'}
                      </Text>
                    </View>

                    <View style={styles.actions}>
                      <Pressable onPress={() => handleDecision(profile.id, 'active')} style={styles.approve}>
                        <Text style={styles.approveText}>Approve</Text>
                      </Pressable>
                      <Pressable onPress={() => handleDecision(profile.id, 'rejected')} style={styles.reject}>
                        <Text style={styles.rejectText}>Reject</Text>
                      </Pressable>
                    </View>
                  </View>
                ))}
              </View>
            ) : null}

            {opportunityRequests.length > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Pending opportunities</Text>
                {opportunityRequests.map(opportunity => (
                  <View key={opportunity.id} style={styles.card}>
                    <View style={styles.cardHeader}>
                      <View style={styles.avatarWrap}>
                        <Text style={styles.avatarText}>{(opportunity.company || 'O').slice(0, 1).toUpperCase()}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.name}>{opportunity.title || 'Opportunity'}</Text>
                        <Text style={styles.meta}>{opportunity.company || 'Unspecified company'} · {opportunity.type || 'Role'}</Text>
                      </View>
                      <View style={styles.badge}><Text style={styles.badgeText}>OPP</Text></View>
                    </View>

                    <View style={styles.metaRow}>
                      <Ionicons name="briefcase-outline" size={16} color={colors.green} />
                      <Text style={styles.reference}>
                        {Array.isArray(opportunity.skills) ? opportunity.skills.join(', ') : 'No skills listed'}
                      </Text>
                    </View>

                    <View style={styles.actions}>
                      <Pressable onPress={() => handleOpportunityDecision(opportunity.id, 'approved')} style={styles.approve}>
                        <Text style={styles.approveText}>Approve</Text>
                      </Pressable>
                      <Pressable onPress={() => handleOpportunityDecision(opportunity.id, 'rejected')} style={styles.reject}>
                        <Text style={styles.rejectText}>Reject</Text>
                      </Pressable>
                    </View>
                  </View>
                ))}
              </View>
            ) : null}

            {userRequests.length === 0 && opportunityRequests.length === 0 ? (
              <View style={styles.panel}>
                <EmptyState icon="shield-checkmark-outline" title="No pending approvals" detail="New business, alumni, and opportunity review requests will appear here." />
              </View>
            ) : null}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  content: { padding: 18, paddingBottom: 120 },
  header: { paddingTop: 8, marginBottom: 18 },
  eyebrow: { color: colors.green, fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
  title: { color: colors.ink, fontSize: 27, fontWeight: '900', letterSpacing: -0.9, marginTop: 4 },
  loading: { paddingTop: 30, alignItems: 'center' },
  panel: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: 24, padding: 8 },
  list: { gap: 18 },
  section: { gap: 14 },
  sectionTitle: { color: colors.ink, fontSize: 15, fontWeight: '900', marginBottom: 4 },
  card: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: 22, padding: 16 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarWrap: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.mint, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.forest, fontSize: 14, fontWeight: '900' },
  name: { color: colors.ink, fontSize: 14, fontWeight: '900' },
  meta: { color: colors.muted, fontSize: 9, marginTop: 3 },
  badge: { borderRadius: 10, backgroundColor: colors.bluePale, paddingHorizontal: 8, paddingVertical: 5 },
  badgeText: { color: colors.blue, fontSize: 8, fontWeight: '900', textTransform: 'uppercase' },
  metaRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 12, backgroundColor: colors.cream, borderRadius: 12, padding: 10 },
  reference: { flex: 1, color: colors.muted, fontSize: 10, lineHeight: 16 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  approve: { flex: 1, backgroundColor: colors.forest, borderRadius: 14, paddingVertical: 12, alignItems: 'center' },
  approveText: { color: colors.white, fontSize: 12, fontWeight: '900' },
  reject: { flex: 1, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: 14, paddingVertical: 12, alignItems: 'center' },
  rejectText: { color: colors.ink, fontSize: 12, fontWeight: '900' },
});
