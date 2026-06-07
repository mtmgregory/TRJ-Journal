// UI Helpers Module

// Show toast notification
export function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;

    if (type === 'error') {
        toast.style.background = '#dc3545';
    } else if (type === 'warning') {
        toast.style.background = '#ffc107';
        toast.style.color = '#000';
    }

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 3000);
}

window.showToast = showToast;

// Format performance notes
function formatPerformanceNotes(notes) {
    if (!notes) return '';
    return `<div style="margin-top: 0.5rem; color: var(--gray-700);">${notes}</div>`;
}

// Create entry card HTML
export function createEntryCard(entry) {
    const date = new Date(entry.date);
    const formattedDate = date.toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });

    const isMatch = entry.sessionType === 'Match Day';

    // Build header info
    const headerInfo = `
        <div class="entry-header-info">
            <div class="entry-date-row">
                <span class="entry-date">${formattedDate}</span>
            </div>
            <div class="entry-badges-row">
                ${isMatch ? '<span class="session-type-badge match">Match Play</span>' : ''}
                ${isMatch && entry.opponentName ? `<span class="opponent-badge">vs ${entry.opponentName}</span>` : ''}
            </div>
        </div>
    `;

    // Match summary details (shown when expanded)
    const matchDetails = isMatch && entry.opponentName ? `
        <div class="detail-item">
            <div class="detail-label">Opponent</div>
            <div class="detail-value">${entry.opponentName || 'N/A'}</div>
        </div>
        <div class="detail-item">
            <div class="detail-label">Scores</div>
            <div class="detail-value stat">${entry.gameScores || 'N/A'}</div>
        </div>
    ` : '';

    // Performance details (match play only)
    const performanceDetails = isMatch ? `
        ${entry.perfLengthWidth ? `
            <div class="detail-item" style="margin-bottom: 10px;">
                <div class="detail-label">Length and Width</div>
                <div class="detail-value">${formatPerformanceNotes(entry.perfLengthWidth)}</div>
            </div>
        ` : ''}
        ${entry.perfHeightPace ? `
            <div class="detail-item" style="margin-bottom: 10px;">
                <div class="detail-label">Height and Pace</div>
                <div class="detail-value">${formatPerformanceNotes(entry.perfHeightPace)}</div>
            </div>
        ` : ''}
        ${entry.perfControlT ? `
            <div class="detail-item" style="margin-bottom: 10px;">
                <div class="detail-label">Control and T Position</div>
                <div class="detail-value">${formatPerformanceNotes(entry.perfControlT)}</div>
            </div>
        ` : ''}
        ${entry.perfMovement ? `
            <div class="detail-item" style="margin-bottom: 10px;">
                <div class="detail-label">Movement</div>
                <div class="detail-value">${formatPerformanceNotes(entry.perfMovement)}</div>
            </div>
        ` : ''}
        ${entry.perfAttack ? `
            <div class="detail-item" style="margin-bottom: 10px;">
                <div class="detail-label">Attack</div>
                <div class="detail-value">${formatPerformanceNotes(entry.perfAttack)}</div>
            </div>
        ` : ''}
        ${entry.perfHittingToSpace ? `
            <div class="detail-item" style="margin-bottom: 10px;">
                <div class="detail-label">Hitting to Space</div>
                <div class="detail-value">${formatPerformanceNotes(entry.perfHittingToSpace)}</div>
            </div>
        ` : ''}
        ${entry.oppStrengths ? `
            <div class="detail-item" style="margin-bottom: 10px;">
                <div class="detail-label">Opponent's Strengths</div>
                <div class="detail-value">${entry.oppStrengths}</div>
            </div>
        ` : ''}
        ${entry.oppWeaknesses ? `
            <div class="detail-item" style="margin-bottom: 10px;">
                <div class="detail-label">Opponent's Weaknesses</div>
                <div class="detail-value">${entry.oppWeaknesses}</div>
            </div>
        ` : ''}
        ${entry.matchSummary ? `
            <div class="detail-item" style="margin-bottom: 10px;">
                <div class="detail-label">Match Summary</div>
                <div class="detail-value">${entry.matchSummary}</div>
            </div>
        ` : ''}
        ${entry.oneThingToWorkOn ? `
            <div class="detail-item" style="margin-bottom: 10px;">
                <div class="detail-label">One Thing to Work On</div>
                <div class="detail-value">${entry.oneThingToWorkOn}</div>
            </div>
        ` : ''}
    ` : '';

    return `
        <div class="entry-card" data-entry-key="${entry.key}">
            <div class="entry-card-header">
                <div class="entry-card-summary">
                    ${headerInfo}
                </div>
                <div class="expand-toggle"></div>
            </div>

            <div class="entry-card-body">
                <div class="entry-details">
                    ${matchDetails}
                </div>
                ${entry.sessionDetails ? `
                    <div class="detail-item" style="margin-bottom: 10px;">
                        <div class="detail-label">Pre-Match Preparation</div>
                        <div class="detail-value">${entry.sessionDetails}</div>
                    </div>
                ` : ''}
                ${entry.notes ? `
                    <div class="detail-item" style="margin-bottom: 10px;">
                        <div class="detail-label">Notes</div>
                        <div class="detail-value">${entry.notes}</div>
                    </div>
                ` : ''}
                ${performanceDetails}
                <div class="btn-group">
                    <button class="edit-btn">✏️ Edit</button>
                    <button class="delete-btn">🗑️ Delete</button>
                </div>
            </div>
        </div>
    `;
}

// Toggle entry expansion
window.toggleEntryExpand = function(key) {
    const card = document.querySelector(`[data-entry-key="${key}"]`);
    if (card) {
        card.classList.toggle('expanded');
    }
};