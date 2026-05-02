import { useState, useEffect } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/database'
import Modal from './Modal'

function SaveRequestModal({ isOpen, onClose, defaultName, onSave }) {
  const collections = useLiveQuery(() => db.collections.toArray(), [], [])

  const [requestName, setRequestName] = useState('')
  const [collectionId, setCollectionId] = useState('')
  const [newCollectionName, setNewCollectionName] = useState('')
  const [creatingNew, setCreatingNew] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    setRequestName(defaultName || '')
    setNewCollectionName('')

    if (collections && collections.length > 0) {
      setCollectionId(String(collections[0].id))
      setCreatingNew(false)
    } else {
      setCollectionId('')
      setCreatingNew(true)
    }
  }, [isOpen, defaultName, collections])

  const handleSave = async () => {
    if (!requestName.trim()) return

    let targetCollectionId

    if (creatingNew) {
      if (!newCollectionName.trim()) return
      targetCollectionId = await db.collections.add({
        name: newCollectionName.trim(),
        createdAt: Date.now(),
      })
    } else {
      if (!collectionId) return
      targetCollectionId = parseInt(collectionId, 10)
    }

    await onSave(targetCollectionId, requestName.trim())
    onClose()
  }

  const canSave =
    requestName.trim() &&
    (creatingNew ? newCollectionName.trim() : collectionId)

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Save request"
      footer={
        <>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-300 hover:text-white border border-slate-600 rounded hover:bg-slate-700"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave}
            className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded font-medium"
          >
            Save
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="text-xs text-slate-400 block mb-1">Request name</label>
          <input
            value={requestName}
            onChange={(e) => setRequestName(e.target.value)}
            placeholder="e.g. Get all users"
            autoFocus
            className="w-full bg-slate-700 text-white px-3 py-2 rounded border border-slate-600 placeholder-slate-400 text-sm"
          />
        </div>

        <div>
          <label className="text-xs text-slate-400 block mb-1">Collection</label>

          {!creatingNew && collections && collections.length > 0 && (
            <div className="flex gap-2">
              <select
                value={collectionId}
                onChange={(e) => setCollectionId(e.target.value)}
                className="flex-1 bg-slate-700 text-white px-3 py-2 rounded border border-slate-600 text-sm"
              >
                {collections.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <button
                onClick={() => setCreatingNew(true)}
                className="px-3 py-2 text-sm text-blue-400 hover:text-blue-300 border border-slate-600 rounded hover:bg-slate-700"
              >
                + New
              </button>
            </div>
          )}

          {creatingNew && (
            <div className="flex gap-2">
              <input
                value={newCollectionName}
                onChange={(e) => setNewCollectionName(e.target.value)}
                placeholder="New collection name"
                className="flex-1 bg-slate-700 text-white px-3 py-2 rounded border border-slate-600 placeholder-slate-400 text-sm"
              />
              {collections && collections.length > 0 && (
                <button
                  onClick={() => setCreatingNew(false)}
                  className="px-3 py-2 text-sm text-slate-300 hover:text-white border border-slate-600 rounded hover:bg-slate-700"
                >
                  Cancel
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}

export default SaveRequestModal