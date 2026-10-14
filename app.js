// Main Application Script
import { initAuth, getCurrentUser } from './auth.js';
import { migrateFromLocalStorage } from './firestore-service.js';
import { startAutoSave, loadDraft, setDistractions } from './form-handlers.js';

// Import all other modules to ensure they're loaded
import './history.js';
import './insights.js';
import './export.js';
import './admin.js';

// Global event delegation for dynamic content
function setupEventDelegation() {
    document.addEventListener('click', (e) => {
        // Delete buttons
        const deleteBtn = e.target.closest('.delete-btn');
        if (deleteBtn) {
            e.preventDefault();
            e.stopPropagation();
            const key = deleteBtn.closest('.entry-card')?.dataset.entryKey;
            if (key && window.deleteEntry) window.deleteEntry(key);
            return;
        }

        // Edit buttons
        const editBtn = e.target.closest('.edit-btn');
        if (editBtn) {
            e.preventDefault();
            e.stopPropagation();
            const key = editBtn.closest('.entry-card')?.dataset.entryKey;
            // cards in the Admin tab belong to other athletes and use keys starting "admin:"
            if (key && key.startsWith('admin:')) { if (window.adminEditEntry) window.adminEditEntry(key); }
            else if (key && window.editEntry) window.editEntry(key);
            return;
        }

        // Entry card header clicks for expansion
        const header = e.target.closest('.entry-card-header');
        if (header) {
            if (e.target.closest('button') || e.target.closest('.btn-group')) return;
            const key = header.closest('.entry-card')?.dataset.entryKey;
            if (key && window.toggleEntryExpand) window.toggleEntryExpand(key);
        }
    });
}

// Open the calendar when the date field is clicked, not just its small icon
function setupCalendarPicker() {
    document.addEventListener('click', (e) => {
        const input = e.target.closest('input[type="date"]');
        if (!input || typeof input.showPicker !== 'function') return;
        const box = input.getBoundingClientRect();
        if (e.clientX > box.right - 44) return; // the native icon already opens it
        try { input.showPicker(); } catch (err) { /* picker unavailable: typing still works */ }
    });
}

function cleanup() {
    console.log('Cleaning up application resources...');
}

window.onload = function() {
    console.log('Initializing TRJ Reflection Journals...');

    initAuth();

    // Set today's date
    const dateField = document.getElementById('entryDate');
    if (dateField) {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        dateField.value = `${year}-${month}-${day}`;
    }

    // Start with one empty distraction row
    setDistractions([]);

    setupEventDelegation();
    setupCalendarPicker();

    loadDraft().catch(err => {
        console.error('Failed to load draft:', err);
    });

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
