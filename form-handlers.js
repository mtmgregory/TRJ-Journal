// Form Handlers Module
import { saveEntryToFirestore, saveDraftToFirestore, loadDraftFromFirestore, deleteDraftFromFirestore } from './firestore-service.js';
import { showToast } from './ui-helpers.js';
import { loadHistory } from './history.js';

let autoSaveTimer = null;
let isSaving = false;
let pendingSave = false;

// ENHANCED VALIDATION FUNCTION
function validateEntry(entry) {
    const errors = [];
    
    // Required fields
    if (!entry.date) {
        errors.push('Date is required');
    } else {
        // Validate date format
        const date = new Date(entry.date);
        if (isNaN(date.getTime())) {
            errors.push('Invalid date format');
        }
    }
    
    // Validation
    if (!entry.opponentName || !entry.opponentName.trim()) {
        errors.push('Opponent name is required');
    }
    if (!entry.gameScores || !entry.gameScores.trim()) {
        errors.push('Game scores are required');
    }
   
    return errors;
}

// Save entry - WITH ENHANCED VALIDATION
window.saveEntry = async function() {
    const editingKey = document.getElementById('editingKey')?.value;
    const date = document.getElementById('entryDate').value;
    
    if (!date) {
        showToast('Please fill in required fields', 'error');
        return;
    }
    
    const entry = {
        date: date,
        sessionType: 'Match Day',
        sessionDetails: document.getElementById('sessionDetails').value,
        notes: document.getElementById('notes').value,
        opponentName: document.getElementById('opponentName')?.value || '',
        gameScores: document.getElementById('gameScores')?.value || '',
        
        // Performance category notes
        perfLengthWidth: document.getElementById('perfLengthWidth')?.value || '',
        
        perfHeightPace: document.getElementById('perfHeightPace')?.value || '',
        
        perfControlT: document.getElementById('perfControlT')?.value || '',
        
        perfMovement: document.getElementById('perfMovement')?.value || '',
        
        perfAttack: document.getElementById('perfAttack')?.value || '',
        
        perfHittingToSpace: document.getElementById('perfHittingToSpace')?.value || '',
        
        oppStrengths: document.getElementById('oppStrengths')?.value || '',
        oppWeaknesses: document.getElementById('oppWeaknesses')?.value || '',
        matchSummary: document.getElementById('matchSummary')?.value || '',
        oneThingToWorkOn: document.getElementById('oneThingToWorkOn')?.value || ''
    };
    
    // ENHANCED VALIDATION
    const errors = validateEntry(entry);
    if (errors.length > 0) {
        showToast(errors.join('. '), 'error');
        return;
    }
    
    try {
        const key = editingKey || `entry:${Date.now()}`;
        await saveEntryToFirestore(key, entry);
        
        showToast(editingKey ? '✅ Entry updated!' : '✅ Entry saved!', 'success');
        
        // Clear form and draft
        clearForm();
        await deleteDraftFromFirestore();
        
        // Switch to history tab and load entries
        if (window.switchTab) {
            window.switchTab('history');
        }
    } catch (error) {
        console.error('Failed to save entry:', error);
        showToast('Error saving entry. Please try again.', 'error');
    }
};

// Clear form
window.clearForm = function() {
    const form = document.querySelector('#journal');
    if (!form) return;
    
    const inputs = form.querySelectorAll('input, textarea, select');
    inputs.forEach(input => {
        if (input.id !== 'entryDate' && input.type !== 'hidden') {
            input.value = '';
        }
    });
    
    const editingKey = document.getElementById('editingKey');
    if (editingKey) editingKey.value = '';
    
    const saveBtn = document.getElementById('saveBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    
    if (saveBtn) saveBtn.textContent = 'Save Journal Entry';
    if (cancelBtn) cancelBtn.style.display = 'none';
    
    deleteDraftFromFirestore().catch(err => console.error('Failed to delete draft:', err));
};

// Cancel edit
window.cancelEdit = function() {
    clearForm();
    showToast('Edit cancelled', 'success');
};

// ENHANCED AUTO-SAVE WITH RACE CONDITION PREVENTION
async function debouncedSaveDraft() {
    if (isSaving) {
        pendingSave = true;
        return;
    }
    
    isSaving = true;
    try {
        await saveDraft();
        
        if (pendingSave) {
            pendingSave = false;
            // Save again if there were changes during save
            setTimeout(debouncedSaveDraft, 500);
        }
    } catch (error) {
        console.error('Auto-save failed:', error);
        showToast('Auto-save failed', 'warning');
    } finally {
        isSaving = false;
    }
}

// Auto-save draft
export function startAutoSave() {
    const form = document.querySelector('#journal');
    if (!form) return;
    
    const inputs = form.querySelectorAll('input, textarea, select');
    
    inputs.forEach(input => {
        input.addEventListener('input', () => {
            clearTimeout(autoSaveTimer);
            autoSaveTimer = setTimeout(debouncedSaveDraft, 2000);
        });
    });
}

async function saveDraft() {
    const editingKey = document.getElementById('editingKey')?.value;
    if (editingKey) return; // Don't save draft when editing
    
    const draft = {
        date: document.getElementById('entryDate')?.value || '',
        sessionType: 'Match Day',
        sessionDetails: document.getElementById('sessionDetails')?.value || '',
        notes: document.getElementById('notes')?.value || ''
    };
    
    // Only save if there's actual content
    const hasContent = Object.values(draft).some(val => val !== '');
    if (hasContent) {
        await saveDraftToFirestore(draft);
    }
}

// Load draft
export async function loadDraft() {
    try {
        const draft = await loadDraftFromFirestore();
        if (!draft) return;
        
        const fieldMap = {
            'entryDate': 'date',
            'sessionDetails': 'sessionDetails',
            'notes': 'notes'
        };
        
        Object.keys(fieldMap).forEach(fieldId => {
            const field = document.getElementById(fieldId);
            const draftKey = fieldMap[fieldId];
            if (field && draft[draftKey]) {
                field.value = draft[draftKey];
            }
        });
        
    } catch (error) {
        console.error('Failed to load draft:', error);
    }
}

// Switch tabs
window.switchTab = function(tabName) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    
    const tabs = document.querySelectorAll('.tab');
    const views = document.querySelectorAll('.view');
    
    if (tabName === 'journal') {
        if (tabs[0]) tabs[0].classList.add('active');
        if (views[0]) views[0].classList.add('active');
    } else if (tabName === 'history') {
        if (tabs[1]) tabs[1].classList.add('active');
        if (views[1]) views[1].classList.add('active');
        if (window.loadHistory) loadHistory();
    }
};