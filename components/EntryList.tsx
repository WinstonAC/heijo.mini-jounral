'use client';

import { JournalEntry } from '@/lib/store';
import Link from 'next/link';

interface EntryListProps {
  entries: JournalEntry[];
}

export default function EntryList({ entries }: EntryListProps) {
  const today = new Date().toDateString();
  const todayEntries = entries.filter(entry => 
    new Date(entry.created_at).toDateString() === today
  );

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
    }
  };

  const groupEntriesByDate = (entries: JournalEntry[]) => {
    const groups: Record<string, JournalEntry[]> = {};
    
    entries.forEach(entry => {
      const dateKey = new Date(entry.created_at).toDateString();
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(entry);
    });

    return Object.entries(groups)
      .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime());
  };

  const groupedEntries = groupEntriesByDate(entries);

  if (entries.length === 0) {
    return (
      <div className="text-center py-8 text-[var(--ui-graphite)]">
        <p className="text-sm">No entries yet</p>
        <p className="text-xs mt-1">Start writing to see your entries here</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {groupedEntries.map(([dateKey, dateEntries]) => (
        <div key={dateKey}>
          <h3 className="text-xs text-[var(--ui-graphite)] mb-3 font-medium">
            {formatDate(dateEntries[0].created_at).toUpperCase()}
          </h3>
          <div className="space-y-2">
            {dateEntries.map(entry => (
              <Link
                key={entry.id}
                href={`/entry/${entry.id}`}
                className="block p-3 bg-white rounded-lg border border-[var(--ui-warm-silver)] hover:border-[var(--ui-silver)] transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 line-clamp-2">
                      {entry.content}
                    </p>
                    {entry.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {entry.tags.map(tag => (
                          <span
                            key={tag}
                            className="px-2 py-1 text-xs bg-[var(--ui-warm-silver)] text-[var(--ui-graphite)] rounded"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                      <div className="ml-3 flex flex-col items-end text-xs text-[var(--ui-graphite)]">
                        <div className="flex items-center gap-1">
                          <span>{formatTime(entry.created_at)}</span>
                          {entry.sync_status === 'synced' && (
                            <span className="text-[#4A7A4A]" title="Synced">●</span>
                          )}
                          {entry.sync_status === 'local_only' && (
                            <span className="text-[#8A8A8A]" title="Local only">○</span>
                          )}
                          {entry.sync_status === 'syncing' && (
                            <span className="text-[#6A6A6A] animate-pulse" title="Syncing">⟳</span>
                          )}
                          {entry.sync_status === 'error' && (
                            <span className="text-[#D8B8B8]" title="Sync error">!</span>
                          )}
                        </div>
                        <span className="mt-1">
                          {entry.source === 'voice' ? '🎤' : '✏️'}
                        </span>
                      </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}



