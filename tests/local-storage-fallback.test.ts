import assert from 'node:assert'
import { webcrypto as crypto } from 'node:crypto'

import type { JournalEntry } from '../lib/store'
import { LocalStorage } from '../lib/store'

class MemoryStorage {
  private store = new Map<string, string>()

  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value)
  }

  removeItem(key: string): void {
    this.store.delete(key)
  }

  clear(): void {
    this.store.clear()
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null
  }

  get length(): number {
    return this.store.size
  }
}

async function runScenario() {
  ;(globalThis as any).localStorage = new MemoryStorage()
  ;(globalThis as any).window = {}
  if (!globalThis.crypto) {
    Object.defineProperty(globalThis, 'crypto', {
      value: crypto as unknown as Crypto,
      configurable: true,
    })
  }

  const userId = 'user-123'
  const entry: JournalEntry = {
    id: 'entry-1',
    content: 'Hello from fallback',
    created_at: new Date().toISOString(),
    source: 'text',
    tags: [],
    user_id: userId,
    sync_status: 'local_only'
  }

  // Entries exist in the scoped key but Supabase will fail to load the user.
  ;(globalThis as any).localStorage.setItem(`heijo-journal-entries:${userId}`, JSON.stringify([entry]))
  // Remember the last known user id just like the app would do after a successful read.
  ;(globalThis as any).localStorage.setItem('heijo_last_user_id', userId)

  const failingSupabase = {
    auth: {
      async getUser() {
        throw new Error('Supabase temporarily unavailable')
      }
    }
  }

  const storage = new LocalStorage(failingSupabase as any, () => true)

  const entries = await storage.getEntries()

  assert.strictEqual(entries.length, 1, 'Expected one entry to be returned via fallback path')
  assert.strictEqual(entries[0].id, entry.id)
  assert.strictEqual(entries[0].user_id, userId)

  console.log('✅ LocalStorage fallback scenario passed: entries returned even when Supabase fails.')
}

runScenario().catch(error => {
  console.error('Fallback scenario failed:', error)
  process.exit(1)
})
