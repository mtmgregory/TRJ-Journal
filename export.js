// Export Module
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
            'Date', 'Session Type',
            'Opponent Name', 'Game Scores',

            // Performance notes
            'Length and Width Notes',
            'Height and Pace Notes',
            'Control and T Position Notes',
            'Movement Notes',
            'Attack Notes',
            'Hitting to Space Notes',

            'Opponent - Strengths', 'Opponent - Weaknesses',
            'Summary and Comments', 'One Thing to Work On',
            'Session Details', 'Notes'
        ];

        const csvRows = [headers.join(',')];
        const escape = (text) => `"${(text || '').toString().replace(/"/g, '""')}"`;

        entries.forEach(entry => {
            const row = [
                entry.date,
                escape(entry.sessionType),
                escape(entry.opponentName),
                escape(entry.gameScores),

                // Performance notes
                escape(entry.perfLengthWidth),
                escape(entry.perfHeightPace),
                escape(entry.perfControlT),
                escape(entry.perfMovement),
                escape(entry.perfAttack),
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