import {
  addDoc,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from './config';

function requireDb() {
  if (!db) throw new Error('Firebase is not configured.');
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

export async function createPost(user, body) {
  requireDb();
  return addDoc(collection(db, 'posts'), {
    authorId: user.id,
    author: user.name,
    authorRole: user.role,
    body: body.trim(),
    type: 'text',
    reactions: 0,
    commentCount: 0,
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
  requireDb();
  const id = [fromUser.id, toUserId].sort().join('_');
  return setDoc(doc(db, 'connections', id), {
    participants: [fromUser.id, toUserId],
    requestedBy: fromUser.id,
    recipientId: toUserId,
    status: 'pending',
    createdAt: serverTimestamp(),
  });
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

export async function sendMessage(conversationId, senderId, recipientIds, text) {
  requireDb();
  return addDoc(collection(db, 'conversations', conversationId, 'messages'), {
    senderId,
    recipientIds,
    text: text.trim(),
    readBy: [senderId],
    createdAt: serverTimestamp(),
  });
}
