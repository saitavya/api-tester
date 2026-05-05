import Dexie from 'dexie'

export const db = new Dexie('ApiTesterDB_v2')

// Single schema declaration covering all tables and indexes including UUIDs.
// We don't declare older versions because each .version() call is additive
// in Dexie's internal version math and was inflating our DB version unexpectedly.
db.version(1).stores({
  history: '++id, timestamp, method, url, uuid',
  collections: '++id, name, createdAt, uuid',
  requests: '++id, collectionId, name, createdAt, uuid',
  environments: '++id, name, isActive, createdAt, uuid',
  settings: 'key',
})

// Imperative migration: backfill UUIDs into any existing rows that don't have them.
// Runs once per page load. Idempotent — safe to call repeatedly.
let _uuidBackfillDone = false

export async function ensureUuidsBackfilled() {
  if (_uuidBackfillDone) return
  _uuidBackfillDone = true

  const tables = [db.collections, db.requests, db.environments, db.history]
  for (const table of tables) {
    const rows = await table.toArray()
    for (const row of rows) {
      if (!row.uuid) {
        await table.update(row.id, { uuid: crypto.randomUUID() })
      }
    }
  }
}

// Kick it off automatically as soon as the DB opens.
db.on('ready', () => {
  ensureUuidsBackfilled()
})