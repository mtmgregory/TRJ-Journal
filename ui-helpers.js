// UI Helpers Module - ENHANCED WITH PERFORMANCE RATINGS

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

// Format performance rating with stars and color coding
function formatPerformanceRating(rating, notes) {
    if (!rating && !notes) return '';
    
    let html = '<div style="margin-top: 0.5rem;">';
    
    if (rating) {
        const ratingNum = parseInt(rating);
        const stars = '⭐'.repeat(ratingNum);
        const emptyStars = '☆'.repeat(10 - ratingNum);
        
        let ratingClass = 'rating-inline';
        if (ratingNum >= 8) ratingClass += ' excellent';
        else if (ratingNum >= 6) ratingClass += ' good';
        else if (ratingNum >= 4) ratingClass += ' average';
        else ratingClass += ' poor';
        
        html += `<div class="${ratingClass}" style="font-size: 0.85rem; margin-bottom: 0.25rem; padding: 0.25rem 0.5rem; border-radius: 4px; display: inline-block;">
            <strong>Rating:</strong> ${stars}${emptyStars} <strong>${ratingNum}/10</strong>
        </div>`;
    }
    
    if (notes) {
        html += `<div style="color: var(--gray-700); margin-top: 0.25rem;">${notes}</div>`;
    }
    
    html += '</div>';
    return html;
}

// Get performance average badge for match entries
function getPerformanceAverageBadge(entry) {
    if (entry.sessionType !== 'Match Day') return '';
    
    const ratings = [
        entry.perfLengthWidthRating,
        entry.perfHeightPaceRating,
        entry.perfControlTRating,
        entry.perfMovementRating,
        entry.perfAttackRating,
        entry.perfHittingToSpaceRating
    ].filter(r => r && !isNaN(parseInt(r))).map(r => parseInt(r));
    
    if (ratings.length === 0) return '';
    
    const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;
    const avgRounded = avg.toFixed(1);
    
    let badgeClass = 'performance-avg-badge';
    if (avg >= 8) badgeClass += ' excellent';
    else if (avg >= 6) badgeClass += ' good';
    else if (avg >= 4) badgeClass += ' average';
    else badgeClass += ' poor';
    
    return `<span class="${badgeClass}" title="Average across ${ratings.length} performance categories">Perf: ${avgRounded}/10</span>`;
}

// Get rating badge HTML with color coding
function getRatingBadge(rating) {
    const ratingNum = parseInt(rating);
    let badgeClass = 'rating-badge';
    let stars = '★'.repeat(ratingNum);
    
    if (ratingNum >= 5) {
        badgeClass += ' excellent';
    } else if (ratingNum >= 4) {
        badgeClass += ' good';
    } else if (ratingNum >= 3) {
        badgeClass += ' average';
    } else {
        badgeClass += ' poor';
    }
    
    return `<span class="${badgeClass}">${stars} ${ratingNum}/5</span>`;
}

// Get session type badge with color coding
function getSessionTypeBadge(sessionType) {
    if (!sessionType) return '';
    
    let badgeClass = 'session-type-badge';
    
    if (sessionType === 'Match Day') {
        badgeClass += ' match';
    } else if (sessionType === 'Training') {
        badgeClass += ' training';
    } else if (sessionType === 'Recovery') {
        badgeClass += ' recovery';
    }
    
    return `<span class="${badgeClass}">${sessionType}</span>`;
}

// Get health indicator with color coding
function getHealthIndicator(value, type) {
    if (!value) return 'N/A';
    
    const numValue = parseFloat(value);
    let indicatorClass = 'health-indicator';
    let status = '';
    
    if (type === 'sleep') {
        if (numValue >= 7.5) {
            indicatorClass += ' good';
            status = 'Good';
        } else if (numValue >= 6) {
            indicatorClass += ' average';
            status = 'Fair';
        } else {
            indicatorClass += ' poor';
            status = 'Low';
        }
        return `<span class="${indicatorClass}">😴 ${value}h (${status})</span>`;
    } else if (type === 'hydration') {
        if (numValue >= 2.5) {
            indicatorClass += ' good';
            status = 'Good';
        } else if (numValue >= 1.5) {
            indicatorClass += ' average';
            status = 'Fair';
        } else {
            indicatorClass += ' poor';
            status = 'Low';
        }
        return `<span class="${indicatorClass}">💧 ${value}L (${status})</span>`;
    }
    
    return value;
}

// Create entry card HTML with enhanced styling - INCLUDES PERFORMANCE RATINGS
export function createEntryCard(entry) {
    const date = new Date(entry.date);
    const formattedDate = date.toLocaleDateString('en-US', { 
        weekday: 'short', 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });
    
    const weatherEmoji = {
        'sunny': '☀️',
        'cloudy': '☁️',
        'rainy': '🌧️',
        'snowy': '❄️',
        'indoor': '🏢'
    };
    
    const isMatch = entry.sessionType === 'Match Day';
    
    // Health metrics in a clean row
    let healthMetricsHTML = '';
    if (entry.sleep || entry.hydration) {
        healthMetricsHTML = `<div class="health-metrics">`;
        if (entry.sleep) {
            healthMetricsHTML += getHealthIndicator(entry.sleep, 'sleep');
        }
        if (entry.hydration) {
            healthMetricsHTML += getHealthIndicator(entry.hydration, 'hydration');
        }
        healthMetricsHTML += `</div>`;
    }
    
    // Build header info with rating on right, health metrics below badges
    let headerInfo = `
        <div class="entry-header-info">
            <div class="entry-date-row">
                <span class="entry-date">${formattedDate}</span>
            </div>
            <div class="entry-badges-row">
                ${getSessionTypeBadge(entry.sessionType)}
                ${isMatch && entry.opponentName ? `<span class="opponent-badge">vs ${entry.opponentName}</span>` : ''}
                ${getPerformanceAverageBadge(entry)}
            </div>
            ${healthMetricsHTML}
        </div>
        <div class="rating-container">
            ${getRatingBadge(entry.rating)}
        </div>
    `;
    
    const matchDetails = isMatch && entry.opponentName ? `
        <div class="detail-item">
            <div class="detail-label">Opponent</div>
            <div class="detail-value">${entry.opponentName || 'N/A'}</div>
        </div>
        <div class="detail-item">
            <div class="detail-label">Scores</div>
            <div class="detail-value stat">${entry.gameScores || 'N/A'}</div>
        </div>
        ${entry.opponentLevel ? `
        <div class="detail-item">
            <div class="detail-label">Opponent Level</div>
            <div class="detail-value stat">${entry.opponentLevel}</div>
        </div>` : ''}
        ${entry.yourLevel ? `
        <div class="detail-item">
            <div class="detail-label">Your Level</div>
            <div class="detail-value stat">${entry.yourLevel}</div>
        </div>` : ''}
    ` : '';
    
    // Performance details with ratings - NEW ENHANCED SECTION
    const performanceDetails = isMatch ? `
        ${entry.perfLengthWidth || entry.perfLengthWidthRating ? `
            <div class="detail-item" style="margin-bottom: 10px;">
                <div class="detail-label">📏 Length and Width</div>
                <div class="detail-value">${formatPerformanceRating(entry.perfLengthWidthRating, entry.perfLengthWidth)}</div>
            </div>
        ` : ''}
        ${entry.perfHeightPace || entry.perfHeightPaceRating ? `
            <div class="detail-item" style="margin-bottom: 10px;">
                <div class="detail-label">⬆️ Height and Pace</div>
                <div class="detail-value">${formatPerformanceRating(entry.perfHeightPaceRating, entry.perfHeightPace)}</div>
            </div>
        ` : ''}
        ${entry.perfControlT || entry.perfControlTRating ? `
            <div class="detail-item" style="margin-bottom: 10px;">
                <div class="detail-label">🎯 Control and T Position</div>
                <div class="detail-value">${formatPerformanceRating(entry.perfControlTRating, entry.perfControlT)}</div>
            </div>
        ` : ''}
        ${entry.perfMovement || entry.perfMovementRating ? `
            <div class="detail-item" style="margin-bottom: 10px;">
                <div class="detail-label">🏃 Movement</div>
                <div class="detail-value">${formatPerformanceRating(entry.perfMovementRating, entry.perfMovement)}</div>
            </div>
        ` : ''}
        ${entry.perfAttack || entry.perfAttackRating ? `
            <div class="detail-item" style="margin-bottom: 10px;">
                <div class="detail-label">⚡ Attack</div>
                <div class="detail-value">${formatPerformanceRating(entry.perfAttackRating, entry.perfAttack)}</div>
            </div>
        ` : ''}
        ${entry.perfHittingToSpace || entry.perfHittingToSpaceRating ? `
            <div class="detail-item" style="margin-bottom: 10px;">
                <div class="detail-label">🎲 Hitting to Space</div>
                <div class="detail-value">${formatPerformanceRating(entry.perfHittingToSpaceRating, entry.perfHittingToSpace)}</div>
            </div>
        ` : ''}
        ${entry.oppStrengths ? `
            <div class="detail-item" style="margin-bottom: 10px;">
                <div class="detail-label">💪 Opponent's Strengths</div>
                <div class="detail-value">${entry.oppStrengths}</div>
            </div>
        ` : ''}
        ${entry.oppWeaknesses ? `
            <div class="detail-item" style="margin-bottom: 10px;">
                <div class="detail-label">🎯 Opponent's Weaknesses</div>
                <div class="detail-value">${entry.oppWeaknesses}</div>
            </div>
        ` : ''}
        ${entry.matchSummary ? `
            <div class="detail-item" style="margin-bottom: 10px;">
                <div class="detail-label">📝 Match Summary</div>
                <div class="detail-value">${entry.matchSummary}</div>
            </div>
        ` : ''}
        ${entry.oneThingToWorkOn ? `
            <div class="detail-item" style="margin-bottom: 10px;">
                <div class="detail-label">🎓 One Thing to Work On</div>
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
                    <div class="detail-item">
                        <div class="detail-label">Session Type</div>
                        <div class="detail-value">${entry.sessionType || 'N/A'}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Weather</div>
                        <div class="detail-value">${weatherEmoji[entry.weather] || ''} ${entry.weather || 'N/A'}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Temperature</div>
                        <div class="detail-value stat">${entry.temperature ? entry.temperature + '°C' : 'N/A'}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Sleep</div>
                        <div class="detail-value stat">${entry.sleep ? entry.sleep + ' hrs' : 'N/A'}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Hydration</div>
                        <div class="detail-value stat">${entry.hydration ? entry.hydration + 'L' : 'N/A'}</div>
                    </div>
                    ${matchDetails}
                </div>
                ${entry.sessionDetails ? `
                    <div class="detail-item" style="margin-bottom: 10px;">
                        <div class="detail-label">Session Details</div>
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