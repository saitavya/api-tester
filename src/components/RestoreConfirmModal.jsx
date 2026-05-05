import { useState, useEffect } from 'react'
import Modal from './Modal'

function RestoreConfirmModal({ isOpen, onClose, summary, onConfirm }) {
  const [strategy, setStrategy] = useState('merge')
  const [working, setWorking] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setStrategy('merge')
      setWorking(false)
    }
  }, [isOpen])

  const handleConfirm = async () => {
    setWorking(true)
    try {
      await onConfirm(strategy)
    } catch (err) {
      // The parent shows the error
    } finally {
      setWorking(false)
    }
  }

  if (!summary) return null

  const counts = summary.counts || {}

  return (
    <Modal
      isOpen={isOpen}
      onClose={working ? () => {} : onClose}
      title="Restore from backup"
      width="w-[520px]"
      footer={
        <>
          <button
            onClick={onClose}
            disabled={working}
            className="px-4 py-2 text-sm text-slate-300 hover:text-white border border-slate-600 rounded hover:bg-slate-700 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={working}
            className={`px-4 py-2 text-sm text-white rounded font-medium ${
              strategy === 'replace'
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-blue-600 hover:bg-blue-700'
            } disabled:opacity-50`}
          >
            {working
              ? 'Restoring…'
              : strategy === 'replace'
                ? 'Replace and restore'
                : 'Merge and restore'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="bg-slate-900/50 border border-slate-700 rounded p-3 text-sm">
          <div className="text-slate-400 text-xs mb-1">Backup contains</div>
          <div className="grid grid-cols-2 gap-1 text-slate-200 text-xs">
            <div>{counts.collections || 0} collections</div>
            <div>{counts.requests || 0} saved requests</div>
            <div>{counts.environments || 0} environments</div>
            <div>{counts.history || 0} history entries</div>
            <div>{counts.settings || 0} settings</div>
          </div>
          {summary.exportedAt && (
            <div className="text-slate-500 text-xs mt-2">
              Exported {new Date(summary.exportedAt).toLocaleString()}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="radio"
              name="strategy"
              value="merge"
              checked={strategy === 'merge'}
              onChange={() => setStrategy('merge')}
              className="mt-1"
            />
            <div>
              <div className="text-sm text-slate-200">Merge with existing data</div>
              <div className="text-xs text-slate-500">
                Keeps everything you have now and adds the imported items alongside.
                Imported environments will be added but not auto-activated.
              </div>
            </div>
          </label>

          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="radio"
              name="strategy"
              value="replace"
              checked={strategy === 'replace'}
              onChange={() => setStrategy('replace')}
              className="mt-1"
            />
            <div>
              <div className="text-sm text-slate-200">Replace everything</div>
              <div className="text-xs text-red-400">
                ⚠ Wipes all current data first. This cannot be undone.
              </div>
            </div>
          </label>
        </div>
      </div>
    </Modal>
  )
}

export default RestoreConfirmModal