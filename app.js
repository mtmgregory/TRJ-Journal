// Main Application Script
import { initAuth, getCurrentUser } from './auth.js';
import { migrateFromLocalStorage, getAllUsersEntriesFromFirestore, isAdminUser } from './firestore-service.js';
import { startAutoSave, loadDraft } from './form-handlers.js';
import { createEntryCard } from './ui-helpers.js';

// Import all other modules to ensure they're loaded
import './history.js';
import './export.js';

// ─── EVENT DELEGATION ─────────────────────────────────────────────────────────

function setupEventDelegation() {
    document.addEventListener('click', (e) => {
        // Handle delete buttons
        if (e.target.matches('.delete-btn') || e.target.closest('.delete-btn')) {
            e.preventDefault();
            e.stopPropagation();
            const btn  = e.target.matches('.delete-btn') ? e.target : e.target.closest('.delete-btn');
            const card = btn.closest('.entry-card');
            if (card) {
                const key = card.dataset.entryKey;
                if (key && window.deleteEntry) {
                    window.deleteEntry(key);
                }
            }
            return;
        }

        // Handle edit buttons
        if (e.target.matches('.edit-btn') || e.target.closest('.edit-btn')) {
            e.preventDefault();
            e.stopPropagation();
            const btn  = e.target.matches('.edit-btn') ? e.target : e.target.closest('.edit-btn');
            const card = btn.closest('.entry-card');
            if (card) {
                const key = card.dataset.entryKey;
                if (key && window.editEntry) {
                    window.editEntry(key);
                }
            }
            return;
        }

        // Handle entry card header clicks for expansion
        if (e.target.matches('.entry-card-header') || e.target.closest('.entry-card-header')) {
            if (e.target.matches('button') || e.target.closest('button') ||
                e.target.matches('.btn-group') || e.target.closest('.btn-group')) {
                return;
            }

            const header = e.target.matches('.entry-card-header') ? e.target : e.target.closest('.entry-card-header');
            const card   = header.closest('.entry-card');
            if (card) {
                const key = card.dataset.entryKey;
                if (key && window.toggleEntryExpand) {
                    window.toggleEntryExpand(key);
                }
            }
        }
    });
}

// ─── ADMIN: VIEW ALL USERS ────────────────────────────────────────────────────

// Called by the "View All Players' Entries" button (admin only)
window.loadAllUsersEntries = async function() {
    const user = getCurrentUser();
    if (!isAdminUser(user)) {
        window.showToast('Access denied', 'error');
        return;
    }

    const container = document.getElementById('entriesContainer');
    if (!container) return;

    // Switch to history tab so the container is visible
    if (window.switchTab) window.switchTab('history');

    container.innerHTML = '<div class="no-entries">Loading all players\' entries…</div>';

    try {
        const allEntries = await getAllUsersEntriesFromFirestore();

        if (!allEntries || allEntries.length === 0) {
            container.innerHTML = '<div class="no-entries">No entries found across any accounts.</div>';
            return;
        }

        // Sort newest first
        allEntries.sort((a, b) => new Date(b.date) - new Date(a.date));

        // Group entries by player email for a cleaner admin view
        const byPlayer = {};
        allEntries.forEach(entry => {
            const label = entry.ownerEmail || entry.ownerUid;
            if (!byPlayer[label]) byPlayer[label] = [];
            byPlayer[label].push(entry);
        });

        let html = '';
        for (const [playerEmail, entries] of Object.entries(byPlayer)) {
            html += `
                <div style="
                    margin-bottom: 2rem;
                    border: 1px solid var(--gray-200);
                    border-radius: var(--radius-lg);
                    overflow: hidden;
                ">
                    <div style="
                        background: var(--primary);
                        color: white;
                        padding: 0.625rem 1rem;
                        font-size: 0.8125rem;
                        font-weight: 700;
                        letter-spacing: 0.03em;
                        display: flex;
                        align-items: center;
                        gap: 0.5rem;
                    ">
                        👤 ${playerEmail}
                        <span style="
                            margin-left: auto;
                            font-weight: 400;
                            opacity: 0.8;
                        ">${entries.length} entr${entries.length === 1 ? 'y' : 'ies'}</span>
                    </div>
                    <div style="padding: 0.75rem;">
                        ${entries.map(entry => {
                            try {
                                return createEntryCard(entry);
                            } catch (err) {
                                console.error('Error creating card:', entry.key, err);
                                return '';
                            }
                        }).filter(Boolean).join('')}
                    </div>
                </div>
            `;
        }

        container.innerHTML = html;
        window.showToast(`Loaded ${allEntries.length} entries across ${Object.keys(byPlayer).length} players`, 'success');

    } catch (error) {
        console.error('Admin load failed:', error);
        container.innerHTML = '<div class="no-entries">❌ Failed to load all entries. Check your permissions.</div>';
        window.showToast('Failed to load all entries', 'error');
    }
};

// ─── CLEANUP ──────────────────────────────────────────────────────────────────

function cleanup() {
    console.log('Cleaning up application resources...');
}

// ─── INIT ─────────────────────────────────────────────────────────────────────

window.onload = function() {
    console.log('Initializing Court Craft Journal...');

    // Initialize Firebase Authentication
    initAuth();

    // Set today's date
    const dateField = document.getElementById('entryDate');
    if (dateField) {
        const today  = new Date();
        const year   = today.getFullYear();
        const month  = String(today.getMonth() + 1).padStart(2, '0');
        const day    = String(today.getDate()).padStart(2, '0');
        dateField.value = `${year}-${month}-${day}`;
    }

    // Setup event delegation for dynamic content
    setupEventDelegation();

    // Load draft from Firestore
    loadDraft().catch(err => {
        console.error('Failed to load draft:', err);
    });

    // Start auto-save
    startAutoSave();

    // Attempt migration from localStorage if needed
    setTimeout(() => {
        if (getCurrentUser()) {
            migrateFromLocalStorage().catch(err => {
                console.error('Migration error:', err);
            });
        }
    }, 2000);

    console.log('Application initialized successfully');
};

window.addEventListener('beforeunload', () => {
    cleanup();
});

window.cleanupApp = cleanup;