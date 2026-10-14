// Import Module - Import diary entries from CSV
import { saveEntryToFirestore } from './firestore-service.js';
import { showToast } from './ui-helpers.js';
import { loadHistory } from './history.js';

// Show import dialog
export function showImportDialog() {
    const dialog = document.createElement('div');
    dialog.className = 'loading-overlay';
    dialog.innerHTML = `
        <div class="loading-content" style="min-width: 400px;">
            <h3 style="margin-bottom: 1rem; color: var(--primary);">📥 Import Diary Entries</h3>
            <p style="margin-bottom: 1rem; color: var(--gray-600); font-size: 0.9rem;">
                Upload a CSV file to import your diary entries.
            </p>
            <input type="file" id="importFileInput" accept=".csv" style="
                display: block;
                width: 100%;
                padding: 0.75rem;
                margin-bottom: 1rem;
                border: 2px dashed var(--gray-300);
                border-radius: var(--radius-md);
                cursor: pointer;
            ">
            <div style="display: flex; gap: 0.5rem; justify-content: flex-end;">
                <button onclick="window.closeImportDialog()" class="btn-secondary" style="margin: 0;">Cancel</button>
                <button onclick="window.processImportFile()" style="margin: 0;">Import</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(dialog);
}

// Close import dialog
window.closeImportDialog = function() {
    const dialog = document.querySelector('.loading-overlay');
    if (dialog) {
        dialog.remove();
    }
};

// Process import file
window.processImportFile = async function() {
    const fileInput = document.getElementById('importFileInput');
    const file = fileInput?.files[0];
    
    if (!file) {
        showToast('Please select a file', 'error');
        return;
    }
    
    if (!file.name.endsWith('.csv')) {
        showToast('Please upload a CSV file', 'error');
        return;
    }
    
    try {
        // Show loading state
        const dialog = document.querySelector('.loading-overlay .loading-content');
        if (dialog) {
            dialog.innerHTML = `
                <div class="loading-spinner"></div>
                <p style="margin-top: 1rem;">Importing entries...</p>
            `;
        }
        
        const text = await file.text();
        const entries = parseCSV(text);
        
        if (entries.length === 0) {
            showToast('No valid entries found in CSV', 'error');
            window.closeImportDialog();
            return;
        }
        
        // Import entries
        let successCount = 0;
        let errorCount = 0;
        
        for (const entry of entries) {
            try {
                const key = `entry:${new Date(entry.date).getTime()}_${Math.random().toString(36).substr(2, 9)}`;
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
            
            // Reload history if on history tab
            const historyView = document.getElementById('history');
            if (historyView && historyView.classList.contains('active')) {
                loadHistory();
            }
        } else {
            showToast('❌ Failed to import entries', 'error');
        }
        
    } catch (error) {
        console.error('Import error:', error);
        showToast('Error importing file', 'error');
        window.closeImportDialog();
    }
};

// Parse date with NZ/international format support
function parseDate(dateStr) {
    if (!dateStr) return null;
    
    // Try ISO format first (YYYY-MM-DD)
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        return dateStr;
    }
    
    // Handle DD/MM/YYYY or DD-MM-YYYY (NZ/international format)
    const dmyMatch = dateStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (dmyMatch) {
        const day = dmyMatch[1].padStart(2, '0');
        const month = dmyMatch[2].padStart(2, '0');
        const year = dmyMatch[3];
        return `${year}-${month}-${day}`;
    }
    
    // Handle MM/DD/YYYY (US format) - less common
    const mdyMatch = dateStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (mdyMatch) {
        // If first number > 12, it must be DD/MM/YYYY
        const first = parseInt(mdyMatch[1]);
        if (first > 12) {
            const day = mdyMatch[1].padStart(2, '0');
            const month = mdyMatch[2].padStart(2, '0');
            const year = mdyMatch[3];
            return `${year}-${month}-${day}`;
        }
    }
    
    // Try parsing with Date object as fallback
    try {
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        }
    } catch (e) {
        console.error('Date parse error:', dateStr);
    }
    
    return null;
}

// Parse CSV with comprehensive field mapping
function parseCSV(text) {
    const lines = text.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
        return [];
    }
    
    // Parse header
    const headers = parseCSVLine(lines[0]);
    const entries = [];
    
    // Parse data rows
    for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        
        if (values.length === 0) continue;
        
        const entry = {};
        
        // Map CSV columns to entry fields
        headers.forEach((header, index) => {
            const value = values[index] || '';
            const normalizedHeader = header.toLowerCase().trim();
            
            // Map header to field name
            if (normalizedHeader.includes('date')) {
                entry.date = parseDate(value);
            } else if (normalizedHeader.includes('weather') && !normalizedHeader.includes('condition')) {
                entry.weather = value.toLowerCase();
            } else if (normalizedHeader.includes('temperature')) {
                entry.temperature = value.replace(/[^0-9.-]/g, '');
            } else if (normalizedHeader.includes('surface')) {
                entry.surface = value;
            } else if (normalizedHeader.includes('pre-workout') || normalizedHeader.includes('meal')) {
                entry.preWorkoutMeal = value;
            } else if (normalizedHeader.includes('hydration')) {
                entry.hydration = value.replace(/[^0-9.]/g, '');
            } else if (normalizedHeader.includes('sleep')) {
                entry.sleep = value.replace(/[^0-9.]/g, '');
            } else if (normalizedHeader.includes('session type') || normalizedHeader.includes('type')) {
                entry.sessionType = value;
            } else if (normalizedHeader.includes('rating') && !normalizedHeader.includes('perf')) {
                entry.rating = value.replace(/[^0-9]/g, '');
            } else if (normalizedHeader.includes('opponent name')) {
                entry.opponentName = value;
            } else if (normalizedHeader.includes('opponent level')) {
                entry.opponentLevel = value;
            } else if (normalizedHeader.includes('your level')) {
                entry.yourLevel = value;
            } else if (normalizedHeader.includes('game scores') || normalizedHeader.includes('scores')) {
                entry.gameScores = value;
            }
            // Performance ratings (1-10 scale)
            else if (normalizedHeader.includes('length width rating') || normalizedHeader.includes('length and width rating')) {
                entry.perfLengthWidthRating = value.replace(/[^0-9]/g, '');
            } else if (normalizedHeader.includes('length') && normalizedHeader.includes('notes')) {
                entry.perfLengthWidth = value;
            } else if (normalizedHeader.includes('height pace rating') || normalizedHeader.includes('height and pace rating')) {
                entry.perfHeightPaceRating = value.replace(/[^0-9]/g, '');
            } else if (normalizedHeader.includes('height') && normalizedHeader.includes('notes')) {
                entry.perfHeightPace = value;
            } else if (normalizedHeader.includes('control t rating') || normalizedHeader.includes('control and t')) {
                entry.perfControlTRating = value.replace(/[^0-9]/g, '');
            } else if (normalizedHeader.includes('control') && normalizedHeader.includes('notes')) {
                entry.perfControlT = value;
            } else if (normalizedHeader.includes('movement rating')) {
                entry.perfMovementRating = value.replace(/[^0-9]/g, '');
            } else if (normalizedHeader.includes('movement') && normalizedHeader.includes('notes')) {
                entry.perfMovement = value;
            } else if (normalizedHeader.includes('attack rating')) {
                entry.perfAttackRating = value.replace(/[^0-9]/g, '');
            } else if (normalizedHeader.includes('attack') && normalizedHeader.includes('notes')) {
                entry.perfAttack = value;
            } else if (normalizedHeader.includes('hitting to space rating') || normalizedHeader.includes('space rating')) {
                entry.perfHittingToSpaceRating = value.replace(/[^0-9]/g, '');
            } else if (normalizedHeader.includes('space') && normalizedHeader.includes('notes')) {
                entry.perfHittingToSpace = value;
            }
            // Opponent analysis
            else if (normalizedHeader.includes('opponent') && normalizedHeader.includes('strength')) {
                entry.oppStrengths = value;
            } else if (normalizedHeader.includes('opponent') && normalizedHeader.includes('weakness')) {
                entry.oppWeaknesses = value;
            } else if (normalizedHeader.includes('summary')) {
                entry.matchSummary = value;
            } else if (normalizedHeader.includes('one thing')) {
                entry.oneThingToWorkOn = value;
            } else if (normalizedHeader.includes('session details') || normalizedHeader.includes('details')) {
                entry.sessionDetails = value;
            } else if (normalizedHeader.includes('notes') && !normalizedHeader.includes('perf')) {
                entry.notes = value;
            }
        });
        
        // Validate required fields
        if (entry.date && entry.rating) {
            // Date is already formatted correctly from parseDate function
            entries.push(entry);
        }
    }
    
    return entries;
}

// Parse a single CSV line (handles quoted fields)
function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
                // Escaped quote
                current += '"';
                i++;
            } else {
                // Toggle quotes
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            // End of field
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    
    // Add last field
    result.push(current.trim());
    
    return result;
}

// Make function available globally
window.showImportDialog = showImportDialog;