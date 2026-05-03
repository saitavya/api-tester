import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/database'

const DEFAULTS = {
  proxyUrl: '',
  proxyEnabled: false,
}

export function useSettings() {
  const rows = useLiveQuery(() => db.settings.toArray(), [], [])

  const settings = { ...DEFAULTS }
  ;(rows || []).forEach((row) => {
    settings[row.key] = row.value
  })

  const update = async (key, value) => {
    await db.settings.put({ key, value })
  }

  return { settings, update }
}