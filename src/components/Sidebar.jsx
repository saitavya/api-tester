import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/database'

function Sidebar({ onLoadRequest }) {
  const [activeTab, setActiveTab] = useState('history')
  const [expandedCollections, setExpandedCollections] = useState({})

  const history = useLiveQuery(() =>
    db.history.orderBy('timestamp').reverse().limit(50).toArray()
  )
  const collections = useLiveQuery(() => db.collections.toArray())
  const requests = useLiveQuery(() => db.requests.toArray())

  const methodColor = (method) => {
    const colors = {
      GET: 'text-green-400',
      POST: 'text-yellow-400',
      PUT: 'text-blue-400',
      PATCH: 'text-purple-400',
      DELETE: 'text-red-400',
    }
    return colors[method] || 'text-slate-400'
  }

  const clearHistory = async () => {
    if (confirm('Clear all history?')) await db.history.clear()
  }

  const createCollection = async () => {
    const name = prompt('Collection name:')
    if (name && name.trim()) {
      await db.collections.add({ name: name.trim(), createdAt: Date.now() })
    }
  }

  const deleteCollection = async (id) => {
    if (confirm('Delete this collection and all its requests?')) {
      await db.requests.where('collectionId').equals(id).delete()
      await db.collections.delete(id)
    }
  }

  const deleteRequest = async (id) => {
    await db.requests.delete(id)
  }

  const toggleCollection = (id) => {
    setExpandedCollections((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const tabClass = (id) =>
    `flex-1 py-2 text-xs font-semibold ${
      activeTab === id ? 'text-white border-b-2 border-blue-500' : 'text-slate-400 hover:text-white'
    }`

  return (
    <aside className="w-64 bg-slate-800 border-r border-slate-700 flex flex-col">
      <div className="flex border-b border-slate-700">
        <button onClick={() => setActiveTab('history')} className={tabClass('history')}>
          HISTORY
        </button>
        <button onClick={() => setActiveTab('collections')} className={tabClass('collections')}>
          COLLECTIONS
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeTab === 'history' && (
          <>
            <div className="px-4 py-2 flex items-center justify-between">
              {history && history.length > 0 && (
                <button onClick={clearHistory} className="text-xs text-slate-400 hover:text-red-400 ml-auto">
                  Clear
                </button>
              )}
            </div>
            {history && history.length === 0 && (
              <div className="p-4 text-slate-400 text-sm">No requests yet</div>
            )}
            {history &&
              history.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onLoadRequest(item)}
                  className="w-full text-left px-4 py-2 hover:bg-slate-700 border-b border-slate-700/50"
                >
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold ${methodColor(item.method)}`}>{item.method}</span>
                    <span className="text-xs text-slate-500 ml-auto">{item.status || '—'}</span>
                  </div>
                  <div className="text-xs text-slate-300 truncate mt-1" title={item.url}>
                    {item.url}
                  </div>
                </button>
              ))}
          </>
        )}

        {activeTab === 'collections' && (
          <>
            <div className="px-4 py-2">
              <button
                onClick={createCollection}
                className="text-xs text-blue-400 hover:text-blue-300 font-medium"
              >
                + New collection
              </button>
            </div>
            {collections && collections.length === 0 && (
              <div className="px-4 text-slate-400 text-sm">No collections yet</div>
            )}
            {collections &&
              collections.map((col) => {
                const colRequests = (requests || []).filter((r) => r.collectionId === col.id)
                const expanded = expandedCollections[col.id]
                return (
                  <div key={col.id} className="border-b border-slate-700/50">
                    <div className="flex items-center px-4 py-2 hover:bg-slate-700 group">
                      <button
                        onClick={() => toggleCollection(col.id)}
                        className="flex-1 text-left text-sm text-white flex items-center gap-2"
                      >
                        <span className="text-xs">{expanded ? '▼' : '▶'}</span>
                        <span className="truncate">{col.name}</span>
                        <span className="text-xs text-slate-500 ml-auto">{colRequests.length}</span>
                      </button>
                      <button
                        onClick={() => deleteCollection(col.id)}
                        className="text-slate-500 hover:text-red-400 ml-2 opacity-0 group-hover:opacity-100"
                        title="Delete collection"
                      >
                        ✕
                      </button>
                    </div>
                    {expanded &&
                      colRequests.map((req) => (
                        <div key={req.id} className="flex items-center hover:bg-slate-700 group">
                          <button
                            onClick={() => onLoadRequest(req)}
                            className="flex-1 text-left pl-8 pr-2 py-1.5"
                          >
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-bold ${methodColor(req.method)}`}>
                                {req.method}
                              </span>
                              <span className="text-xs text-slate-300 truncate">{req.name}</span>
                            </div>
                          </button>
                          <button
                            onClick={() => deleteRequest(req.id)}
                            className="text-slate-500 hover:text-red-400 px-2 opacity-0 group-hover:opacity-100"
                            title="Delete request"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                  </div>
                )
              })}
          </>
        )}
      </div>
    </aside>
  )
}

export default Sidebar