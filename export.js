// Export Module - WITH PERFORMANCE RATINGS (FIXED)
import { getAllEntriesFromFirestore } from './firestore-service.js';
import { showToast } from './ui-helpers.js';

// Export to CSV
export async function exportToCSV() {
    try {
        const entries = await getAllEntriesFromFirestore();
        
        if (!entries || entries.length === 0) {
            showToast('No entries to export', 'error');
            return;
        }

        entries.sort((a, b) => new Date(a.date) - new Date(b.date));

        const headers = [
            'Date', 'Weather', 'Temperature (°C)', 'Surface', 'Pre-Workout Meal', 
            'Hydration (L)', 'Sleep (hrs)', 'Session Type', 'Rating', 
            'Opponent Name', 'Opponent Level', 'Your Level', 'Game Scores',
            
            // Performance ratings (1-10 scale)
            'Length Width Rating', 'Length and Width Notes',
            'Height Pace Rating', 'Height and Pace Notes',
            'Control T Rating', 'Control and T Position Notes',
            'Movement Rating', 'Movement Notes',
            'Attack Rating', 'Attack Notes',
            'Hitting to Space Rating', 'Hitting to Space Notes',
            
            'Opponent - Strengths', 'Opponent - Weaknesses', 
            'Summary and Comments', 'One Thing to Work On',
            'Session Details', 'Notes' 
        ];
        
        const csvRows = [headers.join(',')];
        const escape = (text) => `"${(text || '').toString().replace(/"/g, '""')}"`;
        
        entries.forEach(entry => {
            const row = [
                entry.date,
                entry.weather,
                entry.temperature,
                escape(entry.surface),
                escape(entry.preWorkoutMeal),
                entry.hydration,
                entry.sleep,
                escape(entry.sessionType),
                entry.rating,
                escape(entry.opponentName),
                escape(entry.opponentLevel),
                escape(entry.yourLevel),
                escape(entry.gameScores),
                
                // Performance ratings
                entry.perfLengthWidthRating || '',
                escape(entry.perfLengthWidth),
                entry.perfHeightPaceRating || '',
                escape(entry.perfHeightPace),
                entry.perfControlTRating || '',
                escape(entry.perfControlT),
                entry.perfMovementRating || '',
                escape(entry.perfMovement),
                entry.perfAttackRating || '',
                escape(entry.perfAttack),
                entry.perfHittingToSpaceRating || '',
                escape(entry.perfHittingToSpace),
                
                escape(entry.oppStrengths),
                escape(entry.oppWeaknesses),
                escape(entry.matchSummary),
                escape(entry.oneThingToWorkOn),
                escape(entry.sessionDetails),
                escape(entry.notes)
            ];
            csvRows.push(row.join(','));
        });

        const csvContent = csvRows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `court-craft-journal-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        showToast('📊 CSV exported successfully!', 'success');
    } catch (error) {
        showToast('Error exporting CSV', 'error');
        console.error(error);
    }
}

// Make available globally for onclick handlers in HTML
window.exportToCSV = exportToCSV;