// Enhanced Insights Module - WITH COMPREHENSIVE PERFORMANCE ANALYSIS
import { getAllEntriesFromFirestore } from './firestore-service.js';

// Load insights with comprehensive analysis
// Load insights with comprehensive analysis AND VISUALIZATIONS
export async function loadInsights() {
    const statsGrid = document.getElementById('statsGrid');
    const insightsContainer = document.getElementById('insightsContainer');

    if (!statsGrid || !insightsContainer) return;

    try {
        const entries = await getAllEntriesFromFirestore();
        
        if (!entries || entries.length === 0) {
            insightsContainer.innerHTML = '<div class="no-entries">📊 No data yet. Add some entries to see insights!</div>';
            statsGrid.innerHTML = '';
            return;
        }

        // Generate comprehensive statistics
        const stats = calculateStatistics(entries);
        
        // Render stats grid
        statsGrid.innerHTML = renderStatsGrid(stats);
        
        // Get match entries for specialized analysis
        const matchEntries = entries.filter(e => e.sessionType === 'Match Day');
        
        // Build insights HTML with visualizations FIRST, then text insights
        let insights = '';
        
        // === VISUAL CHARTS (NEW) ===
        insights += generateRatingTrendChart(entries);
        insights += generatePerformanceRadarChart(matchEntries);
        insights += generateWeeklyHeatmap(entries);
        insights += generateSleepPerformanceChart(entries);
        
        // === TEXT-BASED INSIGHTS ===
        if (stats.trend !== 'insufficient_data') {
            insights += generatePerformanceTrendSection(stats);
        }
        
        if (matchEntries.length >= 2) {
            insights += analyzePerformanceCategories(matchEntries);
        }
        
        insights += analyzeOptimalConditions(entries);
        insights += analyzeRecoveryFactors(entries, stats);
        
        if (matchEntries.length >= 3) {
            insights += generateOpponentTracker(matchEntries);
        }
        
        insights += identifyImprovementAreas(entries);
        insights += generateRecommendations(entries, stats);
        
        insightsContainer.innerHTML = insights;
        
    } catch (error) {
        insightsContainer.innerHTML = '<div class="no-entries">❌ Error loading insights.</div>';
        console.error(error);
    }
}

// Calculate comprehensive statistics
function calculateStatistics(entries) {
    const stats = {
        totalSessions: entries.length,
        matchSessions: entries.filter(e => e.sessionType === 'Match Day').length,
        trainingSessions: entries.filter(e => e.sessionType === 'Training').length,
        recoverySessions: entries.filter(e => e.sessionType === 'Recovery').length,
    };
    
    // Rating statistics
    const ratings = entries.map(e => parseInt(e.rating)).filter(r => !isNaN(r));
    stats.avgRating = ratings.length > 0 ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : 0;
    stats.highRatingSessions = entries.filter(e => parseInt(e.rating) >= 4).length;
    stats.lowRatingSessions = entries.filter(e => parseInt(e.rating) <= 2).length;
    
    // Sleep statistics
    const sleepData = entries.filter(e => e.sleep).map(e => parseFloat(e.sleep));
    stats.avgSleep = sleepData.length > 0 ? (sleepData.reduce((a, b) => a + b, 0) / sleepData.length).toFixed(1) : 'N/A';
    stats.optimalSleepSessions = sleepData.filter(s => s >= 7.5).length;
    
    // Hydration statistics
    const hydrationData = entries.filter(e => e.hydration).map(e => parseFloat(e.hydration));
    stats.avgHydration = hydrationData.length > 0 ? (hydrationData.reduce((a, b) => a + b, 0) / hydrationData.length).toFixed(1) : 'N/A';
    
    // Recent trend (last 7 entries vs previous 7)
    if (entries.length >= 14) {
        const sorted = [...entries].sort((a, b) => new Date(b.date) - new Date(a.date));
        const recent = sorted.slice(0, 7).map(e => parseInt(e.rating));
        const previous = sorted.slice(7, 14).map(e => parseInt(e.rating));
        const recentAvg = recent.reduce((a, b) => a + b, 0) / 7;
        const previousAvg = previous.reduce((a, b) => a + b, 0) / 7;
        stats.trend = recentAvg > previousAvg ? 'improving' : recentAvg < previousAvg ? 'declining' : 'stable';
        stats.trendDiff = (recentAvg - previousAvg).toFixed(1);
    } else {
        stats.trend = 'insufficient_data';
    }
    
    return stats;
}

// Render statistics grid
function renderStatsGrid(stats) {
    const trendIcon = stats.trend === 'improving' ? '📈' : stats.trend === 'declining' ? '📉' : '➡️';
    const trendClass = stats.trend === 'improving' ? 'success' : stats.trend === 'declining' ? 'danger' : 'info';
    
    return `
        <div class="stat-card">
            <div class="stat-value">${stats.totalSessions}</div>
            <div class="stat-label">Total Sessions</div>
        </div>
        <div class="stat-card ${trendClass}">
            <div class="stat-value">${stats.avgRating}</div>
            <div class="stat-label">Avg Rating ${trendIcon}</div>
        </div>
        <div class="stat-card warning">
            <div class="stat-value">${stats.avgSleep}</div>
            <div class="stat-label">Avg Sleep (hrs)</div>
        </div>
        <div class="stat-card info">
            <div class="stat-value">${stats.matchSessions}</div>
            <div class="stat-label">Match Sessions</div>
        </div>
    `;
}

// Generate comprehensive insights
function generateInsights(entries, stats) {
    let html = '';
    
    // Performance Trend Analysis
    if (stats.trend !== 'insufficient_data') {
        html += `<div class="insight-section">
            <h3>📊 Performance Trend</h3>
            <ul class="insight-list">`;
        
        if (stats.trend === 'improving') {
            html += `<li>🎉 <strong>Great news!</strong> Your performance is improving! Your recent sessions are averaging <strong>${stats.trendDiff}</strong> points higher than before.</li>`;
        } else if (stats.trend === 'declining') {
            html += `<li>⚠️ Your recent performance has dipped by <strong>${Math.abs(stats.trendDiff)}</strong> points. Review your recovery and preparation.</li>`;
        } else {
            html += `<li>➡️ Your performance has been <strong>consistent</strong> lately. Consider pushing yourself with new challenges.</li>`;
        }
        
        html += `</ul></div>`;
    }
    
    // ENHANCED: Detailed Performance Analysis (NEW)
    const matchEntries = entries.filter(e => e.sessionType === 'Match Day');
    if (matchEntries.length >= 2) {
        html += analyzePerformanceCategories(matchEntries);
    }
    
    // Optimal Conditions Analysis
    html += analyzeOptimalConditions(entries);
    
    // Recovery & Preparation Insights
    html += analyzeRecoveryFactors(entries, stats);
    
    // Match Performance Analysis (Basic)
    if (matchEntries.length >= 3) {
        html += analyzeMatchPerformance(matchEntries);
    }
    
    // Areas for Improvement
    html += identifyImprovementAreas(entries);
    
    // Actionable Recommendations
    html += generateRecommendations(entries, stats);
    
    return html;
}

// NEW: Comprehensive Performance Analysis Section
function analyzePerformanceCategories(matchEntries) {
    if (matchEntries.length < 2) {
        return '<div class="insight-section"><h3>🎯 Performance Analysis</h3><ul class="insight-list"><li>Record at least 2 matches with performance ratings to see detailed analysis!</li></ul></div>';
    }
    
    let html = '<div class="insight-section"><h3>🎯 Detailed Performance Analysis</h3><ul class="insight-list">';
    
    const performanceCategories = [
        { field: 'perfLengthWidth', ratingField: 'perfLengthWidthRating', name: 'Length and Width', icon: '📏' },
        { field: 'perfHeightPace', ratingField: 'perfHeightPaceRating', name: 'Height and Pace', icon: '⬆️' },
        { field: 'perfControlT', ratingField: 'perfControlTRating', name: 'Court Control & T Position', icon: '🎯' },
        { field: 'perfMovement', ratingField: 'perfMovementRating', name: 'Movement', icon: '🏃' },
        { field: 'perfAttack', ratingField: 'perfAttackRating', name: 'Attack', icon: '⚡' },
        { field: 'perfHittingToSpace', ratingField: 'perfHittingToSpaceRating', name: 'Hitting to Space', icon: '🎲' },
    ];
    
    // Calculate detailed stats for each category
    const categoryStats = [];
    performanceCategories.forEach(cat => {
        const ratingsForCategory = matchEntries
            .filter(e => e[cat.ratingField] && !isNaN(parseInt(e[cat.ratingField])))
            .map(e => ({
                rating: parseInt(e[cat.ratingField]),
                date: new Date(e.date)
            }));
        
        if (ratingsForCategory.length >= 2) {
            const ratings = ratingsForCategory.map(r => r.rating);
            const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;
            const max = Math.max(...ratings);
            const min = Math.min(...ratings);
            const variance = calculateVariance(ratings);
            
            // Calculate trend (recent vs older)
            const sortedByDate = ratingsForCategory.sort((a, b) => b.date - a.date);
            const halfPoint = Math.floor(sortedByDate.length / 2);
            const recentHalf = sortedByDate.slice(0, halfPoint).map(r => r.rating);
            const olderHalf = sortedByDate.slice(halfPoint).map(r => r.rating);
            
            const recentAvg = recentHalf.reduce((a, b) => a + b, 0) / recentHalf.length;
            const olderAvg = olderHalf.reduce((a, b) => a + b, 0) / olderHalf.length;
            const trend = recentAvg - olderAvg;
            
            categoryStats.push({
                ...cat,
                avg,
                max,
                min,
                variance,
                trend,
                count: ratingsForCategory.length,
                consistency: variance < 1.5 ? 'high' : variance < 2.5 ? 'moderate' : 'low'
            });
        }
    });
    
    if (categoryStats.length === 0) {
        html += '<li>📊 Start rating your performance categories to unlock detailed insights!</li>';
        html += '</ul></div>';
        return html;
    }
    
    // Sort by average (highest to lowest)
    categoryStats.sort((a, b) => b.avg - a.avg);
    
    // 1. OVERALL PERFORMANCE SUMMARY
    const overallAvg = categoryStats.reduce((sum, cat) => sum + cat.avg, 0) / categoryStats.length;
    let performanceLevel = '';
    if (overallAvg >= 8) performanceLevel = 'Elite level! 🏆';
    else if (overallAvg >= 7) performanceLevel = 'Advanced level 💪';
    else if (overallAvg >= 6) performanceLevel = 'Solid intermediate level 👍';
    else if (overallAvg >= 5) performanceLevel = 'Developing well 📈';
    else performanceLevel = 'Building foundations 🔨';
    
    html += `<li><strong>Overall Performance:</strong> ${overallAvg.toFixed(1)}/10 - ${performanceLevel}</li>`;
    
    // 2. STRONGEST AREAS (Top 2)
    const topAreas = categoryStats.slice(0, Math.min(2, categoryStats.length));
    html += `<li>${topAreas[0].icon} <strong>Your Strength:</strong> ${topAreas[0].name} (${topAreas[0].avg.toFixed(1)}/10 avg)`;
    if (topAreas[0].consistency === 'high') {
        html += ` - Consistently excellent! 🎯`;
    }
    html += `</li>`;
    
    if (topAreas.length > 1) {
        html += `<li>${topAreas[1].icon} <strong>Secondary Strength:</strong> ${topAreas[1].name} (${topAreas[1].avg.toFixed(1)}/10 avg)</li>`;
    }
    
    // 3. AREAS NEEDING ATTENTION (Bottom 2)
    const weakAreas = categoryStats.slice(-Math.min(2, categoryStats.length)).reverse();
    if (weakAreas[0].avg < 6) {
        html += `<li>⚠️ <strong>Priority Focus Area:</strong> ${weakAreas[0].name} (${weakAreas[0].avg.toFixed(1)}/10 avg)`;
        if (weakAreas[0].consistency === 'low') {
            html += ` - Inconsistent performance, needs structured practice`;
        } else {
            html += ` - Consistently below target, consider technical coaching`;
        }
        html += `</li>`;
    }
    
    if (weakAreas.length > 1 && weakAreas[1].avg < 7) {
        html += `<li>🎯 <strong>Secondary Focus:</strong> ${weakAreas[1].name} (${weakAreas[1].avg.toFixed(1)}/10 avg)</li>`;
    }
    
    // 4. BIGGEST IMPROVEMENTS
    const improving = categoryStats.filter(cat => cat.trend > 0.5).sort((a, b) => b.trend - a.trend);
    if (improving.length > 0) {
        html += `<li>📈 <strong>Most Improved:</strong> ${improving[0].name} (+${improving[0].trend.toFixed(1)} points recently!) - Keep up the great work! 🎉</li>`;
    }
    
    // 5. DECLINING AREAS (needs attention)
    const declining = categoryStats.filter(cat => cat.trend < -0.5).sort((a, b) => a.trend - b.trend);
    if (declining.length > 0) {
        html += `<li>📉 <strong>Needs Attention:</strong> ${declining[0].name} (${declining[0].trend.toFixed(1)} points decline) - Review recent matches to identify what changed</li>`;
    }
    
    // 6. CONSISTENCY ANALYSIS
    const inconsistent = categoryStats.filter(cat => cat.consistency === 'low');
    if (inconsistent.length > 0) {
        html += `<li>🎲 <strong>Inconsistency Alert:</strong> ${inconsistent.map(c => c.name).join(', ')} show high variance. Focus on building reliable patterns in these areas.</li>`;
    }
    
    const veryConsistent = categoryStats.filter(cat => cat.consistency === 'high' && cat.avg >= 7);
    if (veryConsistent.length > 0) {
        html += `<li>✅ <strong>Rock Solid:</strong> ${veryConsistent.map(c => c.name).join(', ')} - Consistently strong performance! 💎</li>`;
    }
    
    // 7. PERFORMANCE GAPS (largest difference between best and worst)
    const performanceGap = categoryStats[0].avg - categoryStats[categoryStats.length - 1].avg;
    if (performanceGap > 3) {
        html += `<li>⚖️ <strong>Performance Gap:</strong> ${performanceGap.toFixed(1)} points between your best and weakest areas. Balancing your game will unlock the next level.</li>`;
    } else if (performanceGap < 2) {
        html += `<li>🎯 <strong>Well-Rounded Game:</strong> Your skills are balanced across all areas (${performanceGap.toFixed(1)} point range). This is a huge advantage!</li>`;
    }
    
    // 8. SPECIFIC RECOMMENDATIONS based on data
    html += generatePerformanceRecommendations(categoryStats);
    
    html += '</ul></div>';
    return html;
}

// Generate specific recommendations based on performance data
function generatePerformanceRecommendations(categoryStats) {
    let html = '';
    
    // Find the weakest and most inconsistent areas
    const weakest = categoryStats[categoryStats.length - 1];
    const mostInconsistent = [...categoryStats].sort((a, b) => b.variance - a.variance)[0];
    
    // Recommendation 1: Focus on weakest area
    if (weakest.avg < 6) {
        html += `<li>💡 <strong>Action Plan:</strong> Dedicate 15-20 minutes each training session specifically to ${weakest.name}. `;
        
        // Specific drills based on category
        if (weakest.name.includes('Length and Width')) {
            html += 'Practice target hitting drills to the back corners and work on straight drives.';
        } else if (weakest.name.includes('Height and Pace')) {
            html += 'Focus on lob drills and varying shot pace during solo practice.';
        } else if (weakest.name.includes('Control')) {
            html += 'Work on T-position recovery after every shot and practice ghosting drills.';
        } else if (weakest.name.includes('Movement')) {
            html += 'Incorporate footwork ladders and court sprints into your warmup.';
        } else if (weakest.name.includes('Attack')) {
            html += 'Practice volley drills and work on recognizing attacking opportunities.';
        } else if (weakest.name.includes('Space')) {
            html += 'Play conditioned games focusing on hitting away from opponent position.';
        }
        html += '</li>';
    }
    
    // Recommendation 2: Build consistency in inconsistent areas
    if (mostInconsistent.consistency === 'low') {
        html += `<li>🎯 <strong>Consistency Goal:</strong> ${mostInconsistent.name} shows high variability. Set a goal to rate this 7+ in your next 3 matches by focusing on fundamentals over flashy play.</li>`;
    }
    
    // Recommendation 3: Leverage strengths
    const topStrength = categoryStats[0];
    if (topStrength.avg >= 7.5) {
        html += `<li>💪 <strong>Leverage Your Strength:</strong> Your ${topStrength.name} is excellent. Build your match tactics around this strength while opponents adjust.</li>`;
    }
    
    return html;
}

// Analyze optimal conditions for performance
function analyzeOptimalConditions(entries) {
    const goodSessions = entries.filter(e => parseInt(e.rating) >= 4);
    
    if (goodSessions.length < 3) {
        return '<div class="insight-section"><h3>🌟 Optimal Conditions</h3><ul class="insight-list"><li>Keep logging sessions to discover your optimal conditions!</li></ul></div>';
    }
    
    let html = '<div class="insight-section"><h3>🌟 What Makes Great Sessions</h3><ul class="insight-list">';
    
    // Sleep analysis
    const goodWithSleep = goodSessions.filter(e => e.sleep);
    if (goodWithSleep.length >= 3) {
        const avgGoodSleep = goodWithSleep.reduce((sum, e) => sum + parseFloat(e.sleep), 0) / goodWithSleep.length;
        const poorWithSleep = entries.filter(e => parseInt(e.rating) <= 2 && e.sleep);
        
        if (poorWithSleep.length >= 2) {
            const avgPoorSleep = poorWithSleep.reduce((sum, e) => sum + parseFloat(e.sleep), 0) / poorWithSleep.length;
            const sleepDiff = avgGoodSleep - avgPoorSleep;
            
            if (sleepDiff > 1) {
                html += `<li>😴 <strong>Sleep is critical!</strong> Your best sessions followed <strong>${avgGoodSleep.toFixed(1)} hours</strong> of sleep (${sleepDiff.toFixed(1)} hours more than poor sessions)</li>`;
            }
        } else {
            html += `<li>⭐ Your top sessions averaged <strong>${avgGoodSleep.toFixed(1)} hours</strong> of sleep</li>`;
        }
    }
    
    // Weather patterns
    const weatherCount = {};
    goodSessions.forEach(e => {
        if (e.weather) {
            weatherCount[e.weather] = (weatherCount[e.weather] || 0) + 1;
        }
    });
    
    if (Object.keys(weatherCount).length > 0) {
        const topWeather = Object.entries(weatherCount).sort((a, b) => b[1] - a[1])[0];
        const percentage = ((topWeather[1] / goodSessions.length) * 100).toFixed(0);
        html += `<li>☀️ <strong>${percentage}%</strong> of your best sessions were in <strong>${topWeather[0]}</strong> conditions</li>`;
    }
    
    // Hydration patterns
    const goodWithHydration = goodSessions.filter(e => e.hydration);
    if (goodWithHydration.length >= 3) {
        const avgGoodHydration = goodWithHydration.reduce((sum, e) => sum + parseFloat(e.hydration), 0) / goodWithHydration.length;
        html += `<li>💧 Optimal hydration for you: <strong>${avgGoodHydration.toFixed(1)}L</strong></li>`;
    }
    
    html += '</ul></div>';
    return html;
}

// Analyze recovery factors
function analyzeRecoveryFactors(entries, stats) {
    let html = '<div class="insight-section"><h3>💪 Recovery & Preparation</h3><ul class="insight-list">';
    
    const sleepNum = parseFloat(stats.avgSleep);
    if (!isNaN(sleepNum)) {
        if (sleepNum < 7) {
            html += `<li>⚠️ <strong>Action needed:</strong> You're averaging only ${stats.avgSleep} hours of sleep. Aim for 7.5-9 hours for optimal recovery.</li>`;
        } else if (sleepNum >= 7.5) {
            html += `<li>✅ <strong>Excellent!</strong> You're getting solid sleep (${stats.avgSleep} hrs average). Keep it up!</li>`;
        } else {
            html += `<li>👍 Your sleep is decent (${stats.avgSleep} hrs), but there's room for improvement. Try for 7.5+ hours.</li>`;
        }
    }
    
    const hydrationNum = parseFloat(stats.avgHydration);
    if (!isNaN(hydrationNum)) {
        if (hydrationNum < 2) {
            html += `<li>💧 <strong>Hydration alert:</strong> You're only averaging ${stats.avgHydration}L. Target 2.5-3L daily for optimal performance.</li>`;
        } else if (hydrationNum >= 2.5) {
            html += `<li>✅ <strong>Great hydration!</strong> You're hitting ${stats.avgHydration}L on average.</li>`;
        }
    }
    
    html += '</ul></div>';
    return html;
}

// Analyze match performance (basic overview)
function analyzeMatchPerformance(matchEntries) {
    let html = '<div class="insight-section"><h3>🎾 Match Performance Overview</h3><ul class="insight-list">';
    
    const avgMatchRating = matchEntries.reduce((sum, e) => sum + parseInt(e.rating), 0) / matchEntries.length;
    
    html += `<li>📊 You've played <strong>${matchEntries.length} matches</strong> with an average rating of <strong>${avgMatchRating.toFixed(1)}/5</strong></li>`;
    
    // Most common opponents
    const opponents = {};
    matchEntries.forEach(e => {
        if (e.opponentName) {
            opponents[e.opponentName] = (opponents[e.opponentName] || 0) + 1;
        }
    });
    
    if (Object.keys(opponents).length > 0) {
        const topOpponent = Object.entries(opponents).sort((a, b) => b[1] - a[1])[0];
        if (topOpponent[1] > 1) {
            html += `<li>👤 Most frequent opponent: <strong>${topOpponent[0]}</strong> (${topOpponent[1]} matches)</li>`;
        }
    }
    
    html += '</ul></div>';
    return html;
}

// Identify areas for improvement
function identifyImprovementAreas(entries) {
    const poorSessions = entries.filter(e => parseInt(e.rating) <= 2);
    
    let html = '<div class="insight-section"><h3>🎯 Areas for Improvement</h3><ul class="insight-list">';
    
    if (poorSessions.length === 0) {
        html += '<li>🌟 <strong>Excellent!</strong> No poor sessions recorded. Keep up the great work!</li>';
    } else {
        const poorPercentage = ((poorSessions.length / entries.length) * 100).toFixed(0);
        html += `<li>📉 <strong>${poorPercentage}%</strong> of your sessions (${poorSessions.length}) were rated 2/5 or below.</li>`;
        
        // Analyze poor session patterns
        const poorWithSleep = poorSessions.filter(e => e.sleep);
        if (poorWithSleep.length >= 2) {
            const avgPoorSleep = poorWithSleep.reduce((sum, e) => sum + parseFloat(e.sleep), 0) / poorWithSleep.length;
            if (avgPoorSleep < 6.5) {
                html += `<li>😴 <strong>Key finding:</strong> Poor sessions averaged only ${avgPoorSleep.toFixed(1)} hours of sleep. Prioritize rest!</li>`;
            }
        }
    }
    
    // Check consistency
    const recentEntries = [...entries].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10);
    if (recentEntries.length >= 5) {
        const recentRatings = recentEntries.map(e => parseInt(e.rating));
        const variance = calculateVariance(recentRatings);
        
        if (variance > 1.5) {
            html += '<li>📊 Your recent performance has been <strong>inconsistent</strong>. Focus on establishing consistent preparation routines.</li>';
        } else {
            html += '<li>✅ Your performance has been <strong>consistent</strong> recently. Good job!</li>';
        }
    }
    
    html += '</ul></div>';
    return html;
}

// Generate actionable recommendations
function generateRecommendations(entries, stats) {
    let html = '<div class="insight-section"><h3>💡 Actionable Recommendations</h3><ul class="insight-list">';
    
    const recommendations = [];
    
    // Sleep recommendations
    const sleepNum = parseFloat(stats.avgSleep);
    if (!isNaN(sleepNum) && sleepNum < 7.5) {
        recommendations.push({
            priority: 1,
            text: `<strong>Priority #1:</strong> Increase your sleep to 7.5-8 hours. Your current ${stats.avgSleep} hours may be limiting performance.`
        });
    }
    
    // Hydration recommendations
    const hydrationNum = parseFloat(stats.avgHydration);
    if (!isNaN(hydrationNum) && hydrationNum < 2.5) {
        recommendations.push({
            priority: 2,
            text: `<strong>Hydration goal:</strong> Increase daily water intake to 2.5-3L (currently ${stats.avgHydration}L).`
        });
    }
    
    // Documentation recommendations
    const matchEntries = entries.filter(e => e.sessionType === 'Match Day');
    const matchesWithAnalysis = matchEntries.filter(e => 
        e.perfLengthWidth || e.perfMovement || e.oppStrengths
    );
    
    if (matchEntries.length > 0 && matchesWithAnalysis.length < matchEntries.length * 0.5) {
        recommendations.push({
            priority: 3,
            text: 'Document match performance analysis more consistently. This will help identify technical patterns.'
        });
    }
    
    // Consistency recommendations
    if (stats.trend === 'declining') {
        recommendations.push({
            priority: 1,
            text: `<strong>Performance dip detected:</strong> Review your last ${Math.min(entries.length, 7)} sessions to identify what changed.`
        });
    }
    
    // Sort by priority and display
    recommendations.sort((a, b) => a.priority - b.priority);
    
    if (recommendations.length === 0) {
        html += '<li>🎉 <strong>Great job!</strong> You\'re doing well across all key areas. Keep tracking and stay consistent!</li>';
    } else {
        recommendations.forEach(rec => {
            html += `<li>${rec.text}</li>`;
        });
    }
    
    html += '</ul></div>';
    return html;
}

// Calculate variance (standard deviation)
function calculateVariance(arr) {
    const avg = arr.reduce((a, b) => a + b, 0) / arr.length;
    const squareDiffs = arr.map(value => Math.pow(value - avg, 2));
    return Math.sqrt(squareDiffs.reduce((a, b) => a + b, 0) / arr.length);
}

// Add these functions to insights.js for visual enhancements

// 1. RATING TREND CHART - Show performance over time
function generateRatingTrendChart(entries) {
    if (entries.length < 3) return '';
    
    const sorted = [...entries]
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .slice(-30); // Last 30 entries
    
    const maxRating = 5;
    const chartPadding = { top: 20, right: 20, bottom: 35, left: 45 };
    const innerWidth = 500;
    const innerHeight = 140;
    const totalWidth = innerWidth + chartPadding.left + chartPadding.right;
    const totalHeight = innerHeight + chartPadding.top + chartPadding.bottom;
    
    // Calculate points for the line chart
    const points = sorted.map((entry, index) => {
        const x = (index / (sorted.length - 1)) * innerWidth;
        const y = innerHeight - ((parseInt(entry.rating) / maxRating) * innerHeight);
        return `${x},${y}`;
    }).join(' ');
    
    return `
        <div class="chart-container">
            <h3>📈 Rating Trend (Last ${sorted.length} Sessions)</h3>
            <div style="width: 100%; margin-top: 1rem;">
                <svg viewBox="0 0 ${totalWidth} ${totalHeight}" 
                     style="width: 100%; height: auto; max-width: 100%;"
                     preserveAspectRatio="xMinYMid meet">
                    
                    <!-- Background -->
                    <rect x="0" y="0" 
                          width="${totalWidth}" 
                          height="${totalHeight}" 
                          fill="var(--gray-50)" 
                          rx="8" />
                    
                    <!-- Chart area group with transform -->
                    <g transform="translate(${chartPadding.left}, ${chartPadding.top})">
                        <!-- Grid lines and labels -->
                        ${[1, 2, 3, 4, 5].map(rating => {
                            const y = innerHeight - (rating / maxRating * innerHeight);
                            return `
                                <line x1="0" y1="${y}" 
                                      x2="${innerWidth}" y2="${y}" 
                                      stroke="var(--gray-300)" 
                                      stroke-width="1" 
                                      stroke-dasharray="4,4" 
                                      opacity="0.6" />
                                <text x="-10" y="${y + 4}" 
                                      fill="var(--gray-600)" 
                                      font-size="12" 
                                      text-anchor="end"
                                      font-weight="600">${rating}</text>
                            `;
                        }).join('')}
                        
                        <!-- Trend line with gradient -->
                        <defs>
                            <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" style="stop-color:var(--primary);stop-opacity:0.6" />
                                <stop offset="100%" style="stop-color:var(--primary);stop-opacity:1" />
                            </linearGradient>
                        </defs>
                        
                        <polyline points="${points}" 
                                  fill="none" 
                                  stroke="url(#lineGradient)" 
                                  stroke-width="3" 
                                  stroke-linecap="round"
                                  stroke-linejoin="round" />
                        
                        <!-- Data points -->
                        ${sorted.map((entry, index) => {
                            const x = (index / (sorted.length - 1)) * innerWidth;
                            const y = innerHeight - ((parseInt(entry.rating) / maxRating) * innerHeight);
                            const date = new Date(entry.date);
                            const dateStr = `${date.getMonth() + 1}/${date.getDate()}`;
                            const rating = parseInt(entry.rating);
                            let color = 'var(--primary)';
                            if (rating >= 4) color = 'var(--success)';
                            else if (rating <= 2) color = 'var(--danger)';
                            
                            return `
                                <circle cx="${x}" cy="${y}" r="5" 
                                        fill="white" 
                                        stroke="${color}" 
                                        stroke-width="2.5"
                                        style="cursor: pointer;">
                                    <title>${dateStr}: ${entry.rating}/5 - ${entry.sessionType || 'Session'}</title>
                                </circle>
                            `;
                        }).join('')}
                        
                        <!-- Y-axis label -->
                        <text x="-35" y="${innerHeight / 2}" 
                              fill="var(--gray-700)" 
                              font-size="12" 
                              text-anchor="middle"
                              transform="rotate(-90, -35, ${innerHeight / 2})"
                              font-weight="600">Rating (1-5)</text>
                        
                        <!-- X-axis label -->
                        <text x="${innerWidth / 2}" y="${innerHeight + 25}" 
                              fill="var(--gray-700)" 
                              font-size="12" 
                              text-anchor="middle"
                              font-weight="600">Sessions Over Time</text>
                    </g>
                </svg>
            </div>
            <div style="display: flex; justify-content: center; gap: 1.5rem; margin-top: 0.75rem; font-size: 0.85rem; color: var(--gray-600);">
                <div><span style="display: inline-block; width: 12px; height: 12px; background: var(--success); border-radius: 50%; margin-right: 4px;"></span>Great (4-5)</div>
                <div><span style="display: inline-block; width: 12px; height: 12px; background: var(--primary); border-radius: 50%; margin-right: 4px;"></span>Good (3)</div>
                <div><span style="display: inline-block; width: 12px; height: 12px; background: var(--danger); border-radius: 50%; margin-right: 4px;"></span>Needs Work (1-2)</div>
            </div>
        </div>
    `;
}

// 2. PERFORMANCE CATEGORY BAR CHART (FIXED)
function generatePerformanceRadarChart(matchEntries) {
    if (matchEntries.length < 2) return '';
    
    const categories = [
        { field: 'perfLengthWidthRating', label: 'Length/Width' },
        { field: 'perfHeightPaceRating', label: 'Height/Pace' },
        { field: 'perfControlTRating', label: 'Control/T' },
        { field: 'perfMovementRating', label: 'Movement' },
        { field: 'perfAttackRating', label: 'Attack' },
        { field: 'perfHittingToSpaceRating', label: 'Space' }
    ];
    
    // Calculate averages
    const categoryData = categories.map(cat => {
        const ratings = matchEntries
            .filter(e => e[cat.field] && !isNaN(parseInt(e[cat.field])))
            .map(e => parseInt(e[cat.field]));
        
        const avg = ratings.length > 0 
            ? ratings.reduce((a, b) => a + b, 0) / ratings.length 
            : 0;
        
        return { ...cat, avg, count: ratings.length };
    }).filter(cat => cat.avg > 0);
    
    if (categoryData.length === 0) return '';
    
    return `
        <div class="chart-container">
            <h3>🎯 Performance Category Averages</h3>
            <div style="display: flex; flex-direction: column; gap: 0.875rem; margin-top: 1rem;">
                ${categoryData.map(cat => {
                    const percentage = (cat.avg / 10) * 100;
                    let barColor = 'var(--danger)';
                    let textColor = 'white';
                    
                    if (cat.avg >= 8) {
                        barColor = 'var(--success)';
                    } else if (cat.avg >= 6) {
                        barColor = 'var(--info)';
                    } else if (cat.avg >= 4) {
                        barColor = 'var(--warning)';
                        textColor = 'var(--gray-900)';
                    }
                    
                    return `
                        <div style="display: flex; align-items: center; gap: 0.75rem;">
                            <div style="min-width: 110px; max-width: 110px; font-weight: 600; font-size: 0.8rem; color: var(--gray-700); line-height: 1.2;">
                                ${cat.label}
                            </div>
                            <div style="flex: 1; background: var(--gray-200); height: 32px; border-radius: var(--radius-md); overflow: hidden; position: relative; min-width: 0;">
                                <div style="width: ${percentage}%; height: 100%; background: ${barColor}; transition: width 1.2s cubic-bezier(0.4, 0, 0.2, 1); display: flex; align-items: center; justify-content: flex-end; padding: 0 0.5rem; min-width: fit-content;">
                                    <span style="color: ${textColor}; font-weight: 700; font-size: 0.875rem; white-space: nowrap;">${cat.avg.toFixed(1)}/10</span>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
            <div style="text-align: center; margin-top: 1rem; color: var(--gray-600); font-size: 0.85rem;">
                Based on ${matchEntries.length} match${matchEntries.length !== 1 ? 'es' : ''}
            </div>
        </div>
    `;
}

// 3. SLEEP VS PERFORMANCE SCATTER
function generateSleepPerformanceChart(entries) {
    const withSleep = entries.filter(e => e.sleep && e.rating);
    if (withSleep.length < 5) return '';
    
    return `
        <div class="chart-container">
            <h3>😴 Sleep vs Performance Correlation</h3>
            <div style="margin-top: 1rem; padding: 1rem; background: var(--gray-50); border-radius: var(--radius-md);">
                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(40px, 1fr)); gap: 0.5rem; max-height: 200px;">
                    ${withSleep.map(entry => {
                        const sleepHrs = parseFloat(entry.sleep);
                        const rating = parseInt(entry.rating);
                        
                        let bgColor = 'var(--gray-300)';
                        if (rating >= 4) bgColor = sleepHrs >= 7.5 ? 'var(--success)' : 'var(--warning)';
                        else if (rating <= 2) bgColor = sleepHrs < 6.5 ? 'var(--danger)' : 'var(--warning)';
                        
                        return `
                            <div style="background: ${bgColor}; height: ${Math.max(30, sleepHrs * 10)}px; border-radius: var(--radius-sm); display: flex; flex-direction: column; justify-content: center; align-items: center; font-size: 0.7rem; color: white; font-weight: 600;" title="${entry.date}: ${sleepHrs}h sleep, ${rating}/5 rating">
                                <div>${sleepHrs}h</div>
                                <div>⭐${rating}</div>
                            </div>
                        `;
                    }).join('')}
                </div>
                <div style="margin-top: 1rem; display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap; font-size: 0.8rem;">
                    <div><span style="display: inline-block; width: 12px; height: 12px; background: var(--success); border-radius: 2px; margin-right: 4px;"></span>Great session + good sleep</div>
                    <div><span style="display: inline-block; width: 12px; height: 12px; background: var(--warning); border-radius: 2px; margin-right: 4px;"></span>Mixed</div>
                    <div><span style="display: inline-block; width: 12px; height: 12px; background: var(--danger); border-radius: 2px; margin-right: 4px;"></span>Poor session + low sleep</div>
                </div>
            </div>
        </div>
    `;
}

// 4. WEEKLY SUMMARY HEATMAP
function generateWeeklyHeatmap(entries) {
    if (entries.length < 7) return '';
    
    // Get last 8 weeks of data
    const now = new Date();
    const eightWeeksAgo = new Date(now.getTime() - 56 * 24 * 60 * 60 * 1000);
    
    const recentEntries = entries.filter(e => new Date(e.date) >= eightWeeksAgo);
    if (recentEntries.length === 0) return '';
    
    // Group by week
    const weekData = {};
    recentEntries.forEach(entry => {
        const date = new Date(entry.date);
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        const weekKey = weekStart.toISOString().split('T')[0];
        
        if (!weekData[weekKey]) {
            weekData[weekKey] = { count: 0, totalRating: 0 };
        }
        weekData[weekKey].count++;
        weekData[weekKey].totalRating += parseInt(entry.rating);
    });
    
    return `
        <div class="chart-container">
            <h3>📅 Weekly Activity Heatmap (Last 8 Weeks)</h3>
            <div style="display: flex; gap: 0.5rem; margin-top: 1rem; overflow-x: auto;">
                ${Object.entries(weekData).sort((a, b) => new Date(a[0]) - new Date(b[0])).map(([week, data]) => {
                    const avgRating = data.totalRating / data.count;
                    let intensity = 'var(--gray-200)';
                    if (data.count >= 5 && avgRating >= 4) intensity = '#10b981';
                    else if (data.count >= 3 && avgRating >= 3.5) intensity = '#3b82f6';
                    else if (data.count >= 2) intensity = '#f59e0b';
                    else if (data.count >= 1) intensity = '#ef4444';
                    
                    const weekDate = new Date(week);
                    const monthDay = `${weekDate.getMonth() + 1}/${weekDate.getDate()}`;
                    
                    return `
                        <div style="flex: 1; min-width: 60px; text-align: center;">
                            <div style="background: ${intensity}; height: 80px; border-radius: var(--radius-md); display: flex; flex-direction: column; justify-content: center; align-items: center; color: white; font-weight: 600; margin-bottom: 0.25rem;" title="Week of ${week}: ${data.count} sessions, avg ${avgRating.toFixed(1)} rating">
                                <div style="font-size: 1.5rem;">${data.count}</div>
                                <div style="font-size: 0.7rem; opacity: 0.9;">sessions</div>
                            </div>
                            <div style="font-size: 0.7rem; color: var(--gray-600);">${monthDay}</div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;
}

// 5. OPPONENT WIN/LOSS TRACKER (for matches)
function generateOpponentTracker(matchEntries) {
    if (matchEntries.length < 3) return '';
    
    const opponents = {};
    matchEntries.forEach(entry => {
        if (!entry.opponentName) return;
        
        if (!opponents[entry.opponentName]) {
            opponents[entry.opponentName] = {
                matches: 0,
                totalRating: 0,
                wins: 0,
                losses: 0
            };
        }
        
        opponents[entry.opponentName].matches++;
        opponents[entry.opponentName].totalRating += parseInt(entry.rating);
        
        // Try to determine win/loss from scores
        if (entry.gameScores) {
            const scores = entry.gameScores.toLowerCase();
            // Simple heuristic - this could be improved
            const gamesWon = (scores.match(/11-\d+/g) || []).length;
            const gamesLost = (scores.match(/\d+-11/g) || []).length;
            
            if (gamesWon > gamesLost) opponents[entry.opponentName].wins++;
            else if (gamesLost > gamesWon) opponents[entry.opponentName].losses++;
        }
    });
    
    const sortedOpponents = Object.entries(opponents)
        .sort((a, b) => b[1].matches - a[1].matches)
        .slice(0, 5);
    
    if (sortedOpponents.length === 0) return '';
    
    return `
        <div class="insight-section">
            <h3>👥 Top Opponents</h3>
            <div style="display: flex; flex-direction: column; gap: 0.75rem; margin-top: 1rem;">
                ${sortedOpponents.map(([name, data]) => {
                    const avgRating = (data.totalRating / data.matches).toFixed(1);
                    const winRate = data.matches > 0 ? ((data.wins / data.matches) * 100).toFixed(0) : 0;
                    
                    return `
                        <div style="background: var(--gray-50); padding: 1rem; border-radius: var(--radius-md); border-left: 3px solid var(--primary);">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                                <strong style="color: var(--gray-800);">${name}</strong>
                                <span style="background: var(--primary); color: white; padding: 0.25rem 0.75rem; border-radius: var(--radius-full); font-size: 0.8rem; font-weight: 600;">
                                    ${data.matches} match${data.matches !== 1 ? 'es' : ''}
                                </span>
                            </div>
                            <div style="display: flex; gap: 1rem; font-size: 0.85rem; color: var(--gray-600);">
                                <div>Avg Rating: <strong>${avgRating}/5</strong></div>
                                ${data.wins + data.losses > 0 ? `<div>Record: <strong>${data.wins}W-${data.losses}L</strong></div>` : ''}
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;
}



// Helper function to extract performance trend section
function generatePerformanceTrendSection(stats) {
    let html = `<div class="insight-section">
        <h3>📊 Performance Trend</h3>
        <ul class="insight-list">`;
    
    if (stats.trend === 'improving') {
        html += `<li>🎉 <strong>Great news!</strong> Your performance is improving! Your recent sessions are averaging <strong>${stats.trendDiff}</strong> points higher than before.</li>`;
    } else if (stats.trend === 'declining') {
        html += `<li>⚠️ Your recent performance has dipped by <strong>${Math.abs(stats.trendDiff)}</strong> points. Review your recovery and preparation.</li>`;
    } else {
        html += `<li>➡️ Your performance has been <strong>consistent</strong> lately. Consider pushing yourself with new challenges.</li>`;
    }
    
    html += `</ul></div>`;
    return html;
}

window.loadInsights = loadInsights;