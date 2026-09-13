import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db, isFirebaseConfigured } from '../firebase/config';
import { getAuthErrorMessage, normalizeUserProfile, registerUser, resetPassword, signInUser, signOutUser } from '../firebase/authService';
import { demoUsers } from '../data/demoData';
import { registerPushToken } from '../firebase/notificationService';

const AuthContext = createContext(null);
const isLocalAuthEnabled = process.env.NODE_ENV !== 'production' && process.env.EXPO_PUBLIC_ENABLE_LOCAL_AUTH === 'true';
const loadLocalAuth = () => import('../firebase/localAuthService');

export function AuthProvider({ children }) {
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [firebaseSessionReady, setFirebaseSessionReady] = useState(false);
  const [localProfile, setLocalProfile] = useState(null);
  const [demoRole, setDemoRole] = useState(null);
  const [loading, setLoading] = useState(isFirebaseConfigured || isLocalAuthEnabled);
  const [authError, setAuthError] = useState('');
  const firebaseSignInInProgress = useRef(false);
  const localAuthOperation = useRef(0);

  useEffect(() => {
    if (!auth || !db) return undefined;
    let stopProfile;
    const stopAuth = onAuthStateChanged(auth, user => {
      setFirebaseUser(user);
      stopProfile?.();
      if (!user) {
        setProfile(null);
        setFirebaseSessionReady(false);
        setLoading(false);
        return;
      }
      setProfile(null);
      setFirebaseSessionReady(false);
      stopProfile = onSnapshot(doc(db, 'users', user.uid), snap => {
        const nextProfile = snap.exists() ? normalizeUserProfile(snap.id, snap.data()) : null;
        setProfile(nextProfile);
        if (nextProfile?.status === 'active' && !firebaseSignInInProgress.current) {
          setFirebaseSessionReady(true);
        }
        setAuthError('');
        setLoading(false);
      }, error => {
        setProfile(null);
        setFirebaseSessionReady(false);
        setAuthError(getAuthErrorMessage(error));
        setLoading(false);
        signOutUser().catch(() => {});
      });
    });
    return () => { stopProfile?.(); stopAuth(); };
  }, []);

  useEffect(() => {
    if (isFirebaseConfigured || !isLocalAuthEnabled) {
      return undefined;
    }
    let active = true;
    const operation = ++localAuthOperation.current;
    loadLocalAuth()
      .then(({ restoreLocalSession }) => restoreLocalSession())
      .then(session => { if (active && operation === localAuthOperation.current) setLocalProfile(session); })
      .catch(error => { if (active && operation === localAuthOperation.current) setAuthError(error.message || 'Local account storage is unavailable.'); })
      .finally(() => { if (active && operation === localAuthOperation.current) setLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (profile?.id && profile.status === 'active' && !demoRole) {
      registerPushToken(profile.id).catch(() => {});
    }
  }, [demoRole, profile?.id, profile?.status]);

  // Firebase emits auth/profile events before signInUser finishes its checks.
  // Wait for both an active profile and a validated session before navigating.
  const activeFirebaseProfile = profile?.status === 'active' ? profile : null;
  const user = demoRole ? demoUsers[demoRole] : localProfile || (firebaseSessionReady ? activeFirebaseProfile : null);
  const value = useMemo(() => ({
    user,
    firebaseUser,
    loading,
    isDemo: Boolean(demoRole || localProfile),
    configured: isFirebaseConfigured,
    authMode: isFirebaseConfigured ? 'firebase' : isLocalAuthEnabled ? 'local' : 'unavailable',
    authError,
    enterDemo: role => setDemoRole(role),
    changeDemoRole: role => setDemoRole(role),
    signIn: async (email, password) => {
      if (isFirebaseConfigured) {
        firebaseSignInInProgress.current = true;
        setFirebaseSessionReady(false);
        try {
          const result = await signInUser(email, password);
          setFirebaseSessionReady(true);
          return result;
        } finally {
          firebaseSignInInProgress.current = false;
        }
      }
      if (isLocalAuthEnabled) {
        const operation = ++localAuthOperation.current;
        const { signInLocalUser } = await loadLocalAuth();
        const session = await signInLocalUser(email, password, () => operation === localAuthOperation.current);
        if (operation === localAuthOperation.current) {
          setAuthError('');
          setLocalProfile(session);
        }
        return session;
      }
      throw new Error('Authentication is not configured. Add Firebase values or explicitly enable local authentication for development.');
    },
    register: async details => {
      if (isFirebaseConfigured) return registerUser(details);
      if (isLocalAuthEnabled) {
        const { registerLocalUser } = await loadLocalAuth();
        const result = await registerLocalUser(details);
        setAuthError('');
        return result;
      }
      throw new Error('Authentication is not configured. Add Firebase values or explicitly enable local authentication for development.');
    },
    requestPasswordReset: async email => {
      if (isFirebaseConfigured) return resetPassword(email);
      if (isLocalAuthEnabled) throw new Error('Password recovery is only available for Firebase accounts. Create a new device-only preview account instead.');
      throw new Error('Authentication is not configured. Add the Firebase values before requesting a password reset.');
    },
    signOut: async () => {
      const operation = ++localAuthOperation.current;
      setDemoRole(null);
      if (isFirebaseConfigured) {
        setLocalProfile(null);
        await signOutUser();
      } else if (isLocalAuthEnabled) {
        const { signOutLocalUser } = await loadLocalAuth();
        await signOutLocalUser();
        if (operation === localAuthOperation.current) setLocalProfile(null);
      } else {
        setLocalProfile(null);
      }
    },
  }), [authError, demoRole, firebaseUser, loading, localProfile, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
