import { useState, useEffect } from 'react'
import Modal from './Modal'
import { parseCurl } from '../utils/curlParser'

function ImportCurlModal({ isOpen, onClose, onImport }) {
  const [input, setInput] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (isOpen) {
      setInput('')
      setError('')
    }
  }, [isOpen])

  const handleImport = () => {
    setError('')
    try {
      const parsed = parseCurl(input)
      onImport(parsed)
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to parse cURL command')
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Import from cURL"
      width="w-[640px]"
      footer={
        <>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-300 hover:text-white border border-slate-600 rounded hover:bg-slate-700"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={!input.trim()}
            className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded font-medium"
          >
            Import
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-xs text-slate-400">
          Paste a <code className="bg-slate-700 px-1 rounded">curl</code> command. Method, URL,
          headers, query params, and body will be auto-filled.
        </p>

        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`curl -X POST https://api.example.com/data \\\n  -H "Content-Type: application/json" \\\n  -d '{"key":"value"}'`}
          autoFocus
          spellCheck={false}
          className="w-full h-48 bg-slate-700 text-white px-3 py-2 rounded border border-slate-600 placeholder-slate-500 font-mono text-xs resize-none"
        />

        {error && (
          <div className="bg-red-950 border border-red-900 text-red-300 px-3 py-2 rounded text-xs">
            {error}
          </div>
        )}

        <div className="text-xs text-slate-500">
          Supported: <code className="bg-slate-700 px-1 rounded">-X</code>{' '}
          <code className="bg-slate-700 px-1 rounded">-H</code>{' '}
          <code className="bg-slate-700 px-1 rounded">-d</code>{' '}
          <code className="bg-slate-700 px-1 rounded">--data-raw</code>
        </div>
      </div>
    </Modal>
  )
}

export default ImportCurlModal