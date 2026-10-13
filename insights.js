// Insights Module - High-Performance Athlete Daily Journal
import { getAllEntriesFromFirestore } from './firestore-service.js';
import { esc } from './ui-helpers.js';
import { SESSION_TYPES, sessionLoad } from './fields.js';

// ---------- helpers ----------
const num = v => {
    const n = parseFloat(v);
    return isNaN(n) ? null : n;
};
const nums = (entries, key) => entries.map(e => num(e[key])).filter(v => v !== null);
const mean = arr => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);
const fmt = (v, d = 1) => (v === null || v === undefined ? 'N/A' : v.toFixed(d));

function localDate(str) {
    const p = String(str || '').split('-');
    return p.length === 3 ? new Date(+p[0], +p[1] - 1, +p[2]) : new Date(str);
}
function ymd(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function stdDev(arr) {
    const m = mean(arr);
    return Math.sqrt(mean(arr.map(v => (v - m) ** 2)));
}
function section(title, items) {
    return `<div class="insight-section"><h3>${title}</h3><ul class="insight-list">${items.map(i => `<li>${i}</li>`).join('')}</ul></div>`;
}
function tally(list) {
    const counts = {};
    list.forEach(raw => {
        const key = String(raw || '').trim().toLowerCase();
        if (!key) return;
        counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
}

// ---------- main ----------
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

        const stats = calculateStatistics(entries);
        statsGrid.innerHTML = renderStatsGrid(stats);

        let html = '';
        html += generateFocusTrendChart(entries);
        html += generateLoadSection(entries);
        html += generateSessionTypeChart(entries);
        html += generateWeeklyHeatmap(entries);
        html += generateRecoveryChart(entries);

        if (stats.trend !== 'insufficient_data') html += generateTrendSection(stats);
        html += analyzeBaseline(entries);
        html += analyzeOptimalConditions(entries);
        html += analyzeRecovery(entries, stats);
        html += analyzeGoals(entries);
        html += analyzeDistractions(entries);
        html += generateRecommendations(entries, stats);
        html += latestTomorrowFocus(entries);

        insightsContainer.innerHTML = html;
    } catch (error) {
        insightsContainer.innerHTML = '<div class="no-entries">❌ Error loading insights.</div>';
        console.error(error);
    }
}

function calculateStatistics(entries) {
    const stats = { totalSessions: entries.length };

    stats.avgFocus = mean(nums(entries, 'focusRating'));
    stats.avgRPE = mean(nums(entries, 'rpe'));
    stats.avgSleep = mean(nums(entries, 'sleep'));
    stats.avgSleepQuality = mean(nums(entries, 'sleepQuality'));
    stats.avgSoreness = mean(nums(entries, 'soreness'));
    stats.avgHydration = mean(nums(entries, 'hydration'));

    const withFocus = entries
        .filter(e => num(e.focusRating) !== null)
        .sort((a, b) => localDate(b.date) - localDate(a.date));

    if (withFocus.length >= 14) {
        const recent = mean(withFocus.slice(0, 7).map(e => num(e.focusRating)));
        const previous = mean(withFocus.slice(7, 14).map(e => num(e.focusRating)));
        stats.trend = recent > previous ? 'improving' : recent < previous ? 'declining' : 'stable';
        stats.trendDiff = (recent - previous).toFixed(1);
    } else {
        stats.trend = 'insufficient_data';
    }
    return stats;
}

function renderStatsGrid(stats) {
    const trendIcon = stats.trend === 'improving' ? '📈' : stats.trend === 'declining' ? '📉' : '➡️';
    const trendClass = stats.trend === 'improving' ? 'success' : stats.trend === 'declining' ? 'danger' : 'info';

    return `
        <div class="stat-card">
            <div class="stat-value">${stats.totalSessions}</div>
            <div class="stat-label">Total Sessions</div>
        </div>
        <div class="stat-card ${trendClass}">
            <div class="stat-value">${fmt(stats.avgFocus)}</div>
            <div class="stat-label">Avg Mental Focus ${trendIcon}</div>
        </div>
        <div class="stat-card warning">
            <div class="stat-value">${fmt(stats.avgSleep)}</div>
            <div class="stat-label">Avg Sleep (hrs)</div>
        </div>
        <div class="stat-card info">
            <div class="stat-value">${fmt(stats.avgRPE)}</div>
            <div class="stat-label">Avg Session RPE</div>
        </div>
    `;
}

// ---------- charts ----------
function generateFocusTrendChart(entries) {
    const sorted = entries
        .filter(e => num(e.focusRating) !== null)
        .sort((a, b) => localDate(a.date) - localDate(b.date))
        .slice(-30);
    if (sorted.length < 3) return '';

    const hasRPE = sorted.filter(e => num(e.rpe) !== null).length >= 3;
    const maxVal = 10;
    const pad = { top: 20, right: 20, bottom: 35, left: 45 };
    const innerWidth = 500;
    const innerHeight = 160;
    const totalWidth = innerWidth + pad.left + pad.right;
    const totalHeight = innerHeight + pad.top + pad.bottom;

    const xAt = i => (i / (sorted.length - 1)) * innerWidth;
    const yAt = v => innerHeight - (v / maxVal) * innerHeight;

    const focusPoints = sorted.map((e, i) => `${xAt(i)},${yAt(num(e.focusRating))}`).join(' ');
    const rpePoints = sorted
        .map((e, i) => (num(e.rpe) !== null ? `${xAt(i)},${yAt(num(e.rpe))}` : null))
        .filter(Boolean).join(' ');

    return `
        <div class="chart-container">
            <h3>📈 Mental Focus Trend (Last ${sorted.length} Sessions)</h3>
            <div style="width: 100%; margin-top: 1rem;">
                <svg viewBox="0 0 ${totalWidth} ${totalHeight}" style="width: 100%; height: auto;" preserveAspectRatio="xMinYMid meet">
                    <rect x="0" y="0" width="${totalWidth}" height="${totalHeight}" fill="var(--gray-50)" rx="8" />
                    <g transform="translate(${pad.left}, ${pad.top})">
                        ${[0, 2, 4, 6, 8, 10].map(v => `
                            <line x1="0" y1="${yAt(v)}" x2="${innerWidth}" y2="${yAt(v)}" stroke="var(--gray-300)" stroke-width="1" stroke-dasharray="4,4" opacity="0.6" />
                            <text x="-10" y="${yAt(v) + 4}" fill="var(--gray-600)" font-size="12" text-anchor="end" font-weight="600">${v}</text>
                        `).join('')}
                        ${hasRPE && rpePoints ? `<polyline points="${rpePoints}" fill="none" stroke="var(--warning)" stroke-width="2" stroke-dasharray="6,4" stroke-linecap="round" stroke-linejoin="round" />` : ''}
                        <polyline points="${focusPoints}" fill="none" stroke="var(--primary)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
                        ${sorted.map((e, i) => {
                            const d = localDate(e.date);
                            const f = num(e.focusRating);
                            let color = 'var(--gray-500)';
                            if (f >= 8) color = 'var(--success)';
                            else if (f <= 4) color = 'var(--danger)';
                            return `<circle cx="${xAt(i)}" cy="${yAt(f)}" r="5" fill="var(--gray-50)" stroke="${color}" stroke-width="2.5" style="cursor: pointer;">
                                <title>${d.getMonth() + 1}/${d.getDate()}: focus ${f}/10${num(e.rpe) !== null ? `, RPE ${num(e.rpe)}/10` : ''} - ${esc(e.sessionType || 'Session')}</title>
                            </circle>`;
                        }).join('')}
                        <text x="-35" y="${innerHeight / 2}" fill="var(--gray-700)" font-size="12" text-anchor="middle" transform="rotate(-90, -35, ${innerHeight / 2})" font-weight="600">Score (1-10)</text>
                        <text x="${innerWidth / 2}" y="${innerHeight + 25}" fill="var(--gray-700)" font-size="12" text-anchor="middle" font-weight="600">Sessions Over Time</text>
                    </g>
                </svg>
            </div>
            <div style="display: flex; justify-content: center; gap: 1.5rem; margin-top: 0.75rem; font-size: 0.85rem; color: var(--gray-600); flex-wrap: wrap;">
                <div><span style="display:inline-block;width:12px;height:12px;background:var(--success);border-radius:50%;margin-right:4px;"></span>High focus (8-10)</div>
                <div><span style="display:inline-block;width:12px;height:12px;background:var(--gray-500);border-radius:50%;margin-right:4px;"></span>Moderate (5-7)</div>
                <div><span style="display:inline-block;width:12px;height:12px;background:var(--danger);border-radius:50%;margin-right:4px;"></span>Low (1-4)</div>
                ${hasRPE ? '<div><span style="display:inline-block;width:18px;border-top:2px dashed var(--warning);margin-right:4px;vertical-align:middle;"></span>Session RPE</div>' : ''}
            </div>
        </div>
    `;
}

function generateSessionTypeChart(entries) {
    // known types first, then any other type found in older entries
    const extraTypes = [...new Set(entries.map(e => e.sessionType).filter(t => t && !SESSION_TYPES.includes(t)))];
    const data = [...SESSION_TYPES, ...extraTypes].map(type => {
        const subset = entries.filter(e => e.sessionType === type);
        return {
            label: type,
            focus: mean(nums(subset, 'focusRating')),
            rpe: mean(nums(subset, 'rpe')),
            count: subset.length
        };
    }).filter(d => d.focus !== null);

    if (data.length === 0) return '';

    const bar = (label, value, color) => `
        <div style="display:flex;align-items:center;gap:0.75rem;">
            <div style="min-width:110px;max-width:110px;font-weight:600;font-size:0.8rem;color:var(--gray-700);line-height:1.2;">${label}</div>
            <div style="flex:1;background:var(--gray-200);height:26px;border-radius:var(--radius-md);overflow:hidden;min-width:0;">
                <div style="width:${(value / 10) * 100}%;height:100%;background:${color};display:flex;align-items:center;justify-content:flex-end;padding:0 0.5rem;min-width:fit-content;">
                    <span style="color:white;font-weight:700;font-size:0.8rem;white-space:nowrap;">${value.toFixed(1)}/10</span>
                </div>
            </div>
        </div>`;

    return `
        <div class="chart-container">
            <h3>🎯 Averages by Session Type</h3>
            <div style="display:flex;flex-direction:column;gap:1.25rem;margin-top:1rem;">
                ${data.map(d => `
                    <div>
                        <div style="font-weight:700;color:var(--gray-800);margin-bottom:0.4rem;">${esc(d.label)} <span style="font-weight:500;color:var(--gray-500);font-size:0.8rem;">(${d.count} session${d.count !== 1 ? 's' : ''})</span></div>
                        <div style="display:flex;flex-direction:column;gap:0.4rem;">
                            ${bar('Mental Focus', d.focus, 'var(--primary)')}
                            ${d.rpe !== null ? bar('Session RPE', d.rpe, 'var(--warning)') : ''}
                        </div>
                    </div>`).join('')}
            </div>
        </div>
    `;
}

function generateRecoveryChart(entries) {
    const rows = entries
        .filter(e => num(e.sleep) !== null && num(e.focusRating) !== null)
        .sort((a, b) => localDate(a.date) - localDate(b.date))
        .slice(-24);
    if (rows.length < 5) return '';

    return `
        <div class="chart-container">
            <h3>😴 Sleep vs Mental Focus</h3>
            <div style="margin-top:1rem;padding:1rem;background:var(--gray-50);border-radius:var(--radius-md);">
                <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(44px,1fr));gap:0.5rem;align-items:end;">
                    ${rows.map(e => {
                        const sleep = num(e.sleep);
                        const focus = num(e.focusRating);
                        let bg = 'var(--warning)';
                        let fg = 'white';
                        if (focus >= 8 && sleep >= 7.5) { bg = 'var(--success)'; fg = '#000'; }
                        else if (focus <= 4 && sleep < 6.5) bg = 'var(--danger)';
                        return `<div style="background:${bg};height:${Math.max(36, sleep * 10)}px;border-radius:var(--radius-sm);display:flex;flex-direction:column;justify-content:center;align-items:center;font-size:0.7rem;color:${fg};font-weight:600;" title="${esc(e.date)}: ${sleep}h sleep, focus ${focus}/10">
                            <div>${sleep}h</div><div>🧠${focus}</div>
                        </div>`;
                    }).join('')}
                </div>
                <div style="margin-top:1rem;display:flex;gap:1rem;justify-content:center;flex-wrap:wrap;font-size:0.8rem;">
                    <div><span style="display:inline-block;width:12px;height:12px;background:var(--success);border-radius:2px;margin-right:4px;"></span>High focus + 7.5h+ sleep</div>
                    <div><span style="display:inline-block;width:12px;height:12px;background:var(--warning);border-radius:2px;margin-right:4px;"></span>Mixed</div>
                    <div><span style="display:inline-block;width:12px;height:12px;background:var(--danger);border-radius:2px;margin-right:4px;"></span>Low focus + under 6.5h sleep</div>
                </div>
            </div>
        </div>
    `;
}

function generateWeeklyHeatmap(entries) {
    if (entries.length < 7) return '';

    const eightWeeksAgo = new Date(Date.now() - 56 * 24 * 60 * 60 * 1000);
    const recent = entries.filter(e => localDate(e.date) >= eightWeeksAgo);
    if (recent.length === 0) return '';

    const weeks = {};
    recent.forEach(e => {
        const d = localDate(e.date);
        const start = new Date(d.getFullYear(), d.getMonth(), d.getDate() - d.getDay());
        const key = ymd(start);
        if (!weeks[key]) weeks[key] = { count: 0, focusTotal: 0, focusCount: 0 };
        weeks[key].count++;
        const f = num(e.focusRating);
        if (f !== null) { weeks[key].focusTotal += f; weeks[key].focusCount++; }
    });

    return `
        <div class="chart-container">
            <h3>📅 Weekly Activity Heatmap (Last 8 Weeks)</h3>
            <div style="display:flex;gap:0.5rem;margin-top:1rem;overflow-x:auto;">
                ${Object.entries(weeks).sort((a, b) => a[0].localeCompare(b[0])).map(([week, data]) => {
                    const avgFocus = data.focusCount ? data.focusTotal / data.focusCount : 0;
                    let color = '#e4002b';
                    let fg = '#fff';
                    if (data.count >= 5 && avgFocus >= 7.5) { color = '#ffffff'; fg = '#000'; }
                    else if (data.count >= 3 && avgFocus >= 6.5) { color = '#b0b0b0'; fg = '#000'; }
                    else if (data.count >= 2) { color = '#444444'; fg = '#fff'; }
                    const wd = localDate(week);
                    return `
                        <div style="flex:1;min-width:60px;text-align:center;">
                            <div style="background:${color};height:80px;border-radius:var(--radius-md);display:flex;flex-direction:column;justify-content:center;align-items:center;color:${fg};font-weight:600;margin-bottom:0.25rem;" title="Week of ${week}: ${data.count} sessions, avg focus ${avgFocus.toFixed(1)}">
                                <div style="font-size:1.5rem;">${data.count}</div>
                                <div style="font-size:0.7rem;opacity:0.9;">sessions</div>
                            </div>
                            <div style="font-size:0.7rem;color:var(--gray-600);">${wd.getMonth() + 1}/${wd.getDate()}</div>
                        </div>`;
                }).join('')}
            </div>
        </div>
    `;
}

// ---------- text insights ----------
function generateTrendSection(stats) {
    let line;
    if (stats.trend === 'improving') {
        line = `🎉 <strong>Great news!</strong> Your mental focus is improving. Recent sessions are averaging <strong>${stats.trendDiff}</strong> points higher than the previous block.`;
    } else if (stats.trend === 'declining') {
        line = `⚠️ Your recent mental focus has dipped by <strong>${Math.abs(stats.trendDiff)}</strong> points. Review your recovery, load and refocusing routines.`;
    } else {
        line = '➡️ Your mental focus has been <strong>consistent</strong> lately. Consider adding a new challenge to your process goals.';
    }
    return section('📊 Focus Trend', [line]);
}

function analyzeOptimalConditions(entries) {
    const good = entries.filter(e => num(e.focusRating) >= 8);
    if (good.length < 3) {
        return section('🌟 Optimal Conditions', ['Keep logging sessions (3+ with a focus rating of 8+) to discover what works best for you!']);
    }

    const items = [];
    const poor = entries.filter(e => num(e.focusRating) !== null && num(e.focusRating) <= 5);
    const n = `(n = ${good.length} high-focus sessions)`;

    const goodSleep = mean(nums(good, 'sleep'));
    if (goodSleep !== null) {
        const poorSleep = mean(nums(poor, 'sleep'));
        if (poorSleep !== null && poor.length >= 3 && goodSleep - poorSleep > 0.75) {
            items.push(`😴 <strong>Sleep pattern:</strong> high-focus sessions followed <strong>${goodSleep.toFixed(1)} hrs</strong> of sleep, vs ${poorSleep.toFixed(1)} hrs before lower-focus sessions (${poor.length} sessions rated 5 or below).`);
        } else {
            items.push(`⭐ High-focus sessions averaged <strong>${goodSleep.toFixed(1)} hrs</strong> of sleep ${n}.`);
        }
    }

    const lines = [
        ['sleepQuality', '💤 Sleep quality before your best sessions', '/10'],
        ['mood', '🙂 Mood before your best sessions', '/10'],
        ['stress', '😬 Perceived stress before your best sessions', '/10'],
        ['fatigue', '🔋 Fatigue before your best sessions', '/10'],
        ['soreness', '🦵 Muscle soreness before your best sessions', '/10'],
        ['hydration', '💧 Hydration before your best sessions', ' L']
    ];
    lines.forEach(([key, label, unit]) => {
        const v = mean(nums(good, key));
        if (v !== null) items.push(`${label}: about <strong>${v.toFixed(1)}${unit}</strong>.`);
    });

    const typeCounts = tally(good.map(e => e.sessionType));
    if (typeCounts.length) {
        const [type, count] = typeCounts[0];
        const original = good.find(e => (e.sessionType || '').toLowerCase() === type)?.sessionType || type;
        items.push(`🏷️ <strong>${Math.round((count / good.length) * 100)}%</strong> of your high-focus sessions were <strong>${esc(original)}</strong>.`);
    }

    items.push(`<em>These are patterns in your own data ${n}, not proof of cause. Treat them as things to test.</em>`);
    return section('🌟 What Makes Great Sessions', items);
}

function analyzeRecovery(entries, stats) {
    const items = [];

    if (stats.avgSleep !== null) {
        if (stats.avgSleep < 7) items.push(`⚠️ <strong>Action needed:</strong> You're averaging only ${stats.avgSleep.toFixed(1)} hours of sleep. Aim for 7.5-9 hours for optimal recovery.`);
        else if (stats.avgSleep >= 7.5) items.push(`✅ <strong>Excellent!</strong> You're averaging ${stats.avgSleep.toFixed(1)} hours of sleep. Keep it up!`);
        else items.push(`👍 Your sleep is decent (${stats.avgSleep.toFixed(1)} hrs), but there's room to reach 7.5+ hours.`);
    }

    if (stats.avgSleepQuality !== null && stats.avgSleepQuality < 6) {
        items.push(`💤 Sleep quality is averaging <strong>${stats.avgSleepQuality.toFixed(1)}/10</strong>. Consider a consistent wind-down routine.`);
    }

    if (stats.avgSoreness !== null) {
        if (stats.avgSoreness >= 7) items.push(`🦵 <strong>High soreness</strong> (${stats.avgSoreness.toFixed(1)}/10 average). Review training load and prioritise recovery work.`);
        else if (stats.avgSoreness <= 4) items.push(`✅ Soreness is well managed (${stats.avgSoreness.toFixed(1)}/10 average).`);
    }

    if (stats.avgHydration !== null) {
        if (stats.avgHydration < 2) items.push(`💧 <strong>Hydration alert:</strong> averaging only ${stats.avgHydration.toFixed(1)} L. Target 2.5-3 L daily.`);
        else if (stats.avgHydration >= 2.5) items.push(`✅ <strong>Great hydration!</strong> ${stats.avgHydration.toFixed(1)} L on average.`);
    }

    // RPE vs focus relationship
    const paired = entries.filter(e => num(e.rpe) !== null && num(e.focusRating) !== null);
    if (paired.length >= 5) {
        const highRPE = paired.filter(e => num(e.rpe) >= 8);
        const lowRPE = paired.filter(e => num(e.rpe) <= 6);
        if (highRPE.length >= 2 && lowRPE.length >= 2) {
            const diff = mean(highRPE.map(e => num(e.focusRating))) - mean(lowRPE.map(e => num(e.focusRating)));
            if (diff <= -1) items.push(`🔥 Mental focus drops by about <strong>${Math.abs(diff).toFixed(1)}</strong> points in high-exertion sessions (RPE 8+). Practise focus cues under fatigue.`);
            else if (diff >= 1) items.push(`🔥 You hold focus well under fatigue: <strong>+${diff.toFixed(1)}</strong> points in high-exertion sessions (RPE 8+).`);
        }
    }

    if (items.length === 0) items.push('Log sleep, hydration and soreness to unlock recovery insights.');
    return section('💪 Recovery & Preparation (general guides)', items);
}

function analyzeGoals(entries) {
    const withGoals = entries.filter(e => e.goal1 || e.goal2);
    const items = [];
    const pct = Math.round((withGoals.length / entries.length) * 100);
    items.push(`🎯 You set SMART process goals in <strong>${pct}%</strong> of your sessions (${withGoals.length} of ${entries.length}).`);

    const withStrategy = withGoals.filter(e => e.goal1Strategy || e.goal2Strategy).length;
    if (withGoals.length > 0 && withStrategy < withGoals.length * 0.7) {
        items.push('📝 Add an execution strategy to every goal. Knowing <em>how</em> you will keep focus makes goals far more likely to stick.');
    }

    // close the loop: plan -> monitor -> evaluate
    const goalAvg = e => {
        const v = [num(e.goal1Score), num(e.goal2Score)].filter(x => x !== null);
        return v.length ? mean(v) : null;
    };
    const scored = entries.filter(e => goalAvg(e) !== null);
    if (scored.length === 0) {
        if (withGoals.length > 0) {
            items.push('📏 Score each goal after the session (0–100%). Planning, monitoring and evaluating is what makes process goals work, and it needs a score to evaluate.');
        }
    } else {
        const avgs = scored.map(goalAvg);
        items.push(`📏 You held your process goals about <strong>${mean(avgs).toFixed(0)}%</strong> of the time on average (${scored.length} scored session${scored.length !== 1 ? 's' : ''}).`);

        const unscored = withGoals.filter(e => goalAvg(e) === null).length;
        if (unscored > 0) items.push(`📝 ${unscored} session${unscored !== 1 ? 's' : ''} had goals but no score. Scoring them keeps this average honest.`);

        const hi = scored.filter(e => goalAvg(e) >= 80 && num(e.focusRating) !== null);
        const lo = scored.filter(e => goalAvg(e) < 80 && num(e.focusRating) !== null);
        if (hi.length >= 3 && lo.length >= 3) {
            const a = mean(hi.map(e => num(e.focusRating)));
            const b = mean(lo.map(e => num(e.focusRating)));
            items.push(`🧠 Mental focus averaged <strong>${a.toFixed(1)}</strong> when you held goals 80%+ (${hi.length} sessions) vs <strong>${b.toFixed(1)}</strong> below 80% (${lo.length} sessions). A pattern worth watching, not proof.`);
        }
    }

    const highlights = entries.filter(e => e.highlight).length;
    const lessons = entries.filter(e => e.lesson).length;
    if (highlights < entries.length * 0.5 || lessons < entries.length * 0.5) {
        items.push('✨ Complete the post-session highlight and key lesson more often. They reinforce self-belief and speed up learning.');
    }
    return section('📝 Process Goals & Reflection', items);
}

function analyzeDistractions(entries) {
    const all = entries.flatMap(e => e.distractions || []);
    if (all.length === 0) {
        return section('🧩 Distraction Control', ['No distractions logged yet. Record them, your refocus routine and how well it worked to see which cues are worth keeping.']);
    }

    const items = [];
    const sessionsWith = entries.filter(e => (e.distractions || []).length > 0).length;
    items.push(`🧩 Distractions logged in <strong>${sessionsWith}</strong> session${sessionsWith !== 1 ? 's' : ''} (<strong>${all.length}</strong> total).`);

    const topDistractions = tally(all.map(d => d.distraction)).slice(0, 3);
    if (topDistractions.length) {
        items.push(`⚠️ <strong>Most common distractions:</strong> ${topDistractions.map(([t, c]) => `${esc(t)} (${c}×)`).join(', ')}.`);
    }

    const topCues = tally(all.map(d => d.refocus)).slice(0, 3);
    if (topCues.length) {
        items.push(`🔄 <strong>Most-used refocus routines:</strong> ${topCues.map(([t, c]) => `${esc(t)} (${c}×)`).join(', ')}.`);
    }

    // effectiveness: which routines actually work
    const ratedAll = all.map(d => num(d.effect)).filter(v => v !== null);
    if (ratedAll.length === 0) {
        items.push('⭐ Rate how well each routine worked (1–5). Then this page can show which routines to keep and which to replace.');
    } else {
        items.push(`⭐ Refocus routines worked <strong>${mean(ratedAll).toFixed(1)}/5</strong> on average (${ratedAll.length} rated).`);

        const byCue = {};
        all.forEach(d => {
            const key = String(d.refocus || '').trim().toLowerCase();
            const r = num(d.effect);
            if (!key || r === null) return;
            if (!byCue[key]) byCue[key] = [];
            byCue[key].push(r);
        });
        const cues = Object.entries(byCue)
            .filter(([, v]) => v.length >= 2)
            .map(([k, v]) => ({ cue: k, avg: mean(v), n: v.length }))
            .sort((a, b) => b.avg - a.avg);

        const best = cues.filter(c => c.avg >= 3.5).slice(0, 3);
        const weak = cues.filter(c => c.avg < 3).slice(-3).reverse();
        if (best.length) items.push(`✅ <strong>Working well:</strong> ${best.map(c => `${esc(c.cue)} (${c.avg.toFixed(1)}/5, used ${c.n}×)`).join(', ')}.`);
        if (weak.length) items.push(`🔧 <strong>Not working yet:</strong> ${weak.map(c => `${esc(c.cue)} (${c.avg.toFixed(1)}/5, used ${c.n}×)`).join(', ')}. Try changing the cue or practise it in training first.`);
        if (cues.length === 0) items.push('Use the same routine 2+ times and rate it each time to compare routines.');
    }

    const withoutRoutine = all.filter(d => d.distraction && !d.refocus).length;
    if (withoutRoutine > 0) {
        items.push(`💡 ${withoutRoutine} distraction${withoutRoutine !== 1 ? 's' : ''} had no refocusing routine recorded. Plan a specific cue for each.`);
    }
    return section('🧩 Distraction Control', items);
}

function generateRecommendations(entries, stats) {
    const recs = [];

    if (stats.avgSleep !== null && stats.avgSleep < 7.5) {
        recs.push({ p: 1, t: `<strong>Priority #1:</strong> Increase sleep to 7.5-8 hours. Your current ${stats.avgSleep.toFixed(1)} hours may be limiting performance.` });
    }
    if (stats.avgHydration !== null && stats.avgHydration < 2.5) {
        recs.push({ p: 2, t: `<strong>Hydration goal:</strong> Raise daily intake to 2.5-3 L (currently ${stats.avgHydration.toFixed(1)} L).` });
    }
    if (stats.avgSoreness !== null && stats.avgSoreness >= 7) {
        recs.push({ p: 2, t: '<strong>Manage load:</strong> Soreness is consistently high. Schedule active recovery and mobility work.' });
    }
    if (stats.trend === 'declining') {
        recs.push({ p: 1, t: `<strong>Focus dip detected:</strong> Review your last ${Math.min(entries.length, 7)} sessions to see what changed.` });
    }
    const noGoals = entries.filter(e => !e.goal1 && !e.goal2).length;
    if (noGoals > entries.length * 0.4) {
        recs.push({ p: 3, t: '<strong>Set 1-2 SMART process goals</strong> before every session to give your focus a controllable target.' });
    }
    const noCoach = entries.filter(e => !e.coachNotes).length;
    if (noCoach > entries.length * 0.6) {
        recs.push({ p: 3, t: '<strong>Capture coach feedback</strong> after sessions so it can feed into your IPP review.' });
    }

    const noDuration = entries.filter(e => sessionLoad(e) === null).length;
    if (noDuration > entries.length * 0.5) {
        recs.push({ p: 3, t: '<strong>Log session duration</strong> with your RPE so the app can calculate training load, monotony and strain.' });
    }
    const goalEntries = entries.filter(e => e.goal1 || e.goal2);
    const unscoredGoals = goalEntries.filter(e => num(e.goal1Score) === null && num(e.goal2Score) === null).length;
    if (goalEntries.length >= 3 && unscoredGoals > goalEntries.length * 0.5) {
        recs.push({ p: 3, t: '<strong>Score your goals</strong> after each session (0–100%) to see whether your process goals are being held.' });
    }

    recs.sort((a, b) => a.p - b.p);
    const items = recs.length
        ? recs.map(r => r.t)
        : ["🎉 <strong>Great job!</strong> You're doing well across all key areas. Keep tracking and stay consistent!"];
    return section('💡 Actionable Recommendations', items);
}

function latestTomorrowFocus(entries) {
    const latest = entries
        .filter(e => e.tomorrowFocus)
        .sort((a, b) => localDate(b.date) - localDate(a.date))[0];
    if (!latest) return '';
    return section('➡️ Your Most Recent Next-Session Focus', [`<strong>${esc(latest.date)}:</strong> ${esc(latest.tomorrowFocus)}`]);
}


// ---------- training load (session-RPE x minutes) ----------
function weekStartMonday(d) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7));
}

function generateLoadSection(entries) {
    const withLoad = entries.filter(e => sessionLoad(e) !== null);
    if (withLoad.length === 0) {
        return section('⚡ Training Load', ['Add session duration (minutes) next to your session RPE. Load = RPE × minutes, and this page will show weekly load, monotony and strain.']);
    }

    const daily = {};
    withLoad.forEach(e => {
        const k = ymd(localDate(e.date));
        daily[k] = (daily[k] || 0) + sessionLoad(e);
    });

    const weekKeys = [...new Set(Object.keys(daily).map(k => ymd(weekStartMonday(localDate(k)))))].sort().slice(-8);
    const thisWeek = ymd(weekStartMonday(new Date()));

    const weeks = weekKeys.map(ws => {
        const start = localDate(ws);
        const days = Array.from({ length: 7 }, (_, i) =>
            daily[ymd(new Date(start.getFullYear(), start.getMonth(), start.getDate() + i))] || 0);
        const total = days.reduce((a, b) => a + b, 0);
        const m = total / 7;
        const sd = Math.sqrt(days.reduce((a, b) => a + (b - m) ** 2, 0) / 6);
        const complete = ws < thisWeek;
        const monotony = complete && sd > 0 ? m / sd : null;
        return { ws, start, total, monotony, strain: monotony !== null ? total * monotony : null, complete };
    });

    const maxTotal = Math.max(...weeks.map(w => w.total));
    const bars = weeks.map((w, i) => `
        <div style="display:flex;align-items:center;gap:0.75rem;">
            <div style="min-width:64px;font-size:0.8rem;color:var(--gray-600);">${w.start.getMonth() + 1}/${w.start.getDate()}${w.complete ? '' : ' (so far)'}</div>
            <div style="flex:1;background:var(--gray-200);height:24px;border-radius:var(--radius-md);overflow:hidden;min-width:0;">
                <div style="width:${(w.total / maxTotal) * 100}%;height:100%;background:${i === weeks.length - 1 ? '#fff' : 'var(--gray-500)'};display:flex;align-items:center;justify-content:flex-end;padding:0 0.5rem;min-width:fit-content;">
                    <span style="color:${i === weeks.length - 1 ? '#000' : '#fff'};font-weight:700;font-size:0.8rem;white-space:nowrap;">${w.total}</span>
                </div>
            </div>
        </div>`).join('');

    const items = [];
    const done = weeks.filter(w => w.complete);
    const last = done[done.length - 1];
    const prev = done[done.length - 2];
    if (last) {
        let line = `📅 Week of ${last.start.getMonth() + 1}/${last.start.getDate()}: load <strong>${last.total}</strong> AU`;
        if (prev && prev.total > 0) {
            const change = Math.round(((last.total - prev.total) / prev.total) * 100);
            line += `, ${change >= 0 ? '+' : ''}${change}% vs the week before`;
        }
        line += '.';
        items.push(line);
        if (last.monotony !== null) {
            const high = last.monotony > 2;
            items.push(`${high ? '⚠️' : '✅'} <strong>Monotony ${last.monotony.toFixed(1)}</strong> (average daily load ÷ its variation). ${high ? 'Above 2.0 is commonly treated as a warning sign: vary hard and easy days more.' : 'Under 2.0, so hard and easy days are varied.'} <strong>Strain ${Math.round(last.strain)}</strong> (weekly load × monotony).`);
        }
    } else {
        items.push('Weekly monotony and strain appear once a full Monday–Sunday week is logged.');
    }
    items.push('<em>Days with no logged session count as rest. Several sessions on one day are added together.</em>');

    return `
        <div class="chart-container">
            <h3>⚡ Weekly Training Load (RPE × minutes)</h3>
            <div style="display:flex;flex-direction:column;gap:0.5rem;margin-top:1rem;">${bars}</div>
            <ul class="insight-list" style="margin-top:1rem;">${items.map(i => `<li>${i}</li>`).join('')}</ul>
        </div>
    `;
}

// ---------- recent readings vs the athlete's own baseline ----------
const BASELINE_METRICS = [
    { key: 'sleep', label: 'Sleep', icon: '😴', unit: ' hrs', higherBetter: true, floor: 0.5 },
    { key: 'sleepQuality', label: 'Sleep quality', icon: '💤', unit: '/10', higherBetter: true, floor: 0.75 },
    { key: 'mood', label: 'Mood', icon: '🙂', unit: '/10', higherBetter: true, floor: 0.75 },
    { key: 'stress', label: 'Perceived stress', icon: '😬', unit: '/10', higherBetter: false, floor: 0.75 },
    { key: 'fatigue', label: 'Fatigue', icon: '🔋', unit: '/10', higherBetter: false, floor: 0.75 },
    { key: 'soreness', label: 'Muscle soreness', icon: '🦵', unit: '/10', higherBetter: false, floor: 0.75 }
];

function analyzeBaseline(entries) {
    const sorted = [...entries].sort((a, b) => localDate(a.date) - localDate(b.date));
    const flagged = [];
    const steady = [];

    BASELINE_METRICS.forEach(m => {
        const values = sorted.map(e => num(e[m.key])).filter(v => v !== null);
        if (values.length < 10) return;

        const recent = values.slice(-3);
        const base = values.slice(Math.max(0, values.length - 3 - 28), values.length - 3);
        if (base.length < 7) return;

        const baseMean = mean(base);
        const spread = Math.max(stdDev(base), m.floor);
        const diff = mean(recent) - baseMean;
        const text = `${m.icon} <strong>${m.label}</strong>: last 3 sessions average <strong>${mean(recent).toFixed(1)}${m.unit}</strong> vs your usual ${baseMean.toFixed(1)}${m.unit} (n = ${base.length})`;

        if (Math.abs(diff) >= spread) {
            const better = m.higherBetter ? diff > 0 : diff < 0;
            flagged.push(`${better ? '✅' : '⚠️'} ${text}, ${better ? 'better' : 'worse'} than your normal range.`);
        } else {
            steady.push(m.label.toLowerCase());
        }
    });

    const items = [...flagged];
    if (steady.length) items.push(`➡️ Within your usual range: ${steady.join(', ')}.`);
    if (items.length === 0) {
        items.push('This compares your last 3 sessions with your own recent average. It needs about 10 entries per measure, so keep logging.');
    } else {
        items.push('<em>Compared with your own baseline (up to the 28 sessions before the latest 3), not a fixed cut-off. A change of one normal spread or more is flagged.</em>');
    }
    return section('📏 Compared With Your Own Baseline', items);
}

window.loadInsights = loadInsights;
