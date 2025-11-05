import { JournalEntry } from './store';

/**
 * Format date as "Nov 5, 2025"
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  });
}

/**
 * Format time as "9:02 PM"
 */
function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  });
}

/**
 * Export journal entries as CSV
 * Columns: Date, Time, Content, Tags, Source
 * Filename: heijo-journal-YYYY-MM-DD.csv
 */
export function exportEntriesAsCSV(entries: JournalEntry[]): void {
  // CSV Headers
  const headers = ['Date', 'Time', 'Content', 'Tags', 'Source'];
  
  // Convert entries to CSV rows
  const rows = entries.map(entry => {
    const date = formatDate(entry.created_at);
    const time = formatTime(entry.created_at);
    const content = escapeCSV(entry.content);
    const tags = entry.tags.join(', '); // Comma-separated tags
    const source = entry.source;
    
    return [date, time, content, tags, source];
  });

  // Combine headers and rows
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  
  // Filename: heijo-journal-YYYY-MM-DD.csv
  const today = new Date();
  const dateStr = today.toISOString().split('T')[0];
  link.download = `heijo-journal-${dateStr}.csv`;
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Escape CSV field values (handles commas, quotes, newlines)
 */
function escapeCSV(value: string): string {
  if (!value) return '';
  
  // If value contains comma, quote, or newline, wrap in quotes and escape quotes
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  
  return value;
}

