// Firestore Service - Database operations
import { db, collection, doc, setDoc, getDoc, getDocs, deleteDoc } from './firebase-config.js';
import { getCurrentUser } from './auth.js';

// Save entry to Firestore
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

// Get single entry from Firestore
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

// Get all entries from Firestore
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
        
        return entries; // Return actual data, not just keys
    } catch (error) {
        console.error('Error getting entries:', error);
        throw error;
    }
}

// Delete entry from Firestore
export async function deleteEntryFromFirestore(entryKey) {
    const user = getCurrentUser();
    if (!user) {
        throw new Error('User not authenticated');
    }
    
    const entryRef = doc(db, 'users', user.uid, 'entries', entryKey);
    await deleteDoc(entryRef);
    
    return { key: entryKey, deleted: true };
}

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