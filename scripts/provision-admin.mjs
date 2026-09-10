import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';

const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;
const projectId = process.env.FIREBASE_PROJECT_ID;

if (!email || !projectId) {
  throw new Error('Set FIREBASE_PROJECT_ID and ADMIN_EMAIL before running this command.');
}

if (!getApps().length) initializeApp({ credential: applicationDefault(), projectId });

const adminAuth = getAuth();
let account;
try {
  account = await adminAuth.getUserByEmail(email);
} catch (error) {
  if (error.code !== 'auth/user-not-found') throw error;
  if (!password || password.length < 12) {
    throw new Error('New administrators require ADMIN_PASSWORD with at least 12 characters.');
  }
  account = await adminAuth.createUser({ email, password, emailVerified: true, disabled: false });
}

await adminAuth.setCustomUserClaims(account.uid, { ...(account.customClaims || {}), admin: true });
const displayName = account.displayName || email.split('@')[0].replace(/[._-]+/g, ' ');
const names = displayName.split(' ').filter(Boolean);
await getFirestore().collection('users').doc(account.uid).set({
  id: account.uid,
  email,
  firstName: names[0] || 'Richfield',
  lastName: names.slice(1).join(' ') || 'Administrator',
  name: displayName,
  initials: names.slice(0, 2).map(name => name[0]).join('').toUpperCase() || 'RA',
  role: 'admin',
  status: 'active',
  verified: true,
  headline: 'Richfield Community Administrator',
  visibility: { public: [], business: [] },
  completion: 100,
  updatedAt: FieldValue.serverTimestamp(),
}, { merge: true });

console.log(`Administrator access provisioned for ${email}.`);
