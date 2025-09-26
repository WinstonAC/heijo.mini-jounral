'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { storage, JournalEntry } from '@/lib/store';

export default function LibraryPage() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  useEffect(() => {
    loadEntries();
  }, []);

  const loadEntries = async () => {
    try {
      const loadedEntries = await storage.getEntries();
      setEntries(loadedEntries);
    } catch (error) {
      console.error('Failed to load entries:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredEntries = entries.filter(entry => {
    const matchesSearch = entry.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTag = !selectedTag || entry.tags.includes(selectedTag);
    return matchesSearch && matchesTag;
  });

  const allTags = Array.from(new Set(entries.flatMap(entry => entry.tags))).sort();

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className="max-w-2xl w-full mx-auto">
        <div className="bg-[var(--ui-screen)] rounded-lg card-border p-8">
          <div className="text-center text-[var(--ui-graphite)]">
            <p>Loading your library...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl w-full mx-auto">
      <div className="bg-[var(--ui-screen)] rounded-lg card-border">
        {/* Header */}
        <div className="h-12 px-4 flex items-center justify-between border-b border-[var(--ui-warm-silver)]">
          <Link
            href="/journal"
            className="text-sm text-[var(--ui-graphite)] hover:text-[var(--ui-press)] transition-colors"
          >
            ← Back to Journal
          </Link>
          <h1 className="lcd">LIBRARY</h1>
        </div>

        {/* Main content */}
        <div className="p-6 space-y-6">
          {/* Search and filters */}
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Search entries..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-[var(--ui-silver)] rounded-lg focus:ring-1 focus:ring-[var(--ui-press)] focus:outline-none"
            />
            
            {allTags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedTag(null)}
                  className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                    selectedTag === null
                      ? 'bg-[var(--ui-press)] text-white border-[var(--ui-press)]'
                      : 'bg-white text-[var(--ui-graphite)] border-[var(--ui-silver)] hover:border-[var(--ui-press)]'
                  }`}
                >
                  All
                </button>
                {allTags.map(tag => (
                  <button
                    key={tag}
                    onClick={() => setSelectedTag(tag)}
                    className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                      selectedTag === tag
                        ? 'bg-[var(--ui-press)] text-white border-[var(--ui-press)]'
                        : 'bg-white text-[var(--ui-graphite)] border-[var(--ui-silver)] hover:border-[var(--ui-press)]'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Entries list */}
          <div className="space-y-4">
            {filteredEntries.length === 0 ? (
              <div className="text-center py-8 text-[var(--ui-graphite)]">
                <p className="text-sm">
                  {searchTerm || selectedTag ? 'No entries match your filters' : 'No entries yet'}
                </p>
                <p className="text-xs mt-1">
                  {searchTerm || selectedTag ? 'Try adjusting your search' : 'Start writing to see your entries here'}
                </p>
              </div>
            ) : (
              filteredEntries.map(entry => (
                <Link
                  key={entry.id}
                  href={`/entry/${entry.id}`}
                  className="block p-4 bg-white rounded-lg border border-[var(--ui-warm-silver)] hover:border-[var(--ui-silver)] transition-colors"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <p className="text-sm text-gray-900 line-clamp-2 flex-1">
                        {entry.content}
                      </p>
                      <div className="ml-3 text-xs text-[var(--ui-graphite)]">
                        {entry.source === 'voice' ? '🎤' : '✏️'}
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex flex-wrap gap-1">
                        {entry.tags.map(tag => (
                          <span
                            key={tag}
                            className="px-2 py-1 text-xs bg-[var(--ui-warm-silver)] text-[var(--ui-graphite)] rounded"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                      <span className="text-xs text-[var(--ui-graphite)]">
                        {formatDate(entry.created_at)}
                      </span>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}



