import { db } from '../db/database'

const BACKUP_VERSION = 1

// --- Export ---

export async function buildBackup() {
  // Safety net: ensure every row has a UUID before exporting.
  await ensureAllRowsHaveUuids()

  const [collections, requests, environments, settings, history] = await Promise.all([
    db.collections.toArray(),
    db.requests.toArray(),
    db.environments.toArray(),
    db.settings.toArray(),
    db.history.orderBy('timestamp').reverse().limit(200).toArray(),
  ])

  return {
    format: 'api-tester-backup',
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    data: {
      collections,
      requests,
      environments,
      settings,
      history,
    },
  }
}

async function ensureAllRowsHaveUuids() {
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

// Strip the auto-increment id and ensure a uuid is present on every record.
// Called for both replace and merge paths so all writes carry UUIDs.
function normalizeForInsert(record) {
  const { id, ...rest } = record
  return {
    ...rest,
    uuid: record.uuid || crypto.randomUUID(),
  }
}

export async function downloadBackup() {
  const backup = await buildBackup()
  const json = JSON.stringify(backup, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)

  const date = new Date().toISOString().slice(0, 10)
  const a = document.createElement('a')
  a.href = url
  a.download = `api-tester-backup-${date}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// --- Import ---

export function parseBackup(rawJsonText) {
  let parsed
  try {
    parsed = JSON.parse(rawJsonText)
  } catch (e) {
    throw new Error(`Invalid JSON: ${e.message}`)
  }

  if (!parsed || parsed.format !== 'api-tester-backup') {
    throw new Error('This is not an API Tester backup file')
  }
  if (typeof parsed.version !== 'number' || parsed.version > BACKUP_VERSION) {
    throw new Error(
      `Backup format version ${parsed.version} is newer than supported (${BACKUP_VERSION}).`
    )
  }
  if (!parsed.data || typeof parsed.data !== 'object') {
    throw new Error('Backup file is missing data')
  }

  const expected = ['collections', 'requests', 'environments', 'settings', 'history']
  for (const key of expected) {
    if (parsed.data[key] !== undefined && !Array.isArray(parsed.data[key])) {
      throw new Error(`Backup is corrupted: ${key} is not a list`)
    }
  }

  return parsed
}

// applyBackup(backup, strategy)
//   strategy: 'replace' wipes everything first; 'merge' deduplicates by UUID.
//
// Both paths assign UUIDs to records that lack them so future merges can dedupe correctly.
export async function applyBackup(backup, strategy = 'merge') {
  if (strategy === 'merge') {
    await ensureAllRowsHaveUuids()
  }

  const data = backup.data || {}
  const stats = {
    collections: { added: 0, updated: 0 },
    requests: { added: 0, updated: 0 },
    environments: { added: 0, updated: 0 },
    settings: { applied: 0 },
    history: { added: 0, skipped: 0 },
  }

  await db.transaction(
    'rw',
    [db.collections, db.requests, db.environments, db.settings, db.history],
    async () => {
      if (strategy === 'replace') {
        await Promise.all([
          db.collections.clear(),
          db.requests.clear(),
          db.environments.clear(),
          db.settings.clear(),
          db.history.clear(),
        ])
      }

      // --- Collections ---
      const collectionIdMap = new Map()

      for (const c of data.collections || []) {
        if (strategy === 'replace') {
          const record = normalizeForInsert(c)
          const newId = await db.collections.add(record)
          collectionIdMap.set(c.id, newId)
          stats.collections.added++
          continue
        }

        if (c.uuid) {
          const existing = await db.collections.where('uuid').equals(c.uuid).first()
          if (existing) {
            await db.collections.update(existing.id, { name: c.name })
            collectionIdMap.set(c.id, existing.id)
            stats.collections.updated++
            continue
          }
        }
        const record = normalizeForInsert(c)
        const newId = await db.collections.add({
          ...record,
          createdAt: c.createdAt || Date.now(),
        })
        collectionIdMap.set(c.id, newId)
        stats.collections.added++
      }

      // --- Requests ---
      for (const r of data.requests || []) {
        const remappedCollectionId =
          strategy === 'replace' ? collectionIdMap.get(r.collectionId) : collectionIdMap.get(r.collectionId)
        if (!remappedCollectionId) continue

        if (strategy === 'replace') {
          const record = normalizeForInsert(r)
          await db.requests.add({ ...record, collectionId: remappedCollectionId })
          stats.requests.added++
          continue
        }

        if (r.uuid) {
          const existing = await db.requests.where('uuid').equals(r.uuid).first()
          if (existing) {
            await db.requests.update(existing.id, {
              collectionId: remappedCollectionId,
              name: r.name,
              method: r.method,
              url: r.url,
              headers: r.headers,
              params: r.params,
              body: r.body,
              bodyType: r.bodyType,
              auth: r.auth,
            })
            stats.requests.updated++
            continue
          }
        }
        const record = normalizeForInsert(r)
        await db.requests.add({ ...record, collectionId: remappedCollectionId })
        stats.requests.added++
      }

      // --- Environments ---
      for (const e of data.environments || []) {
        if (strategy === 'replace') {
          const record = normalizeForInsert(e)
          await db.environments.add(record)
          stats.environments.added++
          continue
        }

        if (e.uuid) {
          const existing = await db.environments.where('uuid').equals(e.uuid).first()
          if (existing) {
            await db.environments.update(existing.id, {
              name: e.name,
              variables: e.variables,
            })
            stats.environments.updated++
            continue
          }
        }
        const record = normalizeForInsert(e)
        await db.environments.add({ ...record, isActive: 0 })
        stats.environments.added++
      }

      // --- Settings ---
      for (const s of data.settings || []) {
        await db.settings.put(s)
        stats.settings.applied++
      }

      // --- History ---
      for (const h of data.history || []) {
        if (strategy === 'replace') {
          const record = normalizeForInsert(h)
          await db.history.add(record)
          stats.history.added++
          continue
        }
        if (h.uuid) {
          const existing = await db.history.where('uuid').equals(h.uuid).first()
          if (existing) {
            stats.history.skipped++
            continue
          }
        }
        const record = normalizeForInsert(h)
        await db.history.add(record)
        stats.history.added++
      }
    }
  )

  return stats
}