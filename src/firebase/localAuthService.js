import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { pbkdf2Async } from '@noble/hashes/pbkdf2.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils.js';
import { isInstitutionalEmail } from './authService';

const ACCOUNTS_KEY = '@studentnet/local-accounts-v1';
const SESSION_KEY = '@studentnet/local-session-v1';
let sessionMutationQueue = Promise.resolve();

function serializeSessionMutation(mutation) {
  const next = sessionMutationQueue.catch(() => {}).then(mutation);
  sessionMutationQueue = next;
  return next;
}

async function readAccounts() {
  const stored = await AsyncStorage.getItem(ACCOUNTS_KEY);
  if (!stored) return [];
  try {
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) {
      await AsyncStorage.removeItem(ACCOUNTS_KEY);
      return [];
    }
    return parsed;
  } catch {
    await AsyncStorage.removeItem(ACCOUNTS_KEY);
    return [];
  }
}

const KDF_VERSION = 2;
const KDF_ITERATIONS = 210000;

async function legacyHashPassword(password, salt) {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}:${password}`);
}

async function createPasswordKdf(password) {
  const salt = bytesToHex(Crypto.getRandomBytes(16));
  const hash = bytesToHex(await pbkdf2Async(sha256, utf8ToBytes(password), utf8ToBytes(salt), {
    c: KDF_ITERATIONS,
    dkLen: 32,
  }));
  return { version: KDF_VERSION, algorithm: 'PBKDF2-SHA256', iterations: KDF_ITERATIONS, salt, hash };
}

async function verifyPassword(password, account) {
  if (account.passwordKdf?.version === KDF_VERSION) {
    const kdf = account.passwordKdf;
    const hasValidParameters = typeof kdf.salt === 'string'
      && /^[0-9a-f]{32}$/.test(kdf.salt)
      && typeof kdf.hash === 'string'
      && /^[0-9a-f]{64}$/.test(kdf.hash)
      && Number.isInteger(kdf.iterations)
      && kdf.iterations >= KDF_ITERATIONS
      && kdf.iterations <= 1000000;
    if (!hasValidParameters) return false;
    const candidate = bytesToHex(await pbkdf2Async(sha256, utf8ToBytes(password), utf8ToBytes(kdf.salt), {
      c: kdf.iterations,
      dkLen: 32,
    }));
    if (candidate.length !== kdf.hash.length) return false;
    let difference = 0;
    for (let index = 0; index < candidate.length; index += 1) {
      difference |= candidate.charCodeAt(index) ^ kdf.hash.charCodeAt(index);
    }
    return difference === 0;
  }
  if (account.passwordSalt && account.passwordHash) {
    return await legacyHashPassword(password, account.passwordSalt) === account.passwordHash;
  }
  return false;
}

function publicProfile(account) {
  const profile = { ...account };
  delete profile.passwordHash;
  delete profile.passwordSalt;
  delete profile.passwordKdf;
  return profile;
}

export async function registerLocalUser({ email, password, firstName, lastName, role, verificationReference }) {
  const normalEmail = email.trim().toLowerCase();
  if (!firstName.trim() || !lastName.trim()) throw new Error('Enter your first and last name.');
  if (!normalEmail.includes('@')) throw new Error('Enter a valid email address.');
  if (password.length < 8) throw new Error('Use a password with at least 8 characters.');
  if (role === 'admin') throw new Error('Administrators are provisioned by authorised staff and cannot self-register.');
  if (role === 'student' && !isInstitutionalEmail(normalEmail)) {
    throw new Error('Students must use a Richfield or AAA institutional email address.');
  }
  if (role === 'alumni' && !verificationReference?.trim()) {
    throw new Error('Please provide your student number or graduation reference.');
  }
  if (role === 'business' && !verificationReference?.trim()) {
    throw new Error('Please provide a company website or registration number.');
  }

  const accounts = await readAccounts();
  if (accounts.some(account => account.email === normalEmail)) throw new Error('An account already exists for this email address.');

  const passwordKdf = await createPasswordKdf(password);
  const name = `${firstName.trim()} ${lastName.trim()}`;
  const account = {
    id: `local-${Crypto.randomUUID()}`,
    email: normalEmail,
    passwordKdf,
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    name,
    initials: `${firstName[0] || ''}${lastName[0] || ''}`.toUpperCase(),
    role,
    status: 'active',
    verified: true,
    verificationReference: verificationReference?.trim() || null,
    headline: role === 'business' ? 'Verified employer' : role === 'alumni' ? 'Richfield alumni professional' : 'Richfield student',
    programme: role === 'business' ? 'Graduate talent partner' : 'Complete your programme',
    campus: 'Richfield community',
    year: role === 'alumni' ? 'Alumni' : role === 'business' ? 'Employer' : 'Student',
    completion: 32,
    skills: [],
    createdAt: new Date().toISOString(),
  };
  await AsyncStorage.setItem(ACCOUNTS_KEY, JSON.stringify([...accounts, account]));
  return { status: 'active', local: true };
}

export async function signInLocalUser(email, password, isCurrent = () => true) {
  const normalEmail = email.trim().toLowerCase();
  const accounts = await readAccounts();
  const accountIndex = accounts.findIndex(item => item.email === normalEmail);
  const account = accounts[accountIndex];
  if (!account || !await verifyPassword(password, account)) {
    throw new Error('Email or password is incorrect.');
  }
  if (account.status === 'suspended') throw new Error('This account is suspended. Contact StudentNet support.');
  if (account.passwordKdf?.version !== KDF_VERSION) {
    account.passwordKdf = await createPasswordKdf(password);
    delete account.passwordHash;
    delete account.passwordSalt;
    accounts[accountIndex] = account;
    await AsyncStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
  }
  const persisted = await serializeSessionMutation(async () => {
    if (!isCurrent()) return false;
    await AsyncStorage.setItem(SESSION_KEY, account.id);
    return true;
  });
  if (!persisted) throw new Error('Sign-in was cancelled.');
  return publicProfile(account);
}

export async function restoreLocalSession() {
  const accountId = await AsyncStorage.getItem(SESSION_KEY);
  if (!accountId) return null;
  const accounts = await readAccounts();
  const account = accounts.find(item => item.id === accountId);
  if (!account || account.status === 'suspended') {
    await AsyncStorage.removeItem(SESSION_KEY);
    return null;
  }
  return publicProfile(account);
}

export async function signOutLocalUser() {
  await serializeSessionMutation(() => AsyncStorage.removeItem(SESSION_KEY));
}
