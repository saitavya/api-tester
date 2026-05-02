import { useState, useEffect } from 'react'
import Modal from './Modal'

function NewCollectionModal({ isOpen, onClose, onCreate }) {
  const [name, setName] = useState('')

  useEffect(() => {
    if (isOpen) setName('')
  }, [isOpen])

  const handleCreate = async () => {
    if (!name.trim()) return
    await onCreate(name.trim())
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="New collection"
      footer={
        <>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-300 hover:text-white border border-slate-600 rounded hover:bg-slate-700"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!name.trim()}
            className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded font-medium"
          >
            Create
          </button>
        </>
      }
    >
      <label className="text-xs text-slate-400 block mb-1">Collection name</label>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
        placeholder="e.g. GitHub API"
        autoFocus
        className="w-full bg-slate-700 text-white px-3 py-2 rounded border border-slate-600 placeholder-slate-400 text-sm"
      />
    </Modal>
  )
}

export default NewCollectionModal