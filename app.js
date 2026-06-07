// Main Application Script
import { initAuth, getCurrentUser } from './auth.js';
import {
    migrateFromLocalStorage,
    getAllUsersEntriesFromFirestore,
    isAdminUser,
    getAdminIndex,
    addPlayerToAdminIndex,
    removePlayerFromAdminIndex
} from './firestore-service.js';
import { startAutoSave, loadDraft } from './form-handlers.js';
import { createEntryCard } from './ui-helpers.js';

import './history.js';
import './export.js';

// ─── EVENT DELEGATION ────────────────────────────────────────────────────────

function setupEventDelegation() {
    document.addEventListener('click', (e) => {
        if (e.target.matches('.delete-btn') || e.target.closest('.delete-btn')) {
            e.preventDefault();
            e.stopPropagation();
            const btn  = e.target.matches('.delete-btn') ? e.target : e.target.closest('.delete-btn');
            const card = btn.closest('.entry-card');
            if (card?.dataset.entryKey && window.deleteEntry) {
                window.deleteEntry(card.dataset.entryKey);
            }
            return;
        }

        if (e.target.matches('.edit-btn') || e.target.closest('.edit-btn')) {
            e.preventDefault();
            e.stopPropagation();
            const btn  = e.target.matches('.edit-btn') ? e.target : e.target.closest('.edit-btn');
            const card = btn.closest('.entry-card');
            if (card?.dataset.entryKey && window.editEntry) {
                window.editEntry(card.dataset.entryKey);
            }
            return;
        }

        if (e.target.matches('.entry-card-header') || e.target.closest('.entry-card-header')) {
            if (e.target.matches('button') || e.target.closest('button') ||
                e.target.matches('.btn-group') || e.target.closest('.btn-group')) return;

            const header = e.target.matches('.entry-card-header') ? e.target : e.target.closest('.entry-card-header');
            const card   = header.closest('.entry-card');
            if (card?.dataset.entryKey && window.toggleEntryExpand) {
                window.toggleEntryExpand(card.dataset.entryKey);
            }
        }
    });
}

// ─── ADMIN: VIEW ALL ENTRIES ─────────────────────────────────────────────────

window.loadAllUsersEntries = async function() {
    const user = getCurrentUser();
    if (!isAdminUser(user)) { window.showToast('Access denied', 'error'); return; }

    const container = document.getElementById('entriesContainer');
    if (!container) return;

    if (window.switchTab) window.switchTab('history');
    container.innerHTML = '<div class="no-entries">Loading all players\' entries…</div>';

    try {
        const allEntries = await getAllUsersEntriesFromFirestore();

        if (!allEntries || allEntries.length === 0) {
            container.innerHTML = `
                <div class="no-entries">
                    No entries found.<br><br>
                    <strong>To fix this:</strong> click <em>Manage Players</em> in the admin bar
                    and add each player using their Firebase UID
                    (found in Firebase Console → Authentication → Users).
                </div>`;
            return;
        }

        allEntries.sort((a, b) => new Date(b.date) - new Date(a.date));

        const byPlayer = {};
        allEntries.forEach(entry => {
            const label = entry.ownerEmail || entry.ownerUid;
            if (!byPlayer[label]) byPlayer[label] = [];
            byPlayer[label].push(entry);
        });

        let html = '';
        for (const [playerEmail, entries] of Object.entries(byPlayer)) {
            html += `
                <div style="margin-bottom:2rem;border:1px solid var(--gray-200);border-radius:var(--radius-lg);overflow:hidden;">
                    <div style="background:var(--primary);color:white;padding:0.625rem 1rem;font-size:0.8125rem;font-weight:700;display:flex;align-items:center;gap:0.5rem;">
                        👤 ${playerEmail}
                        <span style="margin-left:auto;font-weight:400;opacity:0.8;">${entries.length} entr${entries.length === 1 ? 'y' : 'ies'}</span>
                    </div>
                    <div style="padding:0.75rem;">
                        ${entries.map(entry => {
                            try { return createEntryCard(entry); }
                            catch (err) { console.error('Card error:', entry.key, err); return ''; }
                        }).filter(Boolean).join('')}
                    </div>
                </div>`;
        }

        container.innerHTML = html;
        window.showToast(`Loaded ${allEntries.length} entries across ${Object.keys(byPlayer).length} player(s)`, 'success');

    } catch (error) {
        console.error('Admin load failed:', error);
        container.innerHTML = '<div class="no-entries">❌ Failed to load entries. Check browser console for details.</div>';
        window.showToast('Failed to load entries', 'error');
    }
};

// ─── ADMIN: MANAGE PLAYERS MODAL ─────────────────────────────────────────────

window.openAddPlayerModal = async function() {
    const modal = document.getElementById('addPlayerModal');
    if (!modal) return;
    modal.classList.add('open');
    await refreshPlayerList();
};

window.closeAddPlayerModal = function() {
    const modal = document.getElementById('addPlayerModal');
    if (modal) modal.classList.remove('open');
};

// Close modal on backdrop click
document.addEventListener('click', (e) => {
    const modal = document.getElementById('addPlayerModal');
    if (modal && e.target === modal) window.closeAddPlayerModal();
});

async function refreshPlayerList() {
    const listEl = document.getElementById('playerList');
    if (!listEl) return;

    listEl.innerHTML = 'Loading…';
    try {
        const userMap = await getAdminIndex();
        const entries = Object.entries(userMap);

        if (entries.length === 0) {
            listEl.innerHTML = '<div style="color:#94a3b8;font-size:0.8125rem;">No players registered yet.</div>';
            return;
        }

        listEl.innerHTML = entries.map(([uid, info]) => `
            <div class="player-row">
                <div>
                    <div>${info.email || '(no email)'}</div>
                    <span>${uid}</span>
                </div>
                <button class="player-remove" onclick="removePlayer('${uid}')" title="Remove">✕</button>
            </div>
        `).join('');
    } catch (err) {
        listEl.innerHTML = '<div style="color:#dc2626;font-size:0.8125rem;">Could not load player list.</div>';
        console.error('Player list error:', err);
    }
}

window.addPlayerToIndex = async function() {
    const emailInput = document.getElementById('newPlayerEmail');
    const uidInput   = document.getElementById('newPlayerUID');
    const email = emailInput?.value?.trim();
    const uid   = uidInput?.value?.trim();

    if (!uid) { window.showToast('Firebase UID is required', 'error'); return; }
    if (!email) { window.showToast('Email is required', 'error'); return; }

    try {
        await addPlayerToAdminIndex(uid, email);
        window.showToast(`✅ ${email} added`, 'success');
        if (emailInput) emailInput.value = '';
        if (uidInput)   uidInput.value   = '';
        await refreshPlayerList();
    } catch (err) {
        console.error('Add player error:', err);
        window.showToast('Failed to add player', 'error');
    }
};

window.removePlayer = async function(uid) {
    if (!confirm('Remove this player from the admin index? Their entries are not deleted.')) return;
    try {
        await removePlayerFromAdminIndex(uid);
        window.showToast('Player removed from index', 'success');
        await refreshPlayerList();
    } catch (err) {
        console.error('Remove player error:', err);
        window.showToast('Failed to remove player', 'error');
    }
};

// ─── CLEANUP & INIT ──────────────────────────────────────────────────────────

function cleanup() {
    console.log('Cleaning up...');
}

window.onload = function() {
    console.log('Initializing Court Craft Journal...');

    initAuth();

    const dateField = document.getElementById('entryDate');
    if (dateField) {
        const today = new Date();
        dateField.value = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
    }

    setupEventDelegation();

    loadDraft().catch(err => console.error('Failed to load draft:', err));
    startAutoSave();

    setTimeout(() => {
        if (getCurrentUser()) {
            migrateFromLocalStorage().catch(err => console.error('Migration error:', err));
        }
    }, 2000);

    console.log('Application initialized successfully');
};

window.addEventListener('beforeunload', cleanup);
window.cleanupApp = cleanup;