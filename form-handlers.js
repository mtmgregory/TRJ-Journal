// Form Handlers Module - High-Performance Athlete Daily Journal
import { saveEntryToFirestore, saveDraftToFirestore, loadDraftFromFirestore, deleteDraftFromFirestore } from './firestore-service.js';
import { showToast, esc } from './ui-helpers.js';
import { FIELD_MAP } from './fields.js';
import { saveEntryAsAdmin } from './admin-service.js';
import { getCurrentUser } from './auth.js';

let autoSaveTimer = null;
let isSaving = false;
let pendingSave = false;

// ---------- Distraction rows ----------
function distractionRowHTML(d = {}) {
    return `
        <div class="distraction-row">
            <div>
                <label>Distraction Encountered</label>
                <input type="text" class="d-distraction" placeholder="e.g., Unfair referee call / Lactic fatigue" value="${esc(d.distraction)}">
            </div>
            <div>
                <label>Emotional &amp; Physical Reaction</label>
                <input type="text" class="d-reaction" placeholder="e.g., Increased heart rate, frustration" value="${esc(d.reaction)}">
            </div>
            <div>
                <label>Refocusing Cue / Routine Used</label>
                <input type="text" class="d-refocus" placeholder='e.g., Cue word "Next Point" + 4-7-8 breath reset' value="${esc(d.refocus)}">
            </div>
            <div>
                <label>Did it work? (1–5)</label>
                <select class="d-effect">
                    <option value="">Rate</option>
                    ${[1, 2, 3, 4, 5].map(n => `<option value="${n}"${String(d.effect) === String(n) ? ' selected' : ''}>${n}${n === 1 ? ' – Not at all' : n === 5 ? ' – Fully' : ''}</option>`).join('')}
                </select>
            </div>
            <button type="button" class="distraction-remove" title="Remove row" onclick="removeDistractionRow(this)">✕</button>
        </div>`;
}

export function setDistractions(list) {
    const container = document.getElementById('distractionRows');
    if (!container) return;
    const rows = Array.isArray(list) && list.length ? list : [{}];
    container.innerHTML = rows.map(distractionRowHTML).join('');
}

window.addDistractionRow = function() {
    const container = document.getElementById('distractionRows');
    if (container) container.insertAdjacentHTML('beforeend', distractionRowHTML());
};

window.removeDistractionRow = function(btn) {
    const container = document.getElementById('distractionRows');
    const row = btn.closest('.distraction-row');
    if (row) row.remove();
    if (container && !container.querySelector('.distraction-row')) window.addDistractionRow();
    scheduleAutoSave();
};

function collectDistractions() {
    return Array.from(document.querySelectorAll('#distractionRows .distraction-row'))
        .map(row => ({
            distraction: row.querySelector('.d-distraction')?.value.trim() || '',
            reaction: row.querySelector('.d-reaction')?.value.trim() || '',
            refocus: row.querySelector('.d-refocus')?.value.trim() || '',
            effect: row.querySelector('.d-effect')?.value || ''
        }))
        .filter(d => d.distraction || d.reaction || d.refocus);
}

// ---------- Form <-> data ----------
export function getFormData() {
    const data = {};
    Object.entries(FIELD_MAP).forEach(([id, key]) => {
        data[key] = document.getElementById(id)?.value ?? '';
    });
    data.distractions = collectDistractions();
    return data;
}

export function setFormData(entry, { skipEmpty = false } = {}) {
    Object.entries(FIELD_MAP).forEach(([id, key]) => {
        const field = document.getElementById(id);
        if (!field) return;
        const value = entry[key];
        if (skipEmpty && (value === undefined || value === null || value === '')) return;
        // an older entry may use a session type that is no longer in the list: keep it selectable
        if (field.tagName === 'SELECT' && value && ![...field.options].some(o => o.value === value)) {
            field.add(new Option(value, value));
        }
        field.value = value ?? '';
    });
    setDistractions(entry.distractions);
}

// ---------- Validation ----------
function checkScale(errors, value, label, min = 1, max = 10, integer = true) {
    if (value === '' || value === null || value === undefined) return;
    const n = integer ? parseInt(value) : parseFloat(value);
    if (isNaN(n) || n < min || n > max) errors.push(`${label} must be between ${min} and ${max}`);
}

function validateEntry(entry) {
    const errors = [];

    if (!entry.date) {
        errors.push('Date is required');
    } else if (isNaN(new Date(entry.date).getTime())) {
        errors.push('Invalid date format');
    }

    if (!entry.sessionType) errors.push('Session type is required');
    if (!entry.focusRating) errors.push('Mental focus rating is required');

    checkScale(errors, entry.focusRating, 'Mental focus rating');
    checkScale(errors, entry.rpe, 'Session RPE');
    checkScale(errors, entry.sleepQuality, 'Sleep quality score');
    checkScale(errors, entry.soreness, 'Soreness score');
    checkScale(errors, entry.mood, 'Mood score');
    checkScale(errors, entry.stress, 'Perceived stress score');
    checkScale(errors, entry.fatigue, 'Fatigue score');
    checkScale(errors, entry.duration, 'Session duration', 1, 600);
    checkScale(errors, entry.goal1Score, 'Goal 1 achieved', 0, 100);
    checkScale(errors, entry.goal2Score, 'Goal 2 achieved', 0, 100);
    checkScale(errors, entry.sleep, 'Sleep duration', 0, 24, false);
    checkScale(errors, entry.hydration, 'Hydration', 0, 20, false);

    return errors;
}

// ---------- Save / clear / cancel ----------
window.saveEntry = async function() {
    const editingKey = document.getElementById('editingKey')?.value;
    const editingOwner = document.getElementById('editingOwner')?.value;
    const entry = getFormData();

    if (!entry.date || !entry.sessionType || !entry.focusRating) {
        showToast('Please fill in the date, session type and mental focus rating', 'error');
        return;
    }

    const errors = validateEntry(entry);
    if (errors.length > 0) {
        showToast(errors.join('. '), 'error');
        return;
    }

    try {
        clearTimeout(autoSaveTimer);
        const key = editingKey || `entry:${Date.now()}`;
        if (editingOwner) {
            // an admin updating another athlete's entry
            await saveEntryAsAdmin(editingOwner, editingKey, entry, getCurrentUser());
        } else {
            await saveEntryToFirestore(key, entry);
        }

        showToast(editingKey ? '✅ Entry updated!' : '✅ Entry saved!', 'success');

        clearForm();
        await deleteDraftFromFirestore();

        if (window.switchTab) window.switchTab(editingOwner ? 'admin' : 'history');
    } catch (error) {
        console.error('Failed to save entry:', error);
        showToast('Error saving entry. Please try again.', 'error');
    }
};

window.clearForm = function() {
    const form = document.querySelector('#journal');
    if (!form) return;

    const wasAdminEdit = !!document.getElementById('editingOwner')?.value;

    // keep the date and athlete name so they don't need retyping
    form.querySelectorAll('input, textarea, select').forEach(input => {
        if (input.id !== 'entryDate' && input.id !== 'athleteName') input.value = '';
    });
    // the name belongs to the athlete whose entry was edited, so don't carry it over
    if (wasAdminEdit) document.getElementById('athleteName').value = '';
    if (window.hideAdminEditBanner) window.hideAdminEditBanner();
    setDistractions([]);

    const editingKey = document.getElementById('editingKey');
    if (editingKey) editingKey.value = '';

    const saveBtn = document.getElementById('saveBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    if (saveBtn) saveBtn.textContent = '💾 Save Journal Entry';
    if (cancelBtn) cancelBtn.style.display = 'none';

    deleteDraftFromFirestore().catch(err => console.error('Failed to delete draft:', err));
};

window.cancelEdit = function() {
    clearForm();
    showToast('Edit cancelled', 'success');
};

// ---------- Auto-save ----------
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
            setTimeout(debouncedSaveDraft, 500);
        }
    } catch (error) {
        console.error('Auto-save failed:', error);
        showToast('Auto-save failed', 'warning');
    } finally {
        isSaving = false;
    }
}

function scheduleAutoSave() {
    clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(debouncedSaveDraft, 2000);
}

export function startAutoSave() {
    const form = document.querySelector('#journal');
    if (!form) return;
    // delegated so dynamically-added distraction rows are covered too
    form.addEventListener('input', scheduleAutoSave);
    form.addEventListener('change', scheduleAutoSave);
}

async function saveDraft() {
    const editingKey = document.getElementById('editingKey')?.value;
    if (editingKey) return; // Don't save draft when editing

    const draft = getFormData();

    const hasContent = Object.entries(draft).some(([key, val]) => {
        if (key === 'date' || key === 'athleteName') return false;
        return Array.isArray(val) ? val.length > 0 : val !== '';
    });

    if (hasContent) {
        await saveDraftToFirestore(draft);
    }
}

export async function loadDraft() {
    try {
        const draft = await loadDraftFromFirestore();
        if (!draft) return;
        setFormData(draft, { skipEmpty: true });
    } catch (error) {
        console.error('Failed to load draft:', error);
    }
}

// ---------- Tabs ----------
window.switchTab = function(tabName) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));

    const tabs = document.querySelectorAll('.tab');
    const views = document.querySelectorAll('.view');
    const idx = { journal: 0, history: 1, insights: 2, admin: 3 }[tabName];
    if (idx === undefined) return;

    if (tabs[idx]) tabs[idx].classList.add('active');
    if (views[idx]) views[idx].classList.add('active');

    if (tabName === 'history' && window.loadHistory) window.loadHistory();
    if (tabName === 'insights' && window.loadInsights) window.loadInsights();
    if (tabName === 'admin' && window.loadAdmin) window.loadAdmin();
};
