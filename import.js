// Import Module - Import journal entries from CSV (same format as the export)
import { saveEntryToFirestore } from './firestore-service.js';
import { showToast } from './ui-helpers.js';
import { loadHistory } from './history.js';
import { CSV_COLUMNS, textToDistractions } from './fields.js';

export function showImportDialog() {
    const dialog = document.createElement('div');
    dialog.className = 'loading-overlay';
    dialog.innerHTML = `
        <div class="loading-content" style="min-width: 400px;">
            <h3 style="margin-bottom: 1rem; color: var(--primary);">📥 Import Journal Entries</h3>
            <p style="margin-bottom: 1rem; color: var(--gray-600); font-size: 0.9rem;">
                Upload a CSV file exported from this journal.
            </p>
            <input type="file" id="importFileInput" accept=".csv" style="
                display: block; width: 100%; padding: 0.75rem; margin-bottom: 1rem;
                border: 2px dashed var(--gray-300); border-radius: var(--radius-md); cursor: pointer;">
            <div style="display: flex; gap: 0.5rem; justify-content: flex-end;">
                <button onclick="window.closeImportDialog()" class="btn-secondary" style="margin: 0;">Cancel</button>
                <button onclick="window.processImportFile()" style="margin: 0;">Import</button>
            </div>
        </div>
    `;
    document.body.appendChild(dialog);
}

window.closeImportDialog = function() {
    const dialog = document.querySelector('.loading-overlay');
    if (dialog) dialog.remove();
};

window.processImportFile = async function() {
    const file = document.getElementById('importFileInput')?.files[0];

    if (!file) {
        showToast('Please select a file', 'error');
        return;
    }
    if (!file.name.toLowerCase().endsWith('.csv')) {
        showToast('Please upload a CSV file', 'error');
        return;
    }

    try {
        const dialog = document.querySelector('.loading-overlay .loading-content');
        if (dialog) {
            dialog.innerHTML = `
                <div class="loading-spinner"></div>
                <p style="margin-top: 1rem;">Importing entries...</p>`;
        }

        const text = await file.text();
        const entries = parseCSV(text);

        if (entries.length === 0) {
            showToast('No valid entries found in CSV', 'error');
            window.closeImportDialog();
            return;
        }

        let successCount = 0;
        let errorCount = 0;

        for (const entry of entries) {
            try {
                const key = `entry:${new Date(entry.date).getTime()}_${Math.random().toString(36).slice(2, 11)}`;
                await saveEntryToFirestore(key, entry);
                successCount++;
            } catch (err) {
                console.error('Failed to import entry:', err);
                errorCount++;
            }
        }

        window.closeImportDialog();

        if (successCount > 0) {
            showToast(`✅ Successfully imported ${successCount} entries${errorCount > 0 ? ` (${errorCount} failed)` : ''}`, 'success');
            const historyView = document.getElementById('history');
            if (historyView && historyView.classList.contains('active')) loadHistory();
        } else {
            showToast('❌ Failed to import entries', 'error');
        }

    } catch (error) {
        console.error('Import error:', error);
        showToast('Error importing file', 'error');
        window.closeImportDialog();
    }
};

// Parse date with NZ/international format support -> YYYY-MM-DD
function parseDate(dateStr) {
    if (!dateStr) return null;
    dateStr = dateStr.trim();

    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;

    const dmy = dateStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (dmy) {
        return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
    }

    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    }
    return null;
}

const NUMERIC_KEYS = {
    sleep: true, hydration: true,
    sleepQuality: false, soreness: false, mood: false, stress: false, fatigue: false,
    duration: false, goal1Score: false, goal2Score: false, rpe: false, focusRating: false
};

function parseCSV(text) {
    const rows = parseCSVText(text).filter(r => r.some(c => c.trim() !== ''));
    if (rows.length < 2) return [];

    const headerToKey = {};
    CSV_COLUMNS.forEach(([header, key]) => { headerToKey[header.toLowerCase()] = key; });

    const keys = rows[0].map(h => headerToKey[h.trim().toLowerCase()] || null);
    const entries = [];

    for (let i = 1; i < rows.length; i++) {
        const entry = {};
        keys.forEach((key, idx) => {
            if (!key) return;
            const value = (rows[i][idx] || '').trim();

            if (key === 'date') entry.date = parseDate(value);
            else if (key === 'distractions') entry.distractions = textToDistractions(value);
            else if (key in NUMERIC_KEYS) entry[key] = value.replace(NUMERIC_KEYS[key] ? /[^0-9.]/g : /[^0-9]/g, '');
            else entry[key] = value;
        });

        if (entry.date && entry.sessionType) {
            if (!entry.distractions) entry.distractions = [];
            entries.push(entry);
        }
    }
    return entries;
}

// Full CSV parser (handles quoted fields, escaped quotes and newlines inside quotes)
function parseCSVText(text) {
    const rows = [];
    let row = [];
    let cur = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
        const ch = text[i];

        if (inQuotes) {
            if (ch === '"') {
                if (text[i + 1] === '"') { cur += '"'; i++; }
                else inQuotes = false;
            } else {
                cur += ch;
            }
        } else if (ch === '"') {
            inQuotes = true;
        } else if (ch === ',') {
            row.push(cur);
            cur = '';
        } else if (ch === '\n' || ch === '\r') {
            if (ch === '\r' && text[i + 1] === '\n') i++;
            row.push(cur);
            rows.push(row);
            row = [];
            cur = '';
        } else {
            cur += ch;
        }
    }
    row.push(cur);
    rows.push(row);
    return rows;
}

window.showImportDialog = showImportDialog;
