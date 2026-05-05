import { useState, useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/database'
import NewCollectionModal from './NewCollectionModal'
import ConfirmModal from './ConfirmModal'
import ImportCollectionModal from './ImportCollectionModal'
import SearchBox from './SearchBox'
import { matchHistoryItem, filterCollection } from '../utils/searchFilter'
import { downloadCollection } from '../utils/postmanExport'

function Sidebar({ onLoadRequest }) {
  const [activeTab, setActiveTab] = useState('history')
  const [expandedCollections, setExpandedCollections] = useState({})
  const [newCollectionOpen, setNewCollectionOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [confirmState, setConfirmState] = useState(null)
  const [query, setQuery] = useState('')

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

  // --- Filtered views ---
  const filteredHistory = useMemo(() => {
    if (!history) return []
    return history.filter((item) => matchHistoryItem(item, query))
  }, [history, query])

  const filteredCollections = useMemo(() => {
    if (!collections) return []
    const allRequests = requests || []
    return collections
      .map((col) => {
        const colRequests = allRequests.filter((r) => r.collectionId === col.id)
        const { matches, requests: visible } = filterCollection(col, colRequests, query)
        return matches ? { ...col, _requests: visible } : null
      })
      .filter(Boolean)
  }, [collections, requests, query])

  const isExpanded = (id) => {
    if (query) return true
    return !!expandedCollections[id]
  }

  // --- Actions ---
  const askClearHistory = () => {
    setConfirmState({
      title: 'Clear history?',
      message: 'This will permanently delete all request history.',
      confirmLabel: 'Clear',
      danger: true,
      onConfirm: () => db.history.clear(),
    })
  }

  const askDeleteCollection = (id) => {
    setConfirmState({
      title: 'Delete collection?',
      message: 'This will delete the collection and all its saved requests.',
      confirmLabel: 'Delete',
      danger: true,
      onConfirm: async () => {
        await db.requests.where('collectionId').equals(id).delete()
        await db.collections.delete(id)
      },
    })
  }

  const deleteRequest = async (id) => {
    await db.requests.delete(id)
  }

  const createCollection = async (name) => {
    await db.collections.add({
      name,
      createdAt: Date.now(),
      uuid: crypto.randomUUID(),
    })
  }

  const toggleCollection = (id) => {
    setExpandedCollections((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const tabClass = (id) =>
    `flex-1 py-2 text-xs font-semibold tracking-wide ${
      activeTab === id ? 'text-white border-b-2 border-blue-500' : 'text-slate-400 hover:text-white'
    }`

  return (
    <>
      <aside className="w-64 bg-slate-800 border-r border-slate-700 flex flex-col">
        <div className="flex border-b border-slate-700">
          <button onClick={() => setActiveTab('history')} className={tabClass('history')}>
            HISTORY
          </button>
          <button onClick={() => setActiveTab('collections')} className={tabClass('collections')}>
            COLLECTIONS
          </button>
        </div>

        <SearchBox
          value={query}
          onChange={setQuery}
          placeholder={activeTab === 'history' ? 'Search history…' : 'Search collections…'}
        />

        <div className="flex-1 overflow-y-auto">
          {activeTab === 'history' && (
            <>
              {history && history.length > 0 && !query && (
                <div className="px-4 py-2 flex justify-end">
                  <button
                    onClick={askClearHistory}
                    className="text-xs text-slate-400 hover:text-red-400"
                  >
                    Clear
                  </button>
                </div>
              )}

              {history && history.length === 0 && (
                <div className="p-4 text-slate-400 text-sm">No requests yet</div>
              )}

              {history && history.length > 0 && filteredHistory.length === 0 && (
                <div className="p-4 text-slate-500 text-xs italic">
                  No matches for "{query}"
                </div>
              )}

              {filteredHistory.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onLoadRequest(item)}
                  className="w-full text-left px-4 py-2 hover:bg-slate-700 border-b border-slate-700/50"
                >
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold ${methodColor(item.method)}`}>
                      {item.method}
                    </span>
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
              {!query && (
                <div className="px-4 py-2 flex items-center gap-3">
                  <button
                    onClick={() => setNewCollectionOpen(true)}
                    className="text-xs text-blue-400 hover:text-blue-300 font-medium"
                  >
                    + New collection
                  </button>
                  <button
                    onClick={() => setImportOpen(true)}
                    className="text-xs text-blue-400 hover:text-blue-300 font-medium"
                  >
                    ↓ Import
                  </button>
                </div>
              )}

              {collections && collections.length === 0 && (
                <div className="px-4 text-slate-400 text-sm">No collections yet</div>
              )}

              {collections && collections.length > 0 && filteredCollections.length === 0 && (
                <div className="p-4 text-slate-500 text-xs italic">
                  No matches for "{query}"
                </div>
              )}

              {filteredCollections.map((col) => {
                const expanded = isExpanded(col.id)
                const colRequests = col._requests
                return (
                  <div key={col.id} className="border-b border-slate-700/50">
                    <div className="flex items-center px-4 py-2 hover:bg-slate-700 group">
                      <button
                        onClick={() => toggleCollection(col.id)}
                        className="flex-1 text-left text-sm text-white flex items-center gap-2"
                      >
                        <span className="text-xs">{expanded ? '▼' : '▶'}</span>
                        <span className="truncate">{col.name}</span>
                        <span className="text-xs text-slate-500 ml-auto">
                          {colRequests.length}
                        </span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          downloadCollection(col.name, colRequests)
                        }}
                        className="text-slate-500 hover:text-blue-400 ml-2 opacity-0 group-hover:opacity-100"
                        title="Export as Postman collection"
                      >
                        ↓
                      </button>
                      <button
                        onClick={() => askDeleteCollection(col.id)}
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

        {query && (
          <div className="px-3 py-2 border-t border-slate-700 text-[10px] text-slate-500">
            {activeTab === 'history'
              ? `${filteredHistory.length} of ${history?.length || 0} requests`
              : `${filteredCollections.length} of ${collections?.length || 0} collections`}
          </div>
        )}
      </aside>

      <NewCollectionModal
        isOpen={newCollectionOpen}
        onClose={() => setNewCollectionOpen(false)}
        onCreate={createCollection}
      />

      <ImportCollectionModal isOpen={importOpen} onClose={() => setImportOpen(false)} />

      <ConfirmModal
        isOpen={!!confirmState}
        onClose={() => setConfirmState(null)}
        onConfirm={confirmState?.onConfirm || (() => {})}
        title={confirmState?.title}
        message={confirmState?.message}
        confirmLabel={confirmState?.confirmLabel}
        danger={confirmState?.danger}
      />
    </>
  )
}

export default Sidebar