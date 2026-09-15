import {
  addDoc,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { auth, db, storage } from './config';

function requireDb() {
  if (!db) throw new Error('Firebase is not configured.');
}

function requireAuthenticatedUser() {
  requireDb();
  if (!auth?.currentUser?.uid) throw new Error('You must be signed in to perform this action.');
  return auth.currentUser;
}

function skillId(skillName) {
  return skillName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);
}

export function listenToCollection(path, constraints, onData, onError) {
  requireDb();
  const q = query(collection(db, path), ...constraints);
  return onSnapshot(q, snap => onData(snap.docs.map(item => ({ id: item.id, ...item.data() }))), onError);
}

export function listenToFeed(userId, onData, onError) {
  return listenToCollection('posts', [where('visibleTo', 'array-contains', userId), orderBy('createdAt', 'desc'), limit(30)], onData, onError);
}

export function listenToApprovedOpportunities(onData, onError) {
  return listenToCollection('opportunities', [where('status', '==', 'approved'), orderBy('publishedAt', 'desc'), limit(30)], onData, onError);
}

export function listenToPublishedEvents(onData, onError) {
  return listenToCollection('events', [where('status', '==', 'published'), orderBy('createdAt', 'desc'), limit(12)], onData, onError);
}

export function listenToPublishedAnnouncements(onData, onError) {
  return listenToCollection('announcements', [where('status', '==', 'published'), orderBy('createdAt', 'desc'), limit(12)], onData, onError);
}

export async function createPost(user, body, attachments = []) {
  requireDb();
  const cleanBody = typeof body === 'string' ? body.trim() : '';
  return addDoc(collection(db, 'posts'), {
    authorId: user.id,
    author: user.name,
    authorRole: user.role,
    body: cleanBody,
    type: attachments.length ? 'media' : 'text',
    reactions: 0,
    commentsCount: 0,
    commentCount: 0,
    attachments: attachments.map(item => ({
      id: item.id,
      name: item.name,
      uri: item.uploadedUrl || item.uri,
      type: item.type,
      size: item.size,
    })),
    visibleTo: [user.id, ...(user.connectionIds || [])],
    status: 'published',
    createdAt: serverTimestamp(),
  });
}

export async function toggleReaction(postId, userId, active) {
  requireDb();
  const reaction = doc(db, 'posts', postId, 'reactions', userId);
  if (active) await deleteDoc(reaction);
  else await setDoc(reaction, { type: 'celebrate', createdAt: serverTimestamp() });
}

export async function requestConnection(fromUser, toUserId) {
  const currentUser = requireAuthenticatedUser();
  const requesterId = currentUser.uid;
  if (!toUserId || requesterId === toUserId) throw new Error('Choose another user to connect with.');
  const id = [requesterId, toUserId].sort().join('_');
  return setDoc(doc(db, 'connections', id), {
    requesterId,
    recipientId: toUserId,
    participants: [requesterId, toUserId],
    requestedBy: requesterId,
    status: 'pending',
    createdAt: serverTimestamp(),
  }, { merge: true });
}

export async function acceptConnection(connectionId) {
  const currentUser = requireAuthenticatedUser();
  const connectionRef = doc(db, 'connections', connectionId);
  const snapshot = await getDoc(connectionRef);
  if (!snapshot.exists() || !snapshot.data().participants?.includes(currentUser.uid)) throw new Error('You cannot accept this connection request.');
  return updateDoc(connectionRef, { status: 'accepted', updatedAt: serverTimestamp() });
}

export async function declineConnection(connectionId) {
  const currentUser = requireAuthenticatedUser();
  const connectionRef = doc(db, 'connections', connectionId);
  const snapshot = await getDoc(connectionRef);
  if (!snapshot.exists() || !snapshot.data().participants?.includes(currentUser.uid)) throw new Error('You cannot decline this connection request.');
  return updateDoc(connectionRef, { status: 'declined', updatedAt: serverTimestamp() });
}

export async function expressInterest(user, opportunityId) {
  requireDb();
  return setDoc(doc(db, 'opportunities', opportunityId, 'applications', user.id), {
    userId: user.id,
    programme: user.programme || null,
    skills: user.skills || [],
    status: 'submitted',
    createdAt: serverTimestamp(),
  });
}

export async function saveOpportunity(userId, opportunityId) {
  requireDb();
  return updateDoc(doc(db, 'users', userId), { savedOpportunities: arrayUnion(opportunityId), updatedAt: serverTimestamp() });
}

export async function updateUserSkills(userId, skills) {
  const currentUser = requireAuthenticatedUser();
  if (currentUser.uid !== userId) throw new Error('You can only update your own skills.');
  const normalizedSkills = [...new Set((Array.isArray(skills) ? skills : []).map(skill => String(skill).trim()).filter(Boolean))];
  return updateDoc(doc(db, 'users', userId), { skills: normalizedSkills, updatedAt: serverTimestamp() });
}

export function getConversationId(userId, recipientId) {
  return [userId, recipientId].sort().join('_');
}

export async function sendMessage(conversationId, senderId, recipientIds, text) {
  const currentUser = requireAuthenticatedUser();
  if (currentUser.uid !== senderId) throw new Error('You can only send messages as yourself.');
  const normalizedText = text.trim();
  if (!normalizedText) throw new Error('Enter a message first.');
  const conversationRef = doc(db, 'conversations', conversationId);
  await setDoc(conversationRef, {
    participants: [...new Set([senderId, ...recipientIds])],
    lastMessage: normalizedText,
    lastUpdated: serverTimestamp(),
  }, { merge: true });
  return addDoc(collection(conversationRef, 'messages'), {
    senderId,
    recipientIds,
    text: normalizedText,
    readBy: [senderId],
    createdAt: serverTimestamp(),
  });
}

export function listenToConversations(userId, onData, onError) {
  requireDb();
  return onSnapshot(query(collection(db, 'conversations'), where('participants', 'array-contains', userId), orderBy('lastUpdated', 'desc')), snapshot => {
    onData(snapshot.docs.map(item => ({ id: item.id, ...item.data() })));
  }, onError);
}

export function listenToMessages(conversationId, onData, onError) {
  requireDb();
  return onSnapshot(query(collection(db, 'conversations', conversationId, 'messages'), orderBy('createdAt', 'asc')), snapshot => {
    onData(snapshot.docs.map(item => ({ id: item.id, ...item.data() })));
  }, onError);
}

export async function endorseSkill(targetUserId, skillName) {
  const currentUser = requireAuthenticatedUser();
  const normalizedSkill = skillName.trim();
  const id = skillId(normalizedSkill);
  if (!targetUserId || !id) throw new Error('A valid profile and skill are required.');

  const endorsementRef = doc(db, 'users', targetUserId, 'endorsements', id);
  await runTransaction(db, async transaction => {
    const snapshot = await transaction.get(endorsementRef);
    const data = snapshot.exists() ? snapshot.data() : {};
    const endorsedBy = Array.isArray(data.endorsedBy) ? data.endorsedBy : [];
    const alreadyEndorsed = endorsedBy.includes(currentUser.uid);
    const nextEndorsedBy = alreadyEndorsed
      ? endorsedBy.filter(userId => userId !== currentUser.uid)
      : [...endorsedBy, currentUser.uid];
    transaction.set(endorsementRef, {
      skillName: data.skillName || normalizedSkill,
      endorsedBy: nextEndorsedBy,
      count: nextEndorsedBy.length,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  });
  return { skillId: id };
}

export async function getSkillEndorsements(targetUserId) {
  requireDb();
  if (!targetUserId) return {};
  const snapshot = await getDocs(collection(db, 'users', targetUserId, 'endorsements'));
  return snapshot.docs.reduce((result, item) => {
    const data = item.data();
    result[data.skillName || item.id] = {
      count: Number(data.count) || 0,
      endorsed: Array.isArray(data.endorsedBy) && auth?.currentUser?.uid ? data.endorsedBy.includes(auth.currentUser.uid) : false,
    };
    return result;
  }, {});
}

export async function addRecommendation(targetUserId, text) {
  const currentUser = requireAuthenticatedUser();
  const normalizedText = text.trim();
  if (!targetUserId || !normalizedText) throw new Error('A profile and recommendation text are required.');
  if (targetUserId === currentUser.uid) throw new Error('You cannot recommend your own profile.');

  const connectionQuery = query(collection(db, 'connections'), where('participants', 'array-contains', currentUser.uid));
  const connectionSnapshot = await getDocs(connectionQuery);
  const connected = connectionSnapshot.docs.some(item => {
    const data = item.data();
    return data.status === 'accepted' && Array.isArray(data.participants) && data.participants.includes(targetUserId);
  });
  if (!connected) throw new Error('Recommendations are available to accepted connections only.');

  const authorProfile = await getDoc(doc(db, 'users', currentUser.uid));
  const profile = authorProfile.exists() ? authorProfile.data() : {};
  return addDoc(collection(db, 'users', targetUserId, 'recommendations'), {
    authorId: currentUser.uid,
    authorName: profile.name || currentUser.displayName || currentUser.email || 'StudentNet member',
    authorRole: profile.role || 'member',
    text: normalizedText.slice(0, 600),
    status: 'pending',
    createdAt: serverTimestamp(),
  });
}

export async function getRecommendations(targetUserId) {
  requireDb();
  if (!targetUserId) return [];
  const recommendations = query(
    collection(db, 'users', targetUserId, 'recommendations'),
    where('status', '==', 'approved'),
    orderBy('createdAt', 'desc'),
    limit(20),
  );
  const snapshot = await getDocs(recommendations);
  return snapshot.docs.map(item => ({ id: item.id, ...item.data() }));
}

export async function getCareerPathways(programmeName) {
  requireDb();
  const programme = programmeName?.trim();
  if (!programme || programme === 'Complete your programme') return [];
  const snapshot = await getDocs(query(
    collection(db, 'users'),
    where('role', '==', 'alumni'),
    where('programme', '==', programme),
    limit(50),
  ));

  return snapshot.docs.map(item => {
    const data = item.data();
    const history = Array.isArray(data.careerPath) ? data.careerPath : Array.isArray(data.experience) ? data.experience : [];
    const progression = history.map(step => ({
      title: step.title || step.role || 'Career step',
      company: step.company || step.organisation || step.organization || 'Community employer',
      dates: step.dates || step.period || '',
    }));
    if (!progression.length && (data.headline || data.company)) {
      progression.push({ title: data.headline || 'Alumni professional', company: data.company || 'Richfield community', dates: '' });
    }
    return {
      id: item.id,
      name: data.name || 'Richfield alumni',
      programme: data.programme,
      progression,
    };
  }).filter(item => item.progression.length);
}
