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

function assertFirebase() {
  if (!auth || !db) throw new Error('Firebase is not configured. Add the EXPO_PUBLIC_FIREBASE_* values to .env.');
}

export function isInstitutionalEmail(email) {
  const domain = email.trim().toLowerCase().split('@')[1];
  return STUDENT_DOMAINS.includes(domain);
}

export async function signInUser(email, password) {
  assertFirebase();
  const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
  const profile = await getDoc(doc(db, 'users', credential.user.uid));
  if (!profile.exists()) {
    await signOut(auth);
    throw new Error('Your account profile is missing. Contact StudentNet support.');
  }
  if (profile.data().status === 'suspended') {
    await signOut(auth);
    throw new Error('This account is suspended. Contact StudentNet support.');
  }
  if (profile.data().role === 'student' && profile.data().status === 'pending') {
    await reload(credential.user);
    if (!credential.user.emailVerified) {
      await signOut(auth);
      throw new Error('Verify your institutional email address before signing in.');
    }
    await credential.user.getIdToken(true);
    await setDoc(doc(db, 'users', credential.user.uid), { status: 'active', verified: true, updatedAt: serverTimestamp() }, { merge: true });
    return credential.user;
  }
  if (['alumni', 'business'].includes(profile.data().role) && profile.data().status !== 'active') {
    await signOut(auth);
    throw new Error('Your verification is still pending. We will notify you when access is approved.');
  }
  return credential.user;
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
  await setDoc(doc(db, 'users', credential.user.uid), {
    id: credential.user.uid,
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
  });
  if (role === 'student') await sendEmailVerification(credential.user);
  await signOut(auth);
  return { status };
}

export async function resetPassword(email) {
  assertFirebase();
  return sendPasswordResetEmail(auth, email.trim());
}

export async function signOutUser() {
  if (auth) await signOut(auth);
}
