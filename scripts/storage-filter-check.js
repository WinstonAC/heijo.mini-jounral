#!/usr/bin/env node

/**
 * Lightweight reproduction script for the strict local-entry filtering logic.
 * Mirrors the guest vs. authenticated behavior in HybridStorage.getEntries.
 */

const entries = [
  {
    id: 'legacy-guest',
    created_at: '2024-01-01T00:00:00.000Z',
    content: 'Legacy guest entry saved before the fix',
    source: 'text',
    tags: [],
    user_id: 'anonymous',
    sync_status: 'local_only'
  },
  {
    id: 'new-guest',
    created_at: '2024-01-02T00:00:00.000Z',
    content: 'New guest entry with no user id',
    source: 'text',
    tags: [],
    user_id: undefined,
    sync_status: 'local_only'
  },
  {
    id: 'user-123-entry',
    created_at: '2024-01-03T00:00:00.000Z',
    content: 'Entry for user-123',
    source: 'text',
    tags: [],
    user_id: 'user-123',
    sync_status: 'synced'
  },
  {
    id: 'user-456-entry',
    created_at: '2024-01-04T00:00:00.000Z',
    content: 'Entry for user-456',
    source: 'text',
    tags: [],
    user_id: 'user-456',
    sync_status: 'synced'
  }
];

const filterEntries = (entries, currentUserId) => {
  const isGuestEntry = (entry) => !entry.user_id || entry.user_id === 'anonymous';
  return currentUserId
    ? entries.filter(entry => entry.user_id === currentUserId)
    : entries.filter(isGuestEntry);
};

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

// Guest mode: should show both anonymous variants and nothing else
const guestEntries = filterEntries(entries, undefined);
assert(guestEntries.length === 2, 'Guest view should show both legacy and new guest entries');
assert(guestEntries.some(entry => entry.id === 'legacy-guest'), 'Legacy guest entry missing (user_id="anonymous")');
assert(guestEntries.some(entry => entry.id === 'new-guest'), 'New guest entry missing (no user_id)');

// Authenticated mode: each user should only see their own data
const user123Entries = filterEntries(entries, 'user-123');
assert(user123Entries.length === 1 && user123Entries[0].id === 'user-123-entry', 'user-123 should only see their own entry');

const user456Entries = filterEntries(entries, 'user-456');
assert(user456Entries.length === 1 && user456Entries[0].id === 'user-456-entry', 'user-456 should only see their own entry');

console.log('storage-filter-check: PASS – guest + authenticated filtering behave as expected');
