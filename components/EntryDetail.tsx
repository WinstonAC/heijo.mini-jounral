'use client';

import { JournalEntry } from '@/lib/store';
import Link from 'next/link';

interface EntryDetailProps {
  entry: JournalEntry;
  onDelete?: (id: string) => void;
}

export default function EntryDetail({ entry, onDelete }: EntryDetailProps) {
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  const handleDelete = () => {
    if (onDelete && confirm('Are you sure you want to delete this entry?')) {
      onDelete(entry.id);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link
          href="/journal"
          className="text-xs sm:text-sm text-[var(--ui-graphite)] hover:text-[var(--ui-press)] transition-colors"
        >
          ← Back to Journal
        </Link>
        {onDelete && (
          <button
            onClick={handleDelete}
            className="text-xs sm:text-sm text-red-600 hover:text-red-800 transition-colors"
          >
            Delete
          </button>
        )}
      </div>

      {/* Entry content */}
      <div className="bg-gradient-to-b from-heijo-card-top to-heijo-card-bottom rounded-lg border border-heijo-border p-4 sm:p-6 shadow-sm">
        <div className="space-y-3 sm:space-y-4">
          {/* Metadata */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs sm:text-sm text-text-secondary">
            <div className="flex items-center gap-2">
              <span>
                {entry.source === 'voice' ? '🎤 Voice' : '✏️ Text'}
              </span>
              <span>•</span>
              <span className="break-words">{formatDateTime(entry.created_at)}</span>
            </div>
          </div>

          {/* Tags */}
          {entry.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              {entry.tags.map(tag => (
                <span
                  key={tag}
                  className="px-2 sm:px-3 py-1 text-xs sm:text-sm bg-soft-silver text-text-secondary rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Content */}
          <div className="prose prose-sm max-w-none">
            <p className="whitespace-pre-wrap text-heijo-text leading-relaxed">
              {entry.content}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}



