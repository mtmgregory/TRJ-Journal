// History Module
import {
    getAllEntriesFromFirestore,
    getEntryFromFirestore,
    deleteEntryFromFirestore
} from './firestore-service.js';
import { createEntryCard, showToast } from './ui-helpers.js';
import { setFormData } from './form-handlers.js';
import { sessionLoad } from './fields.js';

let searchTimeout;
window.debouncedSearch = function() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => loadHistory(), 300);
};

const num = v => {
    const n = parseFloat(v);
    return isNaN(n) ? 0 : n;
};

export async function loadHistory() {
    const container = document.getElementById('entriesContainer');
    const filterFocus = document.getElementById('filterRating')?.value || '';
    const filterSession = document.getElementById('filterSessionType')?.value || '';
    const dateRange = document.getElementById('dateRange')?.value || 'all';
    const sortBy = document.getElementById('sortBy')?.value || 'date-desc';
    const searchKeyword = document.getElementById('searchKeyword')?.value?.toLowerCase() || '';

    if (!container) {
        console.error('Entries container not found');
        return;
    }

    try {
        container.innerHTML = '<div class="no-entries">Loading entries...</div>';

        const entries = await getAllEntriesFromFirestore();

        if (!entries || entries.length === 0) {
            container.innerHTML = '<div class="no-entries">📝 No entries yet. Start by creating your first journal entry!</div>';
            return;
        }

        const filtered = entries.filter(e => {
            try {
                if (filterFocus) {
                    const f = parseInt(e.focusRating);
                    if (isNaN(f)) return false;
                    if (filterFocus === 'high' && f < 8) return false;
                    if (filterFocus === 'mid' && (f < 5 || f > 7)) return false;
                    if (filterFocus === 'low' && f > 4) return false;
                }
                if (filterSession && e.sessionType !== filterSession) return false;

                const entryDate = new Date(e.date);
                if (isNaN(entryDate.getTime())) {
                    console.warn('Invalid date for entry:', e.key);
                    return false;
                }

                const now = new Date();
                const DAY = 24 * 60 * 60 * 1000;
                if (dateRange === '7' && entryDate < new Date(now.getTime() - 7 * DAY)) return false;
                if (dateRange === '30' && entryDate < new Date(now.getTime() - 30 * DAY)) return false;
                if (dateRange === '90' && entryDate < new Date(now.getTime() - 90 * DAY)) return false;
                if (dateRange === 'month' &&
                    (entryDate.getMonth() !== now.getMonth() || entryDate.getFullYear() !== now.getFullYear())) return false;
                if (dateRange === 'year' && entryDate.getFullYear() !== now.getFullYear()) return false;

                if (searchKeyword) {
                    const distractionText = (e.distractions || [])
                        .map(d => `${d.distraction || ''} ${d.reaction || ''} ${d.refocus || ''}`).join(' ');
                    const searchable = [
                        e.athleteName, e.sessionType, e.goal1, e.goal1Strategy, e.goal2, e.goal2Strategy,
                        e.highlight, e.lesson, e.resilience, e.coachNotes, e.tomorrowFocus, distractionText
                    ].join(' ').toLowerCase();
                    if (!searchable.includes(searchKeyword)) return false;
                }

                return true;
            } catch (err) {
                console.error('Error filtering entry:', e.key, err);
                return false;
            }
        });

        filtered.sort((a, b) => {
            if (sortBy === 'date-desc') return new Date(b.date) - new Date(a.date);
            if (sortBy === 'date-asc') return new Date(a.date) - new Date(b.date);
            if (sortBy === 'rating-desc') return num(b.focusRating) - num(a.focusRating);
            if (sortBy === 'rating-asc') return num(a.focusRating) - num(b.focusRating);
            if (sortBy === 'rpe-desc') return num(b.rpe) - num(a.rpe);
            if (sortBy === 'load-desc') return (sessionLoad(b) || 0) - (sessionLoad(a) || 0);
            if (sortBy === 'sleep-desc') return num(b.sleep) - num(a.sleep);
            if (sortBy === 'sleep-asc') return num(a.sleep) - num(b.sleep);
            return 0;
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

        if (window.switchTab) window.switchTab('journal');

        setFormData(entry);

        const editingKey = document.getElementById('editingKey');
        if (editingKey) editingKey.value = key;

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

        const card = document.querySelector(`[data-entry-key="${CSS.escape(key)}"]`);
        if (card) {
            card.style.animation = 'fadeOut 0.3s ease-out';
            card.style.opacity = '0';
            card.style.transform = 'translateY(-20px)';

            setTimeout(() => {
                card.remove();
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
