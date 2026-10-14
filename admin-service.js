// Admin Service - write access to another athlete's entry
// Allowed only for accounts listed in the Firestore "admins" collection
// (enforced by the security rules in firestore.rules, not by this file).
import { db, doc, setDoc } from './firebase-config.js';

// Update one existing entry in users/{ownerUid}/entries/{entryId}.
// merge: true keeps any fields the form doesn't show, so an edit never wipes athlete data.
// Admins can update existing entries but not create or delete them.
export async function saveEntryAsAdmin(ownerUid, entryId, entryData, editor) {
    if (!ownerUid || !entryId) throw new Error('Missing athlete or entry id');

    const data = { ...entryData };
    data.timestamp = new Date(data.date).getTime();
    data.lastEditedBy = editor?.email || 'admin';
    data.lastEditedAt = Date.now();

    await setDoc(doc(db, 'users', ownerUid, 'entries', entryId), data, { merge: true });
    return entryId;
}
