// Main Application Script - FIXED EVENT DELEGATION
import { initAuth, getCurrentUser } from './auth.js';
import { migrateFromLocalStorage } from './firestore-service.js';
import { startAutoSave, loadDraft } from './form-handlers.js';
import { toggleMatchFields } from './form-handlers.js';

// Import all other modules to ensure they're loaded
import './history.js';
import './insights.js';
import './export.js';

// Global event delegation for dynamic content
function setupEventDelegation() {
    // Delegate delete button clicks
    document.addEventListener('click', (e) => {
        // Handle delete buttons
        if (e.target.matches('.delete-btn') || e.target.closest('.delete-btn')) {
            e.preventDefault();
            e.stopPropagation(); // Prevent event from bubbling
            const btn = e.target.matches('.delete-btn') ? e.target : e.target.closest('.delete-btn');
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
            e.stopPropagation(); // Prevent event from bubbling
            const btn = e.target.matches('.edit-btn') ? e.target : e.target.closest('.edit-btn');
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
            // Don't trigger if clicking on buttons or inside button groups
            if (e.target.matches('button') || e.target.closest('button') || 
                e.target.matches('.btn-group') || e.target.closest('.btn-group')) {
                return;
            }
            
            const header = e.target.matches('.entry-card-header') ? e.target : e.target.closest('.entry-card-header');
            const card = header.closest('.entry-card');
            if (card) {
                const key = card.dataset.entryKey;
                if (key && window.toggleEntryExpand) {
                    window.toggleEntryExpand(key);
                }
            }
        }
    });
}

// Cleanup function (called on logout or page unload if needed)
function cleanup() {
    console.log('Cleaning up application resources...');
    
    // Clear any timers (auto-save, etc.)
    // Note: The actual timer is managed in form-handlers.js
    
    // Remove any temporary data
    // (Most cleanup happens automatically with modern browsers)
}

// Initialize app on load
window.onload = function() {
    console.log('Initializing Court Craft Journal...');
    
    // Initialize Firebase Authentication
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
        
    // Setup event delegation for dynamic content
    setupEventDelegation();
    
    // Load draft from Firestore
    loadDraft().catch(err => {
        console.error('Failed to load draft:', err);
    });
    
    // Start auto-save
    startAutoSave();
    
    // Initialize match fields visibility
    toggleMatchFields();
    
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

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    cleanup();
});

// Export cleanup for use in logout
window.cleanupApp = cleanup;