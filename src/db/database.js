import Dexie from 'dexie'

export const db = new Dexie('ApiTesterDB')

db.version(1).stores({
  history: '++id, timestamp, method, url',
  collections: '++id, name, createdAt',
  requests: '++id, collectionId, name, createdAt',
})

db.version(2).stores({
  history: '++id, timestamp, method, url',
  collections: '++id, name, createdAt',
  requests: '++id, collectionId, name, createdAt',
  environments: '++id, name, isActive, createdAt',
})

db.version(3).stores({
  history: '++id, timestamp, method, url',
  collections: '++id, name, createdAt',
  requests: '++id, collectionId, name, createdAt',
  environments: '++id, name, isActive, createdAt',
  settings: 'key',
})