import { useState, useEffect, useMemo } from 'react'
import Modal from './Modal'
import { LANGUAGES, generateSnippet } from '../utils/codeSnippets'

const STORAGE_KEY = 'preferredSnippetLanguage'

function CodeSnippetModal({ isOpen, onClose, request }) {
  const [language, setLanguage] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || 'curl'
    } catch {
      return 'curl'
    }
  })
  const [copied, setCopied] = useState(false)

  // Persist the user's last-selected language
  useEffect(() => {
    if (!language) return
    try {
      localStorage.setItem(STORAGE_KEY, language)
    } catch {
      // localStorage may be unavailable (private mode) — silently ignore
    }
  }, [language])

  // Reset copy state every time the modal opens
  useEffect(() => {
    if (isOpen) setCopied(false)
  }, [isOpen])

  const snippet = useMemo(() => {
    if (!request || !request.url) return '// Enter a URL first'
    return generateSnippet(language, request)
  }, [language, request])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(snippet)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // ignore
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Code snippet"
      width="w-[720px]"
      footer={
        <>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-300 hover:text-white border border-slate-600 rounded hover:bg-slate-700"
          >
            Close
          </button>
          <button
            onClick={copy}
            disabled={!snippet}
            className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded font-medium min-w-[110px]"
          >
            {copied ? '✓ Copied' : '⧉ Copy code'}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <div>
          <label className="text-xs text-slate-400 block mb-1">Language</label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="bg-slate-700 text-white px-3 py-2 rounded border border-slate-600 text-sm"
          >
            {LANGUAGES.map((lang) => (
              <option key={lang.id} value={lang.id}>
                {lang.label}
              </option>
            ))}
          </select>
        </div>

        <pre className="bg-slate-900 border border-slate-700 rounded p-4 text-xs text-slate-200 font-mono overflow-auto max-h-[420px] whitespace-pre">
          {snippet}
        </pre>

        <p className="text-xs text-slate-500">
          Snippet reflects what's currently in your request — change the URL, headers, or body and reopen to refresh.
        </p>
      </div>
    </Modal>
  )
}

export default CodeSnippetModal