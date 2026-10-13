// Shared field definitions for TRJ Reflection Journals (athlete daily journal)

export const SESSION_TYPES = [
    'S&C',
    'On Court',
    'Off Court'
];


// form element id -> stored entry key
export const FIELD_MAP = {
    entryDate: 'date',
    athleteName: 'athleteName',
    sessionTypeSelect: 'sessionType',
    sleepHours: 'sleep',
    sleepQuality: 'sleepQuality',
    hydration: 'hydration',
    soreness: 'soreness',
    moodScore: 'mood',
    stressScore: 'stress',
    fatigueScore: 'fatigue',
    goal1: 'goal1',
    goal1Strategy: 'goal1Strategy',
    goal2: 'goal2',
    goal2Strategy: 'goal2Strategy',
    highlight: 'highlight',
    lesson: 'lesson',
    resilience: 'resilience',
    goal1Score: 'goal1Score',
    goal2Score: 'goal2Score',
    sessionDuration: 'duration',
    sessionRPE: 'rpe',
    focusRating: 'focusRating',
    coachNotes: 'coachNotes',
    tomorrowFocus: 'tomorrowFocus'
};

// CSV header -> entry key (distractions handled separately)
export const CSV_COLUMNS = [
    ['Date', 'date'],
    ['Athlete Name', 'athleteName'],
    ['Session Type', 'sessionType'],
    ['Sleep Duration (hrs)', 'sleep'],
    ['Sleep Quality (1-10)', 'sleepQuality'],
    ['Hydration (L)', 'hydration'],
    ['Muscle Soreness (1-10)', 'soreness'],
    ['Mood (1-10)', 'mood'],
    ['Perceived Stress (1-10)', 'stress'],
    ['Fatigue (1-10)', 'fatigue'],
    ['Goal 1', 'goal1'],
    ['Goal 1 Execution Strategy', 'goal1Strategy'],
    ['Goal 1 Achieved (%)', 'goal1Score'],
    ['Goal 2', 'goal2'],
    ['Goal 2 Execution Strategy', 'goal2Strategy'],
    ['Goal 2 Achieved (%)', 'goal2Score'],
    ['Highlight / Evidence', 'highlight'],
    ['Key Lesson Learned', 'lesson'],
    ['Determination & Resilience', 'resilience'],
    ['Session Duration (min)', 'duration'],
    ['Session RPE (1-10)', 'rpe'],
    ['Mental Focus Rating (1-10)', 'focusRating'],
    ['Distractions', 'distractions'],
    ['Coach Feedback / Debrief Notes', 'coachNotes'],
    ["Target Focus for Tomorrow's Session", 'tomorrowFocus']
];

// Session load (arbitrary units) = session RPE x duration in minutes.
// Returns null unless both numbers are present.
export function sessionLoad(entry) {
    const rpe = parseFloat(entry?.rpe);
    const minutes = parseFloat(entry?.duration);
    if (isNaN(rpe) || isNaN(minutes) || rpe <= 0 || minutes <= 0) return null;
    return Math.round(rpe * minutes);
}

// Distractions <-> text.
// One row per line: distraction | reaction | refocus routine | worked (1-5)
// Older 3-part lines still import (worked is left blank).
const clean = s => (s || '').toString().replace(/\s*\|\s*/g, ' / ').replace(/\n/g, ' ');

export function distractionsToText(list) {
    return (list || [])
        .map(d => [clean(d.distraction), clean(d.reaction), clean(d.refocus), clean(d.effect)].join(' | '))
        .join('\n');
}

export function textToDistractions(text) {
    return (text || '')
        .split('\n')
        .map(line => line.split('|').map(s => s.trim()))
        .filter(p => p.some(Boolean))
        .map(p => {
            const effect = parseInt(p[3]);
            return {
                distraction: p[0] || '',
                reaction: p[1] || '',
                refocus: p[2] || '',
                effect: effect >= 1 && effect <= 5 ? String(effect) : ''
            };
        });
}
