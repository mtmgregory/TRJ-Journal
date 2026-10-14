// UI Helpers Module
import { sessionLoad } from './fields.js';

export function esc(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Show toast notification
export function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = 'toast' + (type === 'error' ? ' error' : type === 'warning' ? ' warning' : '');
    toast.textContent = message;

    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

window.showToast = showToast;

function scoreClass(n) {
    if (n >= 8) return 'excellent';
    if (n >= 6) return 'good';
    if (n >= 4) return 'average';
    return 'poor';
}

function getFocusBadge(rating) {
    const n = parseInt(rating);
    if (isNaN(n)) return '';
    return `<span class="rating-badge ${scoreClass(n)}" title="Mental Focus Rating">🧠 ${n}/10</span>`;
}

function getSessionTypeBadge(sessionType) {
    if (!sessionType) return '';
    let cls = 'session-type-badge';
    if (/s&c|physical/i.test(sessionType)) cls += ' training';
    else if (/on court|technical|tactical|match/i.test(sessionType)) cls += ' match';
    else cls += ' recovery';
    return `<span class="${cls}">${esc(sessionType)}</span>`;
}

function indicator(cls, text) {
    return `<span class="health-indicator ${cls}">${text}</span>`;
}

function getHealthIndicators(entry) {
    const out = [];
    const sleep = parseFloat(entry.sleep);
    if (!isNaN(sleep)) {
        const cls = sleep >= 7.5 ? 'good' : sleep >= 6 ? 'average' : 'poor';
        out.push(indicator(cls, `😴 ${sleep}h`));
    }
    const sq = parseInt(entry.sleepQuality);
    if (!isNaN(sq)) {
        const cls = sq >= 7 ? 'good' : sq >= 5 ? 'average' : 'poor';
        out.push(indicator(cls, `💤 Quality ${sq}/10`));
    }
    const hyd = parseFloat(entry.hydration);
    if (!isNaN(hyd)) {
        const cls = hyd >= 2.5 ? 'good' : hyd >= 1.5 ? 'average' : 'poor';
        out.push(indicator(cls, `💧 ${hyd}L`));
    }
    const sore = parseInt(entry.soreness);
    if (!isNaN(sore)) {
        // lower soreness is better
        const cls = sore <= 3 ? 'good' : sore <= 6 ? 'average' : 'poor';
        out.push(indicator(cls, `🦵 Soreness ${sore}/10`));
    }
    const mood = parseInt(entry.mood);
    if (!isNaN(mood)) {
        const cls = mood >= 7 ? 'good' : mood >= 5 ? 'average' : 'poor';
        out.push(indicator(cls, `🙂 Mood ${mood}/10`));
    }
    const stress = parseInt(entry.stress);
    if (!isNaN(stress)) {
        const cls = stress <= 3 ? 'good' : stress <= 6 ? 'average' : 'poor';
        out.push(indicator(cls, `😬 Stress ${stress}/10`));
    }
    const fatigue = parseInt(entry.fatigue);
    if (!isNaN(fatigue)) {
        const cls = fatigue <= 3 ? 'good' : fatigue <= 6 ? 'average' : 'poor';
        out.push(indicator(cls, `🔋 Fatigue ${fatigue}/10`));
    }
    return out.length ? `<div class="health-metrics">${out.join('')}</div>` : '';
}

function detail(label, value, extraClass = '') {
    if (value === undefined || value === null || value === '') return '';
    return `
        <div class="detail-item" style="margin-bottom: 10px;">
            <div class="detail-label">${label}</div>
            <div class="detail-value ${extraClass}" style="white-space: pre-wrap;">${esc(value)}</div>
        </div>`;
}

function gridDetail(label, value, stat = true) {
    return `
        <div class="detail-item">
            <div class="detail-label">${label}</div>
            <div class="detail-value ${stat ? 'stat' : ''}">${value ? esc(value) : 'N/A'}</div>
        </div>`;
}

function goalBlock(num, goal, strategy, score) {
    const hasScore = score !== undefined && score !== null && score !== '';
    if (!goal && !strategy && !hasScore) return '';
    return `
        <div class="detail-item" style="margin-bottom: 10px;">
            <div class="detail-label">🎯 Process Goal ${num}${hasScore ? ` · achieved ${esc(score)}%` : ''}</div>
            <div class="detail-value" style="white-space: pre-wrap;">${esc(goal || '—')}</div>
            ${strategy ? `<div class="detail-label" style="margin-top:0.5rem;">Execution Strategy</div>
            <div class="detail-value" style="white-space: pre-wrap; font-weight: 500;">${esc(strategy)}</div>` : ''}
        </div>`;
}

function distractionTable(list) {
    const rows = (list || []).filter(d => d && (d.distraction || d.reaction || d.refocus));
    if (rows.length === 0) return '';
    return `
        <div class="detail-item" style="margin-bottom: 10px;">
            <div class="detail-label">🧩 Distraction Control Audit</div>
            <div class="distraction-view">
                ${rows.map(d => `
                    <div class="distraction-view-row">
                        <div><span class="dv-label">Distraction</span>${esc(d.distraction || '—')}</div>
                        <div><span class="dv-label">Reaction</span>${esc(d.reaction || '—')}</div>
                        <div><span class="dv-label">Refocus Routine</span>${esc(d.refocus || '—')}</div>
                        <div><span class="dv-label">Did it work?</span>${d.effect ? esc(d.effect) + '/5' : '—'}</div>
                    </div>`).join('')}
            </div>
        </div>`;
}

// Create entry card HTML
export function createEntryCard(entry, options = {}) {
    const parts = String(entry.date || '').split('-');
    const date = parts.length === 3 ? new Date(parts[0], parts[1] - 1, parts[2]) : new Date(entry.date);
    const formattedDate = date.toLocaleDateString('en-US', {
        weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
    });

    const rpe = parseInt(entry.rpe);
    const load = sessionLoad(entry);

    const headerInfo = `
        <div class="entry-header-info">
            <div class="entry-date-row">
                <span class="entry-date">${esc(formattedDate)}</span>
                ${(options.ownerLabel || entry.athleteName) ? `<span class="opponent-badge">👤 ${esc(options.ownerLabel || entry.athleteName)}</span>` : ''}
            </div>
            <div class="entry-badges-row">
                ${getSessionTypeBadge(entry.sessionType)}
                ${!isNaN(rpe) ? `<span class="opponent-badge" title="Session RPE">🔥 RPE ${rpe}/10</span>` : ''}
                ${load !== null ? `<span class="opponent-badge" title="Session load = RPE × minutes">⚡ Load ${load}</span>` : ''}
            </div>
            ${getHealthIndicators(entry)}
        </div>
        <div class="rating-container">
            ${getFocusBadge(entry.focusRating)}
        </div>
    `;

    return `
        <div class="entry-card" data-entry-key="${esc(entry.key)}">
            <div class="entry-card-header">
                <div class="entry-card-summary">${headerInfo}</div>
                <div class="expand-toggle"></div>
            </div>

            <div class="entry-card-body">
                <div class="entry-details">
                    ${gridDetail('Session Type', entry.sessionType, false)}
                    ${gridDetail('Sleep', entry.sleep ? entry.sleep + ' hrs' : '')}
                    ${gridDetail('Sleep Quality', entry.sleepQuality ? entry.sleepQuality + '/10' : '')}
                    ${gridDetail('Hydration', entry.hydration ? entry.hydration + ' L' : '')}
                    ${gridDetail('Muscle Soreness', entry.soreness ? entry.soreness + '/10' : '')}
                    ${gridDetail('Mood', entry.mood ? entry.mood + '/10' : '')}
                    ${gridDetail('Perceived Stress', entry.stress ? entry.stress + '/10' : '')}
                    ${gridDetail('Fatigue', entry.fatigue ? entry.fatigue + '/10' : '')}
                    ${gridDetail('Session Duration', entry.duration ? entry.duration + ' min' : '')}
                    ${gridDetail('Session RPE', entry.rpe ? entry.rpe + '/10' : '')}
                    ${gridDetail('Session Load', load !== null ? load + ' AU' : '')}
                    ${gridDetail('Mental Focus', entry.focusRating ? entry.focusRating + '/10' : '')}
                </div>
                ${goalBlock(1, entry.goal1, entry.goal1Strategy, entry.goal1Score)}
                ${goalBlock(2, entry.goal2, entry.goal2Strategy, entry.goal2Score)}
                ${detail('✨ Highlight / Evidence', entry.highlight)}
                ${detail('💡 Key Lesson Learned', entry.lesson)}
                ${detail('🛡️ Determination & Resilience', entry.resilience)}
                ${distractionTable(entry.distractions)}
                ${detail('📋 Coach Feedback / Debrief Notes', entry.coachNotes)}
                ${detail("➡️ Target Focus for Tomorrow's Session", entry.tomorrowFocus)}
                ${entry.lastEditedBy ? detail('✏️ Last edited by', entry.lastEditedBy + (entry.lastEditedAt ? ' on ' + new Date(entry.lastEditedAt).toLocaleDateString('en-NZ') : '')) : ''}
                <div class="btn-group">
                    <button class="edit-btn">✏️ Edit</button>
                    ${options.admin ? '' : '<button class="delete-btn">🗑️ Delete</button>'}
                </div>
            </div>
        </div>
    `;
}

// Toggle entry expansion
window.toggleEntryExpand = function(key) {
    const card = document.querySelector(`[data-entry-key="${CSS.escape(key)}"]`);
    if (card) card.classList.toggle('expanded');
};
