// Firestore Service - Database operations
import { db, collection, doc, setDoc, getDoc, getDocs, deleteDoc } from './firebase-config.js';
import { getCurrentUser } from './auth.js';

// ─── ADMIN CONFIG ────────────────────────────────────────────────────────────
// Change this to the email address you use for the admin/coach account.
const ADMIN_EMAIL = 'admin@yourdomain.com';

export function isAdminUser(user) {
    return user && user.email === ADMIN_EMAIL;
}

// ─── ENTRIES ─────────────────────────────────────────────────────────────────

// Save entry to Firestore (always under the current user's own path)
export async function saveEntryToFirestore(entryKey, entryData) {
    const user = getCurrentUser();
    if (!user) {
        throw new Error('User not authenticated');
    }

    entryData.timestamp = new Date(entryData.date).getTime();

    const entryRef = doc(db, 'users', user.uid, 'entries', entryKey);
    await setDoc(entryRef, entryData);

    return entryKey;
}

// Get single entry from Firestore (own entries only)
export async function getEntryFromFirestore(entryKey) {
    const user = getCurrentUser();
    if (!user) {
        throw new Error('User not authenticated');
    }

    const entryRef = doc(db, 'users', user.uid, 'entries', entryKey);
    const entryDoc = await getDoc(entryRef);

    if (entryDoc.exists()) {
        return { key: entryDoc.id, value: JSON.stringify(entryDoc.data()) };
    }

    return null;
}

// Get all entries for the current user only
export async function getAllEntriesFromFirestore() {
    const user = getCurrentUser();
    if (!user) {
        throw new Error('User not authenticated');
    }

    try {
        const entriesRef = collection(db, 'users', user.uid, 'entries');
        const querySnapshot = await getDocs(entriesRef);

        const entries = [];
        querySnapshot.forEach((doc) => {
            entries.push({
                key: doc.id,
                ...doc.data()
            });
        });

        return entries;
    } catch (error) {
        console.error('Error getting entries:', error);
        throw error;
    }
}

// Delete entry from Firestore (own entries only)
export async function deleteEntryFromFirestore(entryKey) {
    const user = getCurrentUser();
    if (!user) {
        throw new Error('User not authenticated');
    }

    const entryRef = doc(db, 'users', user.uid, 'entries', entryKey);
    await deleteDoc(entryRef);

    return { key: entryKey, deleted: true };
}

// ─── ADMIN: VIEW ALL USERS' ENTRIES ──────────────────────────────────────────

// Admin-only: fetch entries for every user in the database.
// Returns entries with an extra `ownerEmail` field for labelling in the UI.
// This will be blocked by Firestore Security Rules if the caller is not admin.
export async function getAllUsersEntriesFromFirestore() {
    const user = getCurrentUser();
    if (!user) {
        throw new Error('User not authenticated');
    }
    if (!isAdminUser(user)) {
        throw new Error('Access denied: admin only');
    }

    try {
        // Get the list of all user documents
        const usersRef = collection(db, 'users');
        const usersSnap = await getDocs(usersRef);

        const allEntries = [];

        for (const userDoc of usersSnap.docs) {
            const entriesRef = collection(db, 'users', userDoc.id, 'entries');
            const entriesSnap = await getDocs(entriesRef);

            // Try to pull the stored email for this user (saved during first login)
            const metaRef = doc(db, 'users', userDoc.id, 'metadata', 'profile');
            let ownerEmail = userDoc.id; // fallback to uid if no email stored
            try {
                const metaDoc = await getDoc(metaRef);
                if (metaDoc.exists() && metaDoc.data().email) {
                    ownerEmail = metaDoc.data().email;
                }
            } catch (_) { /* non-fatal */ }

            entriesSnap.forEach((entryDoc) => {
                allEntries.push({
                    key: entryDoc.id,
                    ownerUid: userDoc.id,
                    ownerEmail,
                    ...entryDoc.data()
                });
            });
        }

        return allEntries;
    } catch (error) {
        console.error('Error getting all users entries:', error);
        throw error;
    }
}

// ─── DRAFTS ──────────────────────────────────────────────────────────────────

// Save draft to Firestore
export async function saveDraftToFirestore(draftData) {
    const user = getCurrentUser();
    if (!user) {
        return;
    }

    try {
        const draftRef = doc(db, 'users', user.uid, 'drafts', 'currentDraft');
        await setDoc(draftRef, draftData);
    } catch (error) {
        console.error('Error saving draft:', error);
    }
}

// Load draft from Firestore
export async function loadDraftFromFirestore() {
    const user = getCurrentUser();
    if (!user) {
        return null;
    }

    try {
        const draftRef = doc(db, 'users', user.uid, 'drafts', 'currentDraft');
        const draftDoc = await getDoc(draftRef);

        if (draftDoc.exists()) {
            return draftDoc.data();
        }
    } catch (error) {
        console.error('Error loading draft:', error);
    }

    return null;
}

// Delete draft from Firestore
export async function deleteDraftFromFirestore() {
    const user = getCurrentUser();
    if (!user) {
        return;
    }

    try {
        const draftRef = doc(db, 'users', user.uid, 'drafts', 'currentDraft');
        await deleteDoc(draftRef);
    } catch (error) {
        console.error('Error deleting draft:', error);
    }
}

// ─── MIGRATION ───────────────────────────────────────────────────────────────

// Migrate from localStorage to Firestore
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
                    const data = JSON.parse(value);
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
                console.log('Migrated:', entry.key);
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