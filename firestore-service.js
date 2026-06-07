// Firestore Service - Database operations
import { db, collection, doc, setDoc, getDoc, getDocs, deleteDoc } from './firebase-config.js';
import { getCurrentUser } from './auth.js';

// ─── ADMIN CONFIG ────────────────────────────────────────────────────────────
const ADMIN_EMAIL = 'anton.sarah.gregory@gmail.com';

export function isAdminUser(user) {
    return user && user.email === ADMIN_EMAIL;
}

// ─── USER REGISTRY ───────────────────────────────────────────────────────────
// On every login, each user writes their own UID + email into a single
// document at users/{uid}/metadata/profile  (already happening via auth.js).
// The admin reads that doc per-user — no top-level collection listing needed.
//
// We also maintain a shared index at  adminIndex/userList  so the admin can
// discover all UIDs without needing to list the top-level users/ collection
// (which is not permitted by the security rules).

export async function registerUserInAdminIndex(user) {
    try {
        // Each user writes ONLY their own slot — keyed by uid so writes never
        // conflict and no user can overwrite another's slot.
        const indexRef = doc(db, 'adminIndex', 'userList');
        await setDoc(indexRef, {
            [user.uid]: { email: user.email, lastLogin: new Date().toISOString() }
        }, { merge: true });
    } catch (err) {
        // Non-fatal: admin view will still work for users whose profile doc exists
        console.warn('Could not register in admin index:', err);
    }
}

// ─── ENTRIES ─────────────────────────────────────────────────────────────────

export async function saveEntryToFirestore(entryKey, entryData) {
    const user = getCurrentUser();
    if (!user) throw new Error('User not authenticated');

    entryData.timestamp = new Date(entryData.date).getTime();
    const entryRef = doc(db, 'users', user.uid, 'entries', entryKey);
    await setDoc(entryRef, entryData);
    return entryKey;
}

export async function getEntryFromFirestore(entryKey) {
    const user = getCurrentUser();
    if (!user) throw new Error('User not authenticated');

    const entryRef = doc(db, 'users', user.uid, 'entries', entryKey);
    const entryDoc = await getDoc(entryRef);

    if (entryDoc.exists()) {
        return { key: entryDoc.id, value: JSON.stringify(entryDoc.data()) };
    }
    return null;
}

export async function getAllEntriesFromFirestore() {
    const user = getCurrentUser();
    if (!user) throw new Error('User not authenticated');

    try {
        const entriesRef = collection(db, 'users', user.uid, 'entries');
        const querySnapshot = await getDocs(entriesRef);

        const entries = [];
        querySnapshot.forEach((doc) => {
            entries.push({ key: doc.id, ...doc.data() });
        });
        return entries;
    } catch (error) {
        console.error('Error getting entries:', error);
        throw error;
    }
}

export async function deleteEntryFromFirestore(entryKey) {
    const user = getCurrentUser();
    if (!user) throw new Error('User not authenticated');

    const entryRef = doc(db, 'users', user.uid, 'entries', entryKey);
    await deleteDoc(entryRef);
    return { key: entryKey, deleted: true };
}

// ─── ADMIN: VIEW ALL USERS' ENTRIES ──────────────────────────────────────────
// Strategy:
// 1. Read the adminIndex/userList document to get all known UIDs + emails.
// 2. For each UID, read that user's entries subcollection directly.
//    The Firestore rule  allow read if isAdmin()  covers this because the
//    admin's token email matches the rule's isAdmin() function.
// 3. No top-level collection listing is ever attempted.

export async function getAllUsersEntriesFromFirestore() {
    const user = getCurrentUser();
    if (!user) throw new Error('User not authenticated');
    if (!isAdminUser(user)) throw new Error('Access denied: admin only');

    try {
        // Step 1: read the user index
        const indexRef  = doc(db, 'adminIndex', 'userList');
        const indexSnap = await getDoc(indexRef);

        let userMap = {}; // { uid: { email, lastLogin } }
        if (indexSnap.exists()) {
            userMap = indexSnap.data();
        }

        // Always include the admin's own UID in case they have entries too
        if (!userMap[user.uid]) {
            userMap[user.uid] = { email: user.email };
        }

        const allEntries = [];

        // Step 2: for each known UID, fetch their entries
        for (const [uid, info] of Object.entries(userMap)) {
            const ownerEmail = info.email || uid;
            try {
                const entriesRef  = collection(db, 'users', uid, 'entries');
                const entriesSnap = await getDocs(entriesRef);

                entriesSnap.forEach((entryDoc) => {
                    allEntries.push({
                        key: entryDoc.id,
                        ownerUid: uid,
                        ownerEmail,
                        ...entryDoc.data()
                    });
                });
            } catch (err) {
                console.warn(`Could not load entries for ${ownerEmail}:`, err.message);
            }
        }

        return allEntries;
    } catch (error) {
        console.error('Error getting all users entries:', error);
        throw error;
    }
}

// ─── DRAFTS ──────────────────────────────────────────────────────────────────

export async function saveDraftToFirestore(draftData) {
    const user = getCurrentUser();
    if (!user) return;

    try {
        const draftRef = doc(db, 'users', user.uid, 'drafts', 'currentDraft');
        await setDoc(draftRef, draftData);
    } catch (error) {
        console.error('Error saving draft:', error);
    }
}

export async function loadDraftFromFirestore() {
    const user = getCurrentUser();
    if (!user) return null;

    try {
        const draftRef = doc(db, 'users', user.uid, 'drafts', 'currentDraft');
        const draftDoc = await getDoc(draftRef);
        if (draftDoc.exists()) return draftDoc.data();
    } catch (error) {
        console.error('Error loading draft:', error);
    }
    return null;
}

export async function deleteDraftFromFirestore() {
    const user = getCurrentUser();
    if (!user) return;

    try {
        const draftRef = doc(db, 'users', user.uid, 'drafts', 'currentDraft');
        await deleteDoc(draftRef);
    } catch (error) {
        console.error('Error deleting draft:', error);
    }
}

// ─── MIGRATION ───────────────────────────────────────────────────────────────

export async function migrateFromLocalStorage() {
    const user = getCurrentUser();
    if (!user) {
        console.log('No user logged in, skipping migration');
        return;
    }

    try {
        const migrationRef = doc(db, 'users', user.uid, 'metadata', 'migration');
        const migrationDoc = await getDoc(migrationRef);

        if (migrationDoc.exists() && migrationDoc.data().completed) {
            console.log('Migration already completed');
            return;
        }

        const entries = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('entry:')) {
                try {
                    const value = localStorage.getItem(key);
                    const data  = JSON.parse(value);
                    entries.push({ key, data });
                } catch (e) {
                    console.error('Error parsing entry:', key, e);
                }
            }
        }

        if (entries.length === 0) {
            console.log('No entries to migrate');
            await setDoc(migrationRef, {
                completed: true,
                date: new Date().toISOString(),
                entriesMigrated: 0
            });
            return;
        }

        let successCount = 0;
        for (const entry of entries) {
            try {
                await saveEntryToFirestore(entry.key, entry.data);
                successCount++;
            } catch (e) {
                console.error('Error migrating entry:', entry.key, e);
            }
        }

        await setDoc(migrationRef, {
            completed: true,
            date: new Date().toISOString(),
            entriesMigrated: successCount
        });

        console.log(`Migration complete. Migrated ${successCount} of ${entries.length} entries.`);
        if (window.showToast) {
            window.showToast(`✅ Migrated ${successCount} entries to cloud storage`, 'success');
        }
    } catch (error) {
        console.error('Migration error:', error);
    }
}