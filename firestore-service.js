// Firestore Service - Database operations
import { db, collection, doc, setDoc, getDoc, getDocs, deleteDoc } from './firebase-config.js';
import { getCurrentUser } from './auth.js';

// ─── ADMIN CONFIG ────────────────────────────────────────────────────────────
const ADMIN_EMAIL = 'anton.sarah.gregory@gmail.com';

export function isAdminUser(user) {
    return user && user.email === ADMIN_EMAIL;
}

// ─── ADMIN INDEX HELPERS ─────────────────────────────────────────────────────
// The adminIndex/userList document holds a map of  uid → { email, lastLogin }
// so the admin can discover all player UIDs without listing the top-level
// users/ collection (which security rules don't permit).

const ADMIN_INDEX_REF = () => doc(db, 'adminIndex', 'userList');

// Called on every login — writes the current user's own slot into the index.
export async function registerUserInAdminIndex(user) {
    try {
        await setDoc(ADMIN_INDEX_REF(), {
            [user.uid]: { email: user.email, lastLogin: new Date().toISOString() }
        }, { merge: true });
    } catch (err) {
        console.warn('Could not register in admin index:', err);
    }
}

// Admin: read the full index map.
export async function getAdminIndex() {
    const snap = await getDoc(ADMIN_INDEX_REF());
    return snap.exists() ? snap.data() : {};
}

// Admin: manually add a player by UID + email (for players registered before
// this index existed, or who haven't logged in yet).
export async function addPlayerToAdminIndex(uid, email) {
    await setDoc(ADMIN_INDEX_REF(), {
        [uid]: { email, addedByAdmin: true, addedAt: new Date().toISOString() }
    }, { merge: true });
}

// Admin: remove a player slot from the index (does NOT delete their entries).
export async function removePlayerFromAdminIndex(uid) {
    // Firestore doesn't support deleting a single map key via setDoc/updateDoc
    // with FieldValue.delete() without the Admin SDK, so we read→filter→rewrite.
    const snap = await getDoc(ADMIN_INDEX_REF());
    if (!snap.exists()) return;
    const data = snap.data();
    delete data[uid];
    // Overwrite the whole document with the key removed
    await setDoc(ADMIN_INDEX_REF(), data);
}

// ─── ENTRIES ─────────────────────────────────────────────────────────────────

export async function saveEntryToFirestore(entryKey, entryData) {
    const user = getCurrentUser();
    if (!user) throw new Error('User not authenticated');

    entryData.timestamp = new Date(entryData.date).getTime();
    await setDoc(doc(db, 'users', user.uid, 'entries', entryKey), entryData);
    return entryKey;
}

export async function getEntryFromFirestore(entryKey) {
    const user = getCurrentUser();
    if (!user) throw new Error('User not authenticated');

    const snap = await getDoc(doc(db, 'users', user.uid, 'entries', entryKey));
    if (snap.exists()) return { key: snap.id, value: JSON.stringify(snap.data()) };
    return null;
}

export async function getAllEntriesFromFirestore() {
    const user = getCurrentUser();
    if (!user) throw new Error('User not authenticated');

    try {
        const snap = await getDocs(collection(db, 'users', user.uid, 'entries'));
        const entries = [];
        snap.forEach(d => entries.push({ key: d.id, ...d.data() }));
        return entries;
    } catch (error) {
        console.error('Error getting entries:', error);
        throw error;
    }
}

export async function deleteEntryFromFirestore(entryKey) {
    const user = getCurrentUser();
    if (!user) throw new Error('User not authenticated');

    await deleteDoc(doc(db, 'users', user.uid, 'entries', entryKey));
    return { key: entryKey, deleted: true };
}

// ─── ADMIN: VIEW ALL USERS' ENTRIES ──────────────────────────────────────────
// 1. Read adminIndex/userList to get all known UIDs.
// 2. Always include the admin's own UID.
// 3. Fetch each user's entries/ subcollection directly — permitted by the
//    security rule  allow read if isAdmin().

export async function getAllUsersEntriesFromFirestore() {
    const user = getCurrentUser();
    if (!user) throw new Error('User not authenticated');
    if (!isAdminUser(user)) throw new Error('Access denied: admin only');

    // Build the uid→email map from the index
    const userMap = await getAdminIndex();

    // Always include the admin themselves
    if (!userMap[user.uid]) {
        userMap[user.uid] = { email: user.email };
    }

    if (Object.keys(userMap).length === 0) {
        console.warn('Admin index is empty. Add players via the Manage Players button.');
        return [];
    }

    const allEntries = [];

    for (const [uid, info] of Object.entries(userMap)) {
        const ownerEmail = info.email || uid;
        try {
            const snap = await getDocs(collection(db, 'users', uid, 'entries'));
            snap.forEach(d => {
                allEntries.push({ key: d.id, ownerUid: uid, ownerEmail, ...d.data() });
            });
        } catch (err) {
            console.warn(`Could not load entries for ${ownerEmail}:`, err.message);
        }
    }

    return allEntries;
}

// ─── DRAFTS ──────────────────────────────────────────────────────────────────

export async function saveDraftToFirestore(draftData) {
    const user = getCurrentUser();
    if (!user) return;
    try {
        await setDoc(doc(db, 'users', user.uid, 'drafts', 'currentDraft'), draftData);
    } catch (error) {
        console.error('Error saving draft:', error);
    }
}

export async function loadDraftFromFirestore() {
    const user = getCurrentUser();
    if (!user) return null;
    try {
        const snap = await getDoc(doc(db, 'users', user.uid, 'drafts', 'currentDraft'));
        if (snap.exists()) return snap.data();
    } catch (error) {
        console.error('Error loading draft:', error);
    }
    return null;
}

export async function deleteDraftFromFirestore() {
    const user = getCurrentUser();
    if (!user) return;
    try {
        await deleteDoc(doc(db, 'users', user.uid, 'drafts', 'currentDraft'));
    } catch (error) {
        console.error('Error deleting draft:', error);
    }
}

// ─── MIGRATION ───────────────────────────────────────────────────────────────

export async function migrateFromLocalStorage() {
    const user = getCurrentUser();
    if (!user) return;

    try {
        const migrationRef = doc(db, 'users', user.uid, 'metadata', 'migration');
        const migrationDoc = await getDoc(migrationRef);

        if (migrationDoc.exists() && migrationDoc.data().completed) return;

        const entries = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith('entry:')) {
                try {
                    entries.push({ key, data: JSON.parse(localStorage.getItem(key)) });
                } catch (e) { console.error('Error parsing entry:', key, e); }
            }
        }

        let successCount = 0;
        for (const entry of entries) {
            try { await saveEntryToFirestore(entry.key, entry.data); successCount++; }
            catch (e) { console.error('Error migrating entry:', entry.key, e); }
        }

        await setDoc(migrationRef, { completed: true, date: new Date().toISOString(), entriesMigrated: successCount });

        if (successCount > 0 && window.showToast) {
            window.showToast(`✅ Migrated ${successCount} entries to cloud storage`, 'success');
        }
    } catch (error) {
        console.error('Migration error:', error);
    }
}