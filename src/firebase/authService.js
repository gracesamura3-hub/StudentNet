import {
  createUserWithEmailAndPassword,
  reload,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from './config';

const STUDENT_DOMAINS = ['my.richfield.ac.za', 'richfield.ac.za', 'my.aaa.ac.za', 'aaa.ac.za'];
const PROFILE_DEFAULTS = {
  student: {
    headline: 'Richfield student',
    programme: 'Complete your programme',
    campus: 'Richfield community',
    year: 'Student',
  },
  alumni: {
    headline: 'Richfield alumni professional',
    programme: 'Complete your qualification',
    campus: 'Richfield community',
    year: 'Alumni',
  },
  business: {
    headline: 'Verified employer',
    programme: 'Graduate talent partner',
    campus: 'South Africa',
    year: 'Employer',
  },
  admin: {
    headline: 'Richfield Community Administrator',
    programme: 'Richfield Student Success',
    campus: 'National Office',
    year: 'Staff account',
  },
};

function assertFirebase() {
  if (!auth || !db) throw new Error('Firebase is not configured. Add the EXPO_PUBLIC_FIREBASE_* values to .env.');
}

export function isInstitutionalEmail(email) {
  const domain = email.trim().toLowerCase().split('@')[1];
  return STUDENT_DOMAINS.includes(domain);
}

export function normalizeUserProfile(id, profile = {}) {
  const role = profile.role || 'student';
  const emailName = profile.email?.split('@')[0]?.replace(/[._-]+/g, ' ') || '';
  const suppliedName = profile.name || `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || emailName;
  const nameParts = suppliedName.split(/\s+/).filter(Boolean);
  const firstName = profile.firstName || nameParts[0] || 'Richfield';
  const lastName = profile.lastName || nameParts.slice(1).join(' ') || 'User';
  const name = profile.name || `${firstName} ${lastName}`;
  const defaults = PROFILE_DEFAULTS[role] || PROFILE_DEFAULTS.student;

  return {
    email: profile.email || '',
    ...defaults,
    completion: 20,
    ...profile,
    id,
    firstName,
    lastName,
    name,
    initials: profile.initials || `${firstName[0] || ''}${lastName[0] || ''}`.toUpperCase(),
    role,
    skills: Array.isArray(profile.skills) ? profile.skills : [],
    connectionIds: Array.isArray(profile.connectionIds) ? profile.connectionIds : [],
  };
}

async function createInstitutionalStudentProfile(user) {
  if (!user.email || !isInstitutionalEmail(user.email)) {
    throw new Error('Your account profile is missing. Use Create your profile so StudentNet can verify your role.');
  }
  const profile = normalizeUserProfile(user.uid, {
    email: user.email,
    name: user.displayName || undefined,
    role: 'student',
    status: 'pending',
    verified: false,
    verificationReference: null,
    visibility: { public: ['name', 'headline', 'skills'], business: ['name', 'headline', 'skills', 'portfolio'] },
  });
  await setDoc(doc(db, 'users', user.uid), {
    ...profile,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return profile;
}

export function getAuthErrorMessage(error) {
  const messages = {
    'auth/email-already-in-use': 'An account already exists for this email address. Sign in or reset your password.',
    'auth/invalid-credential': 'Email or password is incorrect.',
    'auth/invalid-email': 'Enter a valid email address.',
    'auth/missing-password': 'Enter your password.',
    'auth/network-request-failed': 'Unable to reach Firebase. Check your connection and try again.',
    'auth/operation-not-allowed': 'Email/password sign-in is not enabled for this Firebase project.',
    'auth/too-many-requests': 'Too many attempts. Wait a few minutes or reset your password.',
    'auth/unauthorized-domain': 'This web address is not authorised in Firebase Authentication settings.',
    'auth/user-disabled': 'This account has been disabled. Contact StudentNet support.',
    'auth/user-not-found': 'Email or password is incorrect.',
    'auth/weak-password': 'Use a stronger password with at least 8 characters.',
    'permission-denied': 'Firebase denied access. Deploy the repository Firestore rules to this project.',
  };
  if (messages[error?.code]) return messages[error.code];
  if (error?.message && !error.message.startsWith('Firebase:')) return error.message;
  return 'Authentication failed. Check the Firebase setup and try again.';
}

export async function signInUser(email, password) {
  assertFirebase();
  const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
  try {
    const profile = await getDoc(doc(db, 'users', credential.user.uid));
    const createdProfile = !profile.exists();
    const profileData = createdProfile
      ? await createInstitutionalStudentProfile(credential.user)
      : profile.data();
    if (profileData.status === 'suspended') {
      throw new Error('This account is suspended. Contact StudentNet support.');
    }
    if (profileData.role === 'student' && profileData.status === 'pending') {
      await reload(credential.user);
      if (!credential.user.emailVerified) {
        if (createdProfile) await sendEmailVerification(credential.user);
        throw new Error(createdProfile
          ? 'StudentNet created your profile and sent a verification email. Open that link, then sign in again.'
          : 'Verify your institutional email address before signing in.');
      }
      await credential.user.getIdToken(true);
      await setDoc(doc(db, 'users', credential.user.uid), { status: 'active', verified: true, updatedAt: serverTimestamp() }, { merge: true });
      return credential.user;
    }
    if (['alumni', 'business'].includes(profileData.role) && profileData.status !== 'active') {
      throw new Error('Your verification is still pending. We will notify you when access is approved.');
    }
    if (profileData.status !== 'active') {
      throw new Error('Your account is not active yet. Contact StudentNet support.');
    }
    return credential.user;
  } catch (error) {
    await signOut(auth).catch(() => {});
    throw error;
  }
}

export async function registerUser({ email, password, firstName, lastName, role, verificationReference }) {
  assertFirebase();
  if (role === 'admin') throw new Error('Administrator accounts are provisioned by authorised staff only.');
  if (role === 'student' && !isInstitutionalEmail(email)) {
    throw new Error('Students must use a Richfield or AAA institutional email address.');
  }
  if (role === 'alumni' && !verificationReference?.trim()) {
    throw new Error('Please provide your student number or graduation reference for verification.');
  }
  if (role === 'business' && !verificationReference?.trim()) {
    throw new Error('Please provide a company website or registration number for verification.');
  }

  const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
  const name = `${firstName.trim()} ${lastName.trim()}`;
  await updateProfile(credential.user, { displayName: name });
  const status = 'pending';
  await setDoc(doc(db, 'users', credential.user.uid), normalizeUserProfile(credential.user.uid, {
    email: email.trim().toLowerCase(),
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    name,
    initials: `${firstName[0] || ''}${lastName[0] || ''}`.toUpperCase(),
    role,
    status,
    verified: false,
    verificationReference: verificationReference?.trim() || null,
    visibility: { public: ['name', 'headline', 'skills'], business: ['name', 'headline', 'skills', 'portfolio'] },
    completion: 20,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }));
  if (role === 'student') await sendEmailVerification(credential.user);
  await signOut(auth);
  return { status };
}

export async function resetPassword(email) {
  assertFirebase();
  if (!email.trim()) throw new Error('Enter your email address first.');
  return sendPasswordResetEmail(auth, email.trim());
}

export async function signOutUser() {
  if (auth) await signOut(auth);
}
