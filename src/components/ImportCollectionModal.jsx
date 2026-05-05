import { useState, useRef } from 'react'
import Modal from './Modal'
import { db } from '../db/database'
import { parsePostmanCollection } from '../utils/postmanImport'

function ImportCollectionModal({ isOpen, onClose }) {
  const fileInputRef = useRef(null)
  const [parsed, setParsed] = useState(null)
  const [error, setError] = useState('')
  const [importing, setImporting] = useState(false)
  const [collectionName, setCollectionName] = useState('')
  const [dragActive, setDragActive] = useState(false)

  const reset = () => {
    setParsed(null)
    setError('')
    setImporting(false)
    setCollectionName('')
    setDragActive(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const readFile = async (file) => {
    setError('')
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.json')) {
      setError('Please select a .json file')
      return
    }
    try {
      const text = await file.text()
      const result = parsePostmanCollection(text)
      setParsed(result)
      setCollectionName(result.collectionName)
    } catch (e) {
      setError(e.message)
      setParsed(null)
    }
  }

  const onFileChosen = (e) => {
    const file = e.target.files?.[0]
    if (file) readFile(file)
  }

  const onDrop = (e) => {
    e.preventDefault()
    setDragActive(false)
    const file = e.dataTransfer.files?.[0]
    if (file) readFile(file)
  }

  const onDragOver = (e) => {
    e.preventDefault()
    setDragActive(true)
  }

  const onDragLeave = (e) => {
    e.preventDefault()
    setDragActive(false)
  }

  const doImport = async () => {
    if (!parsed) return
    setImporting(true)
    try {
      const collectionId = await db.collections.add({
        name: collectionName.trim() || parsed.collectionName,
        uuid: crypto.randomUUID(),
        createdAt: Date.now(),
      })

      const now = Date.now()
      const records = parsed.requests.map((r) => ({
        collectionId,
        name: r.folderPath ? `[${r.folderPath}] ${r.name}` : r.name,
        method: r.method,
        url: r.url,
        headers: r.headers,
        params: r.params,
        body: r.body,
        auth: r.auth,
        uuid: crypto.randomUUID(),
        createdAt: now,
      }))

      await db.requests.bulkAdd(records)
      handleClose()
    } catch (e) {
      setError(`Import failed: ${e.message}`)
      setImporting(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Import Postman collection"
      width="w-[560px]"
      footer={
        <>
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm text-slate-300 hover:text-white border border-slate-600 rounded hover:bg-slate-700"
          >
            Cancel
          </button>
          {parsed && (
            <button
              onClick={doImport}
              disabled={importing || !collectionName.trim()}
              className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded font-medium"
            >
              {importing
                ? 'Importing…'
                : `Import ${parsed.requests.length} request${parsed.requests.length === 1 ? '' : 's'}`}
            </button>
          )}
        </>
      }
    >
      {!parsed && (
        <div>
          <div
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              dragActive
                ? 'border-blue-500 bg-blue-500/10'
                : 'border-slate-600 hover:border-slate-500 bg-slate-900/50'
            }`}
          >
            <div className="text-3xl mb-2 opacity-40">📥</div>
            <p className="text-sm text-slate-300 mb-1">
              Drop your Postman collection here, or click to browse
            </p>
            <p className="text-xs text-slate-500">
              Supports Postman v2 and v2.1 JSON exports
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={onFileChosen}
              className="hidden"
            />
          </div>

          {error && (
            <div className="mt-3 bg-red-950 border border-red-900 text-red-300 px-3 py-2 rounded text-xs">
              {error}
            </div>
          )}

          <div className="mt-4 text-xs text-slate-500">
            <p>
              <strong className="text-slate-400">How to export from Postman:</strong>{' '}
              right-click a collection → Export → choose v2.1 → Save.
            </p>
          </div>
        </div>
      )}

      {parsed && (
        <div className="space-y-4">
          <div>
            <label className="text-xs text-slate-400 block mb-1">Collection name</label>
            <input
              value={collectionName}
              onChange={(e) => setCollectionName(e.target.value)}
              className="w-full bg-slate-700 text-white px-3 py-2 rounded border border-slate-600 text-sm"
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1">
              Preview ({parsed.requests.length} request{parsed.requests.length === 1 ? '' : 's'})
            </label>
            <div className="bg-slate-900 border border-slate-700 rounded max-h-[200px] overflow-y-auto">
              {parsed.requests.slice(0, 50).map((r, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs border-b border-slate-800 last:border-0"
                >
                  <span className="font-bold text-slate-300 w-14 shrink-0">{r.method}</span>
                  <span className="text-slate-200 truncate flex-1" title={r.url}>
                    {r.name}
                  </span>
                  {r.folderPath && (
                    <span className="text-slate-500 text-[10px] shrink-0">{r.folderPath}</span>
                  )}
                </div>
              ))}
              {parsed.requests.length > 50 && (
                <div className="px-3 py-2 text-xs text-slate-500 italic">
                  …and {parsed.requests.length - 50} more
                </div>
              )}
            </div>
          </div>

          {parsed.warnings.length > 0 && (
            <div className="bg-yellow-950/50 border border-yellow-900 text-yellow-300 px-3 py-2 rounded text-xs">
              <p className="font-semibold mb-1">Some things were skipped or simplified:</p>
              <ul className="list-disc list-inside space-y-0.5">
                {parsed.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          <button onClick={reset} className="text-xs text-blue-400 hover:text-blue-300">
            ← Choose a different file
          </button>
        </div>
      )}
    </Modal>
  )
}

export default ImportCollectionModal