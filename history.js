// History Module - Enhanced with Performance Rating Support
import { 
    getAllEntriesFromFirestore, 
    getEntryFromFirestore, 
    deleteEntryFromFirestore 
} from './firestore-service.js';
import { createEntryCard, showToast } from './ui-helpers.js';
import { toggleMatchFields } from './form-handlers.js';

let searchTimeout;
window.debouncedSearch = function() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        loadHistory();
    }, 300);
};

// Load history with filters - ENHANCED ERROR HANDLING
export async function loadHistory() {
    const container = document.getElementById('entriesContainer');
    const filterRating = document.getElementById('filterRating')?.value || '';
    const dateRange = document.getElementById('dateRange')?.value || 'all';
    const sortBy = document.getElementById('sortBy')?.value || 'date-desc';
    const searchKeyword = document.getElementById('searchKeyword')?.value?.toLowerCase() || '';

    if (!container) {
        console.error('Entries container not found');
        return;
    }

    try {
        // Show loading state
        container.innerHTML = '<div class="no-entries">Loading entries...</div>';
        
        const entries = await getAllEntriesFromFirestore();
        
        if (!entries || entries.length === 0) {
            container.innerHTML = '<div class="no-entries">📝 No entries yet. Start by creating your first journal entry!</div>';
            return;
        }

        // Filter entries
        let filtered = entries.filter(e => {
            try {
                if (filterRating && e.rating !== filterRating) return false;
                
                const entryDate = new Date(e.date);
                if (isNaN(entryDate.getTime())) {
                    console.warn('Invalid date for entry:', e.key);
                    return false;
                }
                
                const now = new Date();
                
                if (dateRange === '7') {
                    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                    if (entryDate < sevenDaysAgo) return false;
                } else if (dateRange === '30') {
                    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                    if (entryDate < thirtyDaysAgo) return false;
                } else if (dateRange === '90') {
                    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
                    if (entryDate < ninetyDaysAgo) return false;
                } else if (dateRange === 'month') {
                    if (entryDate.getMonth() !== now.getMonth() || 
                        entryDate.getFullYear() !== now.getFullYear()) return false;
                } else if (dateRange === 'year') {
                    if (entryDate.getFullYear() !== now.getFullYear()) return false;
                }
                
                if (searchKeyword) {
                    const searchableText = `${e.sessionType || ''} ${e.sessionDetails || ''} ${e.preWorkoutMeal || ''} ${e.notes || ''} ${e.opponentName || ''} ${e.matchSummary || ''} ${e.oneThingToWorkOn || ''}`.toLowerCase();
                    if (!searchableText.includes(searchKeyword)) return false;
                }
                
                return true;
            } catch (err) {
                console.error('Error filtering entry:', e.key, err);
                return false;
            }
        });

        // Sort entries
        filtered.sort((a, b) => {
            try {
                if (sortBy === 'date-desc') return new Date(b.date) - new Date(a.date);
                if (sortBy === 'date-asc') return new Date(a.date) - new Date(b.date);
                if (sortBy === 'rating-desc') return parseInt(b.rating || 0) - parseInt(a.rating || 0);
                if (sortBy === 'rating-asc') return parseInt(a.rating || 0) - parseInt(b.rating || 0);
                if (sortBy === 'sleep-desc') return parseFloat(b.sleep || 0) - parseFloat(a.sleep || 0);
                if (sortBy === 'sleep-asc') return parseFloat(a.sleep || 0) - parseFloat(b.sleep || 0);
                return 0;
            } catch (err) {
                console.error('Error sorting entries:', err);
                return 0;
            }
        });

        if (filtered.length === 0) {
            container.innerHTML = '<div class="no-entries">🔍 No entries match your filters.</div>';
            return;
        }

        container.innerHTML = filtered.map(entry => {
            try {
                return createEntryCard(entry);
            } catch (err) {
                console.error('Error creating card for entry:', entry.key, err);
                return '';
            }
        }).filter(Boolean).join('');
        
    } catch (error) {
        console.error('Failed to load history:', error);
        container.innerHTML = '<div class="no-entries">❌ Error loading entries. Please refresh the page.</div>';
        showToast('Failed to load entries. Please try again.', 'error');
    }
}

window.loadHistory = loadHistory;

// Edit entry - ENHANCED WITH PERFORMANCE RATINGS
export async function editEntry(key) {
    if (!key) {
        showToast('Invalid entry key', 'error');
        return;
    }
    
    try {
        const data = await getEntryFromFirestore(key);
        if (!data || !data.value) {
            showToast('Entry not found', 'error');
            return;
        }
        
        let entry;
        try {
            entry = JSON.parse(data.value);
        } catch (parseError) {
            console.error('Failed to parse entry data:', parseError);
            showToast('Invalid entry data', 'error');
            return;
        }
        
        // Switch to journal tab
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        
        const firstTab = document.querySelector('.tab:first-child');
        const journalView = document.getElementById('journal');
        
        if (firstTab) firstTab.classList.add('active');
        if (journalView) journalView.classList.add('active');
        
        // Populate form fields - INCLUDES ALL PERFORMANCE RATINGS
        const fieldMap = {
            'entryDate': entry.date,
            'weatherCondition': entry.weather,
            'temperature': entry.temperature,
            'surface': entry.surface,
            'preWorkoutMeal': entry.preWorkoutMeal,
            'hydration': entry.hydration,
            'sleepHours': entry.sleep,
            'sessionType': entry.sessionType,
            'sessionTypeSelect': entry.sessionType,
            'sessionDetails': entry.sessionDetails,
            'sessionRating': entry.rating,
            'notes': entry.notes,
            'opponentName': entry.opponentName,
            'opponentLevel': entry.opponentLevel,
            'yourLevel': entry.yourLevel,
            'gameScores': entry.gameScores,
            
            // Performance category ratings (1-10 scale)
            'perfLengthWidthRating': entry.perfLengthWidthRating,
            'perfLengthWidth': entry.perfLengthWidth,
            
            'perfHeightPaceRating': entry.perfHeightPaceRating,
            'perfHeightPace': entry.perfHeightPace,
            
            'perfControlTRating': entry.perfControlTRating,
            'perfControlT': entry.perfControlT,
            
            'perfMovementRating': entry.perfMovementRating,
            'perfMovement': entry.perfMovement,
            
            'perfAttackRating': entry.perfAttackRating,
            'perfAttack': entry.perfAttack,
            
            'perfHittingToSpaceRating': entry.perfHittingToSpaceRating,
            'perfHittingToSpace': entry.perfHittingToSpace,
            
            'oppStrengths': entry.oppStrengths,
            'oppWeaknesses': entry.oppWeaknesses,
            'matchSummary': entry.matchSummary,
            'oneThingToWorkOn': entry.oneThingToWorkOn
        };
        
        Object.keys(fieldMap).forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.value = fieldMap[fieldId] || '';
            } else {
                console.warn('Field not found:', fieldId);
            }
        });
        
        const editingKey = document.getElementById('editingKey');
        if (editingKey) editingKey.value = key;
        
        toggleMatchFields();
        
        const saveBtn = document.getElementById('saveBtn');
        const cancelBtn = document.getElementById('cancelBtn');
        
        if (saveBtn) saveBtn.textContent = '💾 Update Entry';
        if (cancelBtn) cancelBtn.style.display = 'block';
        
        showToast('Editing entry...', 'success');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
    } catch (error) {
        console.error('Failed to load entry for editing:', error);
        showToast('Error loading entry. Please try again.', 'error');
    }
}

window.editEntry = editEntry;

// Delete entry - ENHANCED WITH DOM UPDATE
export async function deleteEntry(key) {
    if (!key) {
        showToast('Invalid entry key', 'error');
        return;
    }
    
    if (!confirm('Are you sure you want to delete this entry? This action cannot be undone.')) {
        return;
    }
    
    try {
        await deleteEntryFromFirestore(key);
        
        // Remove from DOM directly for better UX
        const card = document.querySelector(`[data-entry-key="${key}"]`);
        if (card) {
            card.style.animation = 'fadeOut 0.3s ease-out';
            card.style.opacity = '0';
            card.style.transform = 'translateY(-20px)';
            
            setTimeout(() => {
                card.remove();
                
                // Check if container is now empty
                const container = document.getElementById('entriesContainer');
                if (container && !container.querySelector('.entry-card')) {
                    container.innerHTML = '<div class="no-entries">📝 No entries yet. Start by creating your first journal entry!</div>';
                }
            }, 300);
        }
        
        showToast('Entry deleted successfully', 'success');
        
    } catch (error) {
        console.error('Failed to delete entry:', error);
        showToast('Failed to delete entry. Please try again.', 'error');
    }
}

window.deleteEntry = deleteEntry;