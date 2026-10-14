// Admin Module - every athlete's journal entries (view and edit)
// Admins are accounts that have a document at admins/{their user id} in Firestore.
// That document can only be created in the Firebase console.
import { db, auth, onAuthStateChanged, doc, setDoc, getDoc, getDocs, collection } from './firebase-config.js';
import { collectionGroup } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { createEntryCard, showToast, esc } from './ui-helpers.js';
import { setFormData } from './form-handlers.js';
import { CSV_COLUMNS, SESSION_TYPES, distractionsToText } from './fields.js';

const MAX_CARDS = 300;

let isAdmin = false;
let entries = [];      // every athlete's entries, each with uid + a composite key
let profiles = {};     // uid -> { email }
let shown = [];        // entries matching the current filters
const filters = { athlete: '', session: '', range: 'all', focus: '', search: '', sort: 'date-desc' };

const num = v => { const n = parseFloat(v); return isNaN(n) ? null : n; };
const mean = a => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
const $ = id => document.getElementById(id);

// ---------- sign-in state ----------
onAuthStateChanged(auth, async (user) => {
    isAdmin = false;
    entries = [];
    profiles = {};
    setAdminVisible(false);
    if (!user) return;

    // keep a small profile (email) so admins can see who each athlete is
    try {
        await setDoc(doc(db, 'users', user.uid), { email: user.email || '', lastLogin: Date.now() }, { merge: true });
    } catch (err) {
        console.warn('Could not update profile:', err.code || err);
    }

    try {
        const snap = await getDoc(doc(db, 'admins', user.uid));
        isAdmin = snap.exists();
    } catch (err) {
        isAdmin = false;
    }
    setAdminVisible(isAdmin);
});

function setAdminVisible(visible) {
    const tab = $('adminTab');
    if (tab) tab.style.display = visible ? '' : 'none';
    if (!visible) {
        const content = $('adminContent');
        if (content) content.innerHTML = '';
        if ($('admin')?.classList.contains('active') && window.switchTab) window.switchTab('journal');
        hideAdminEditBanner();
    }
}

// ---------- data ----------
function labelFor(uid) {
    const email = profiles[uid]?.email || '';
    const latest = entries
        .filter(e => e.uid === uid && e.athleteName)
        .sort((a, b) => String(b.date).localeCompare(String(a.date)))[0];
    const name = latest?.athleteName || '';
    if (name && email) return `${name} (${email})`;
    return name || email || `Athlete ${uid.slice(0, 6)}`;
}

async function fetchAll() {
    const [entrySnap, userSnap] = await Promise.all([
        getDocs(collectionGroup(db, 'entries')),
        getDocs(collection(db, 'users'))
    ]);

    profiles = {};
    userSnap.forEach(d => { profiles[d.id] = d.data(); });

    entries = [];
    entrySnap.forEach(d => {
        const uid = d.ref.parent.parent?.id;
        if (!uid) return;
        entries.push({ ...d.data(), uid, entryId: d.id, key: `admin:${uid}:${d.id}` });
    });
}

function athleteList() {
    const byUid = {};
    entries.forEach(e => { (byUid[e.uid] = byUid[e.uid] || []).push(e); });
    return Object.entries(byUid).map(([uid, list]) => ({
        uid,
        label: labelFor(uid),
        count: list.length,
        avgFocus: mean(list.map(e => num(e.focusRating)).filter(v => v !== null)),
        avgRPE: mean(list.map(e => num(e.rpe)).filter(v => v !== null)),
        last: list.map(e => String(e.date || '')).sort().pop() || ''
    })).sort((a, b) => a.label.localeCompare(b.label));
}

// ---------- screen ----------
export async function loadAdmin() {
    const content = $('adminContent');
    if (!content) return;

    if (!isAdmin) {
        content.innerHTML = '<div class="no-entries">This account is not an admin.</div>';
        return;
    }

    content.innerHTML = '<div class="no-entries">Loading all athletes...</div>';
    try {
        await fetchAll();
    } catch (err) {
        console.error('Admin load failed:', err);
        content.innerHTML = '<div class="no-entries">Could not load athlete data. Check that your account is listed in the admins collection and that the latest security rules are published.</div>';
        return;
    }

    if (entries.length === 0) {
        content.innerHTML = '<div class="no-entries">No athlete has saved an entry yet.</div>';
        return;
    }
    renderShell();
    renderLists();
}

function opt(value, label, current) {
    return `<option value="${esc(value)}"${value === current ? ' selected' : ''}>${esc(label)}</option>`;
}

function renderShell() {
    const types = [...new Set([...SESSION_TYPES, ...entries.map(e => e.sessionType).filter(Boolean)])];
    const athletes = athleteList();

    $('adminContent').innerHTML = `
        <div class="export-section">
            <button class="btn-secondary" id="adminRefresh">Refresh</button>
            <button class="btn-secondary" id="adminExport">Export shown entries to CSV</button>
        </div>
        <p class="section-intro" id="adminSummary"></p>

        <div class="filter-section">
            <h2>Filter all entries</h2>
            <div class="search-box">
                <label for="adminSearch">Search</label>
                <input type="text" id="adminSearch" value="${esc(filters.search)}" placeholder="Search names, goals, lessons, distractions, coach notes...">
            </div>
            <div class="filter-row">
                <div class="filter-group">
                    <label for="adminAthlete">Athlete</label>
                    <select id="adminAthlete">
                        ${opt('', 'All athletes', filters.athlete)}
                        ${athletes.map(a => opt(a.uid, a.label, filters.athlete)).join('')}
                    </select>
                </div>
                <div class="filter-group">
                    <label for="adminSession">Session type</label>
                    <select id="adminSession">
                        ${opt('', 'All types', filters.session)}
                        ${types.map(t => opt(t, t, filters.session)).join('')}
                    </select>
                </div>
                <div class="filter-group">
                    <label for="adminFocus">Mental focus</label>
                    <select id="adminFocus">
                        ${opt('', 'All ratings', filters.focus)}
                        ${opt('high', 'High (8–10)', filters.focus)}
                        ${opt('mid', 'Moderate (5–7)', filters.focus)}
                        ${opt('low', 'Low (1–4)', filters.focus)}
                    </select>
                </div>
                <div class="filter-group">
                    <label for="adminRange">Date range</label>
                    <select id="adminRange">
                        ${opt('all', 'All time', filters.range)}
                        ${opt('7', 'Last 7 days', filters.range)}
                        ${opt('30', 'Last 30 days', filters.range)}
                        ${opt('90', 'Last 90 days', filters.range)}
                    </select>
                </div>
            </div>
            <div class="sort-controls">
                <label for="adminSort">Sort by</label>
                <select id="adminSort">
                    ${opt('date-desc', 'Date (newest first)', filters.sort)}
                    ${opt('date-asc', 'Date (oldest first)', filters.sort)}
                    ${opt('athlete', 'Athlete (A–Z)', filters.sort)}
                    ${opt('focus-desc', 'Mental focus (highest first)', filters.sort)}
                    ${opt('focus-asc', 'Mental focus (lowest first)', filters.sort)}
                </select>
            </div>
        </div>

        <h3 class="admin-heading">Athletes</h3>
        <div class="admin-table-wrap">
            <table class="admin-table">
                <thead><tr><th>Athlete</th><th>Entries</th><th>Avg focus</th><th>Avg RPE</th><th>Last entry</th></tr></thead>
                <tbody id="adminAthletes"></tbody>
            </table>
        </div>

        <h3 class="admin-heading">Entries</h3>
        <div id="adminEntries"></div>
    `;
}

function applyFilters() {
    const now = new Date();
    const DAY = 24 * 60 * 60 * 1000;

    const list = entries.filter(e => {
        if (filters.athlete && e.uid !== filters.athlete) return false;
        if (filters.session && e.sessionType !== filters.session) return false;

        if (filters.focus) {
            const f = parseInt(e.focusRating);
            if (isNaN(f)) return false;
            if (filters.focus === 'high' && f < 8) return false;
            if (filters.focus === 'mid' && (f < 5 || f > 7)) return false;
            if (filters.focus === 'low' && f > 4) return false;
        }

        if (filters.range !== 'all') {
            const d = new Date(e.date);
            if (isNaN(d.getTime()) || d < new Date(now.getTime() - Number(filters.range) * DAY)) return false;
        }

        if (filters.search) {
            const text = [
                labelFor(e.uid), e.sessionType, e.goal1, e.goal1Strategy, e.goal2, e.goal2Strategy,
                e.highlight, e.lesson, e.resilience, e.coachNotes, e.tomorrowFocus,
                (e.distractions || []).map(d => `${d.distraction} ${d.reaction} ${d.refocus}`).join(' ')
            ].join(' ').toLowerCase();
            if (!text.includes(filters.search.toLowerCase())) return false;
        }
        return true;
    });

    const byDate = (a, b) => String(b.date).localeCompare(String(a.date));
    list.sort((a, b) => {
        if (filters.sort === 'date-asc') return -byDate(a, b);
        if (filters.sort === 'athlete') return labelFor(a.uid).localeCompare(labelFor(b.uid)) || byDate(a, b);
        if (filters.sort === 'focus-desc') return (num(b.focusRating) || 0) - (num(a.focusRating) || 0);
        if (filters.sort === 'focus-asc') return (num(a.focusRating) || 0) - (num(b.focusRating) || 0);
        return byDate(a, b);
    });
    return list;
}

function renderLists() {
    if (!$('adminEntries')) return;
    shown = applyFilters();

    const athletes = athleteList();
    $('adminSummary').textContent =
        `${athletes.length} athlete${athletes.length !== 1 ? 's' : ''} · ${entries.length} saved entr${entries.length !== 1 ? 'ies' : 'y'} · showing ${shown.length}`;

    $('adminAthletes').innerHTML = athletes.map(a => `
        <tr class="admin-athlete-row${filters.athlete === a.uid ? ' selected' : ''}" data-uid="${esc(a.uid)}" title="Click to show only this athlete">
            <td>${esc(a.label)}</td>
            <td>${a.count}</td>
            <td>${a.avgFocus === null ? '–' : a.avgFocus.toFixed(1)}</td>
            <td>${a.avgRPE === null ? '–' : a.avgRPE.toFixed(1)}</td>
            <td>${esc(a.last || '–')}</td>
        </tr>`).join('');

    const box = $('adminEntries');
    if (shown.length === 0) {
        box.innerHTML = '<div class="no-entries">No entries match these filters.</div>';
        return;
    }
    const cards = shown.slice(0, MAX_CARDS).map(e => {
        try {
            return createEntryCard(e, { admin: true, ownerLabel: labelFor(e.uid) });
        } catch (err) {
            console.error('Card error:', e.key, err);
            return '';
        }
    }).join('');
    box.innerHTML = cards + (shown.length > MAX_CARDS
        ? `<div class="no-entries">Showing the first ${MAX_CARDS} of ${shown.length}. Narrow the filters to see the rest.</div>` : '');
}

// ---------- events ----------
const CONTROL_KEYS = {
    adminAthlete: 'athlete', adminSession: 'session', adminRange: 'range',
    adminFocus: 'focus', adminSearch: 'search', adminSort: 'sort'
};

function init() {
    const content = $('adminContent');
    if (!content) return;

    const onControl = (e) => {
        const key = CONTROL_KEYS[e.target.id];
        if (!key) return;
        filters[key] = e.target.value;
        renderLists();
    };
    content.addEventListener('input', onControl);
    content.addEventListener('change', onControl);

    content.addEventListener('click', (e) => {
        if (e.target.closest('#adminRefresh')) { loadAdmin(); return; }
        if (e.target.closest('#adminExport')) { exportShown(); return; }

        const row = e.target.closest('.admin-athlete-row');
        if (row) {
            filters.athlete = filters.athlete === row.dataset.uid ? '' : row.dataset.uid;
            if ($('adminAthlete')) $('adminAthlete').value = filters.athlete;
            renderLists();
        }
    });
}
init();

// ---------- edit another athlete's entry ----------
export function adminEditEntry(key) {
    const entry = entries.find(e => e.key === key);
    if (!entry) { showToast('Entry not found. Refresh the list and try again.', 'error'); return; }

    if (window.switchTab) window.switchTab('journal');
    setFormData(entry);

    $('editingKey').value = entry.entryId;
    $('editingOwner').value = entry.uid;
    $('saveBtn').textContent = '💾 Update Entry (admin)';
    $('cancelBtn').style.display = 'block';

    const banner = $('adminEditBanner');
    if (banner) {
        banner.textContent = `Editing ${labelFor(entry.uid)}'s entry from ${entry.date} as an admin. Saving updates their journal and shows your email as the last editor.`;
        banner.style.display = 'block';
    }
    showToast('Editing athlete entry...', 'success');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function hideAdminEditBanner() {
    const banner = $('adminEditBanner');
    if (banner) { banner.style.display = 'none'; banner.textContent = ''; }
}

// ---------- CSV export of what is shown ----------
function exportShown() {
    if (shown.length === 0) { showToast('No entries to export', 'error'); return; }

    const cell = t => `"${(t ?? '').toString().replace(/"/g, '""')}"`;
    const header = ['Athlete Email', 'Athlete ID', ...CSV_COLUMNS.map(([h]) => h), 'Last Edited By'];
    const rows = [header.map(cell).join(',')];

    [...shown].sort((a, b) => String(a.date).localeCompare(String(b.date))).forEach(e => {
        rows.push([
            profiles[e.uid]?.email || '', e.uid,
            ...CSV_COLUMNS.map(([, k]) => k === 'distractions' ? distractionsToText(e.distractions) : e[k]),
            e.lastEditedBy || ''
        ].map(cell).join(','));
    });

    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trj-all-athletes-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('📊 CSV exported', 'success');
}

window.loadAdmin = loadAdmin;
window.adminEditEntry = adminEditEntry;
window.hideAdminEditBanner = hideAdminEditBanner;
