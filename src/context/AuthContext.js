import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db, isFirebaseConfigured } from '../firebase/config';
import { registerUser, signInUser, signOutUser } from '../firebase/authService';
import { demoUsers } from '../data/demoData';
import { registerPushToken } from '../firebase/notificationService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [demoRole, setDemoRole] = useState(null);
  const [loading, setLoading] = useState(isFirebaseConfigured);

  useEffect(() => {
    if (!auth || !db) return undefined;
    let stopProfile;
    const stopAuth = onAuthStateChanged(auth, user => {
      setFirebaseUser(user);
      stopProfile?.();
      if (!user) {
        setProfile(null);
        setLoading(false);
        return;
      }
      stopProfile = onSnapshot(doc(db, 'users', user.uid), snap => {
        setProfile(snap.exists() ? { id: snap.id, ...snap.data() } : null);
        setLoading(false);
      }, () => setLoading(false));
    });
    return () => { stopProfile?.(); stopAuth(); };
  }, []);

  useEffect(() => {
    if (profile?.id && profile.status === 'active' && !demoRole) {
      registerPushToken(profile.id).catch(() => {});
    }
  }, [demoRole, profile?.id, profile?.status]);

  const user = demoRole ? demoUsers[demoRole] : profile;
  const value = useMemo(() => ({
    user,
    firebaseUser,
    loading,
    isDemo: Boolean(demoRole),
    configured: isFirebaseConfigured,
    enterDemo: role => setDemoRole(role),
    changeDemoRole: role => setDemoRole(role),
    signIn: signInUser,
    register: registerUser,
    signOut: async () => { setDemoRole(null); await signOutUser(); },
  }), [demoRole, firebaseUser, loading, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
