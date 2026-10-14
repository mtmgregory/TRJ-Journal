// Form Handlers Module - ENHANCED VALIDATION WITH PERFORMANCE RATINGS
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
    
    // Rating validation
    if (!entry.rating) {
        errors.push('Session rating is required');
    } else {
        const rating = parseInt(entry.rating);
        if (isNaN(rating) || rating < 1 || rating > 5) {
            errors.push('Rating must be between 1 and 5');
        }
    }
    
    // Match-specific validation
    if (entry.sessionType === 'Match Day') {
        if (!entry.opponentName || !entry.opponentName.trim()) {
            errors.push('Opponent name is required for matches');
        }
        if (!entry.gameScores || !entry.gameScores.trim()) {
            errors.push('Game scores are required for matches');
        }
    }
    
    // Numeric field validation
    if (entry.temperature !== '' && entry.temperature !== null && entry.temperature !== undefined) {
        const temp = parseFloat(entry.temperature);
        if (isNaN(temp) || temp < -50 || temp > 60) {
            errors.push('Temperature must be between -50°C and 60°C');
        }
    }
    
    if (entry.hydration !== '' && entry.hydration !== null && entry.hydration !== undefined) {
        const hydration = parseFloat(entry.hydration);
        if (isNaN(hydration) || hydration < 0 || hydration > 20) {
            errors.push('Hydration must be between 0L and 20L');
        }
    }
    
    if (entry.sleep !== '' && entry.sleep !== null && entry.sleep !== undefined) {
        const sleep = parseFloat(entry.sleep);
        if (isNaN(sleep) || sleep < 0 || sleep > 24) {
            errors.push('Sleep must be between 0 and 24 hours');
        }
    }
    
    // Performance rating validation (1-10 scale)
    const performanceRatings = [
        'perfLengthWidthRating',
        'perfHeightPaceRating',
        'perfControlTRating',
        'perfMovementRating',
        'perfAttackRating',
        'perfHittingToSpaceRating'
    ];
    
    performanceRatings.forEach(ratingField => {
        const value = entry[ratingField];
        if (value !== '' && value !== null && value !== undefined) {
            const rating = parseInt(value);
            if (isNaN(rating) || rating < 1 || rating > 10) {
                const fieldName = ratingField.replace('perf', '').replace('Rating', '');
                errors.push(`${fieldName} rating must be between 1 and 10`);
            }
        }
    });
    
    return errors;
}

// Toggle match fields visibility
export function toggleMatchFields() {
    const sessionType = document.getElementById('sessionTypeSelect')?.value || '';
    const matchFields = document.getElementById('matchFields');
    
    if (matchFields) {
        matchFields.style.display = sessionType === 'Match Day' ? 'block' : 'none';
    }
}

window.toggleMatchFields = toggleMatchFields;

// Update session type
window.updateSessionType = function() {
    const sessionTypeSelect = document.getElementById('sessionTypeSelect');
    const sessionType = document.getElementById('sessionType');
    
    if (sessionTypeSelect && sessionType) {
        sessionType.value = sessionTypeSelect.value;
    }
    
    toggleMatchFields();
};

// Save entry - WITH ENHANCED VALIDATION AND PERFORMANCE RATINGS
window.saveEntry = async function() {
    const editingKey = document.getElementById('editingKey')?.value;
    const date = document.getElementById('entryDate').value;
    const rating = document.getElementById('sessionRating').value;
    
    if (!date || !rating) {
        showToast('Please fill in required fields', 'error');
        return;
    }
    
    const entry = {
        date: date,
        weather: document.getElementById('weatherCondition').value,
        temperature: document.getElementById('temperature').value,
        surface: document.getElementById('surface').value,
        preWorkoutMeal: document.getElementById('preWorkoutMeal').value,
        hydration: document.getElementById('hydration').value,
        sleep: document.getElementById('sleepHours').value,
        sessionType: document.getElementById('sessionTypeSelect').value,
        sessionDetails: document.getElementById('sessionDetails').value,
        rating: rating,
        notes: document.getElementById('notes').value,
        opponentName: document.getElementById('opponentName')?.value || '',
        opponentLevel: document.getElementById('opponentLevel')?.value || '',
        yourLevel: document.getElementById('yourLevel')?.value || '',
        gameScores: document.getElementById('gameScores')?.value || '',
        
        // Performance category ratings (1-10 scale)
        perfLengthWidthRating: document.getElementById('perfLengthWidthRating')?.value || '',
        perfLengthWidth: document.getElementById('perfLengthWidth')?.value || '',
        
        perfHeightPaceRating: document.getElementById('perfHeightPaceRating')?.value || '',
        perfHeightPace: document.getElementById('perfHeightPace')?.value || '',
        
        perfControlTRating: document.getElementById('perfControlTRating')?.value || '',
        perfControlT: document.getElementById('perfControlT')?.value || '',
        
        perfMovementRating: document.getElementById('perfMovementRating')?.value || '',
        perfMovement: document.getElementById('perfMovement')?.value || '',
        
        perfAttackRating: document.getElementById('perfAttackRating')?.value || '',
        perfAttack: document.getElementById('perfAttack')?.value || '',
        
        perfHittingToSpaceRating: document.getElementById('perfHittingToSpaceRating')?.value || '',
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
        if (input.id !== 'entryDate') {
            input.value = '';
        }
    });
    
    const editingKey = document.getElementById('editingKey');
    if (editingKey) editingKey.value = '';
    
    const saveBtn = document.getElementById('saveBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    
    if (saveBtn) saveBtn.textContent = '💾 Save Journal Entry';
    if (cancelBtn) cancelBtn.style.display = 'none';
    
    toggleMatchFields();
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
        weather: document.getElementById('weatherCondition')?.value || '',
        temperature: document.getElementById('temperature')?.value || '',
        surface: document.getElementById('surface')?.value || '',
        preWorkoutMeal: document.getElementById('preWorkoutMeal')?.value || '',
        hydration: document.getElementById('hydration')?.value || '',
        sleep: document.getElementById('sleepHours')?.value || '',
        sessionType: document.getElementById('sessionTypeSelect')?.value || '',
        sessionDetails: document.getElementById('sessionDetails')?.value || '',
        rating: document.getElementById('sessionRating')?.value || '',
        notes: document.getElementById('notes')?.value || '',
        
        // Include performance ratings in draft
        perfLengthWidthRating: document.getElementById('perfLengthWidthRating')?.value || '',
        perfHeightPaceRating: document.getElementById('perfHeightPaceRating')?.value || '',
        perfControlTRating: document.getElementById('perfControlTRating')?.value || '',
        perfMovementRating: document.getElementById('perfMovementRating')?.value || '',
        perfAttackRating: document.getElementById('perfAttackRating')?.value || '',
        perfHittingToSpaceRating: document.getElementById('perfHittingToSpaceRating')?.value || ''
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
            'weatherCondition': 'weather',
            'temperature': 'temperature',
            'surface': 'surface',
            'preWorkoutMeal': 'preWorkoutMeal',
            'hydration': 'hydration',
            'sleepHours': 'sleep',
            'sessionTypeSelect': 'sessionType',
            'sessionDetails': 'sessionDetails',
            'sessionRating': 'rating',
            'notes': 'notes',
            
            // Performance ratings
            'perfLengthWidthRating': 'perfLengthWidthRating',
            'perfHeightPaceRating': 'perfHeightPaceRating',
            'perfControlTRating': 'perfControlTRating',
            'perfMovementRating': 'perfMovementRating',
            'perfAttackRating': 'perfAttackRating',
            'perfHittingToSpaceRating': 'perfHittingToSpaceRating'
        };
        
        Object.keys(fieldMap).forEach(fieldId => {
            const field = document.getElementById(fieldId);
            const draftKey = fieldMap[fieldId];
            if (field && draft[draftKey]) {
                field.value = draft[draftKey];
            }
        });
        
        toggleMatchFields();
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
    } else if (tabName === 'insights') {
        if (tabs[2]) tabs[2].classList.add('active');
        if (views[2]) views[2].classList.add('active');
        if (window.loadInsights) window.loadInsights();
    }
};