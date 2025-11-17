/**
 * Quick sanity check that mirrors the filtering logic currently used in
 * HybridStorage.getEntries (lib/store.ts lines ~101-106).
 *
 * We simulate the data that LocalStorage.getEntries() returns for an anonymous
 * session: one legacy entry whose user_id === 'anonymous', and one brand new
 * entry that doesn't set user_id at all.
 */

const localEntries = [
  {
    id: 'legacy-anon',
    created_at: '2024-05-01T12:00:00.000Z',
    content: 'Legacy anon entry still stored with user_id="anonymous"',
    user_id: 'anonymous',
  },
  {
    id: 'guest-new',
    created_at: '2025-11-14T10:00:00.000Z',
    content: 'New guest entry saved after recent fixes',
    user_id: undefined,
  },
];

function filterLocalEntries(localEntries, currentUserId) {
  return currentUserId
    ? localEntries.filter((entry) => entry.user_id === currentUserId)
    : localEntries.filter((entry) => !entry.user_id);
}

const guestView = filterLocalEntries(localEntries, undefined);
const loggedInView = filterLocalEntries(localEntries, 'user-123');

console.log('Guest session sees:', guestView);
console.log('Logged-in session sees:', loggedInView);

if (!guestView.find((entry) => entry.id === 'legacy-anon')) {
  console.warn(
    '\nWARNING: Legacy guest entries with user_id="anonymous" are being dropped.\n' +
      'They pass through LocalStorage but are filtered out by HybridStorage.'
  );
}


