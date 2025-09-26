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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link
          href="/journal"
          className="text-sm text-[var(--ui-graphite)] hover:text-[var(--ui-press)] transition-colors"
        >
          ← Back to Journal
        </Link>
        {onDelete && (
          <button
            onClick={handleDelete}
            className="text-sm text-red-600 hover:text-red-800 transition-colors"
          >
            Delete
          </button>
        )}
      </div>

      {/* Entry content */}
      <div className="bg-white rounded-lg border border-[var(--ui-warm-silver)] p-6">
        <div className="space-y-4">
          {/* Metadata */}
          <div className="flex items-center justify-between text-sm text-[var(--ui-graphite)]">
            <div className="flex items-center gap-2">
              <span>
                {entry.source === 'voice' ? '🎤 Voice' : '✏️ Text'}
              </span>
              <span>•</span>
              <span>{formatDateTime(entry.created_at)}</span>
            </div>
          </div>

          {/* Tags */}
          {entry.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {entry.tags.map(tag => (
                <span
                  key={tag}
                  className="px-3 py-1 text-sm bg-[var(--ui-warm-silver)] text-[var(--ui-graphite)] rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Content */}
          <div className="prose prose-sm max-w-none">
            <p className="whitespace-pre-wrap text-gray-900 leading-relaxed">
              {entry.content}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}



