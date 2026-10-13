// Export Module
import { getAllEntriesFromFirestore } from './firestore-service.js';
import { showToast } from './ui-helpers.js';
import { CSV_COLUMNS, distractionsToText } from './fields.js';

const cell = (text) => `"${(text ?? '').toString().replace(/"/g, '""')}"`;

export async function exportToCSV() {
    try {
        const entries = await getAllEntriesFromFirestore();

        if (!entries || entries.length === 0) {
            showToast('No entries to export', 'error');
            return;
        }

        entries.sort((a, b) => new Date(a.date) - new Date(b.date));

        const rows = [CSV_COLUMNS.map(([header]) => cell(header)).join(',')];

        entries.forEach(entry => {
            const row = CSV_COLUMNS.map(([, key]) => {
                if (key === 'distractions') return cell(distractionsToText(entry.distractions));
                return cell(entry[key]);
            });
            rows.push(row.join(','));
        });

        const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `trj-reflection-journal-${new Date().toISOString().split('T')[0]}.csv`;
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

window.exportToCSV = exportToCSV;
