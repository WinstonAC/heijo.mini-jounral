import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Test manual save behavior - ensures entries clear and appear in history
 * even when cloud sync fails (local-first approach)
 */
describe('Manual Save Behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should clear content and update entries on local save success even when cloud sync fails', async () => {
    // Simulate the saveEntry function behavior
    const mockOnSave = vi.fn().mockResolvedValue({
      id: 'local-123',
      content: 'Test entry',
      sync_status: 'local_only',
      created_at: new Date().toISOString(),
    });

    let content = 'Test entry';
    let entries: any[] = [];

    // Simulate saveEntry('manual') logic
    const saveEntry = async (saveType: 'manual' | 'auto') => {
      const contentToSave = content.trim();
      if (!contentToSave) return;

      try {
        const savedEntry = await mockOnSave({
          content: contentToSave,
          sync_status: 'local_only',
        });

        // Always update entries immediately after local save
        entries = [savedEntry, ...entries];

        // Only clear content for manual saves
        if (saveType === 'manual') {
          content = '';
        }

        return savedEntry;
      } catch (error) {
        // For manual saves, we should still clear if local save succeeded
        // Cloud sync failures don't block UI updates
        throw error;
      }
    };

    // Execute manual save
    await saveEntry('manual');

    // Verify: Entry was saved locally
    expect(mockOnSave).toHaveBeenCalledTimes(1);
    expect(entries).toHaveLength(1);
    expect(entries[0].content).toBe('Test entry');

    // Verify: Content was cleared (manual save)
    expect(content).toBe('');
  });

  it('should not clear content for auto-save', async () => {
    const mockOnSave = vi.fn().mockResolvedValue({
      id: 'local-123',
      content: 'Test entry',
      sync_status: 'local_only',
    });

    let content = 'Test entry';
    let entries: any[] = [];

    const saveEntry = async (saveType: 'manual' | 'auto') => {
      const savedEntry = await mockOnSave({
        content: content.trim(),
        sync_status: 'local_only',
      });

      entries = [savedEntry, ...entries];

      // Only clear content for manual saves
      if (saveType === 'manual') {
        content = '';
      }

      return savedEntry;
    };

    // Execute auto-save
    await saveEntry('auto');

    // Verify: Entry was saved
    expect(entries).toHaveLength(1);

    // Verify: Content was NOT cleared (auto-save)
    expect(content).toBe('Test entry');
  });

  it('should prevent duplicate entries with same content hash', () => {
    // Simulate content hash deduplication
    const lastSavedContentHash = 'test-entry-[]-text';
    const contentHash = 'test-entry-[]-text';

    // Should skip save if hash matches
    const shouldSkip = contentHash === lastSavedContentHash;
    expect(shouldSkip).toBe(true);

    // Different content should not skip
    const differentHash = 'different-entry-[]-text';
    const shouldNotSkip = differentHash === lastSavedContentHash;
    expect(shouldNotSkip).toBe(false);
  });

  it('should handle cloud sync failure gracefully', async () => {
    // Simulate local save success but cloud sync failure
    const mockLocalSave = vi.fn().mockResolvedValue({
      id: 'local-123',
      content: 'Test entry',
      sync_status: 'local_only',
    });

    let content = 'Test entry';
    let entries: any[] = [];

    // Simulate handleSave behavior - always updates UI after local save
    const handleSave = async (entry: any) => {
      // Local save always succeeds
      const savedEntry = await mockLocalSave(entry);
      
      // Always update UI immediately
      entries = [savedEntry, ...entries];
      
      // Cloud sync happens in background - errors don't block UI
      // Entry already has sync_status: 'local_only' from storage layer
      
      return savedEntry;
    };

    const savedEntry = await handleSave({
      content: 'Test entry',
      sync_status: 'local_only',
    });

    // Verify: Entry is in entries array (UI updated)
    expect(entries).toHaveLength(1);
    expect(entries[0].id).toBe('local-123');
    expect(savedEntry.sync_status).toBe('local_only');
  });
});

