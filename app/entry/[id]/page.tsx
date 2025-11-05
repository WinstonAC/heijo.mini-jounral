'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import EntryDetail from '@/components/EntryDetail';
import { storage, JournalEntry } from '@/lib/store';

export default function EntryPage() {
  const params = useParams();
  const router = useRouter();
  const [entry, setEntry] = useState<JournalEntry | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (params.id) {
      loadEntry(params.id as string);
    }
  }, [params.id]);

  const loadEntry = async (id: string) => {
    try {
      const loadedEntry = await storage.getEntry(id);
      if (loadedEntry) {
        setEntry(loadedEntry);
      } else {
        setError('Entry not found');
      }
    } catch (error) {
      console.error('Failed to load entry:', error);
      setError('Failed to load entry');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await storage.deleteEntry(id);
      router.push('/journal');
    } catch (error) {
      console.error('Failed to delete entry:', error);
      alert('Failed to delete entry. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-2xl w-full mx-auto p-4 sm:p-6">
        <div className="bg-[var(--ui-screen)] rounded-lg card-border p-4 sm:p-6 lg:p-8">
          <div className="text-center text-[var(--ui-graphite)]">
            <p>Loading entry...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !entry) {
    return (
      <div className="max-w-2xl w-full mx-auto p-4 sm:p-6">
        <div className="bg-[var(--ui-screen)] rounded-lg card-border p-4 sm:p-6 lg:p-8">
          <div className="text-center text-[var(--ui-graphite)]">
            <p>{error || 'Entry not found'}</p>
            <button
              onClick={() => router.push('/journal')}
              className="mt-4 px-4 py-2 text-sm border border-[var(--ui-silver)] rounded-lg hover:bg-gray-100 transition-colors"
            >
              Back to Journal
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl w-full mx-auto p-4 sm:p-6">
      <div className="bg-[var(--ui-screen)] rounded-lg card-border p-4 sm:p-6">
        <EntryDetail entry={entry} onDelete={handleDelete} />
      </div>
    </div>
  );
}



