import { useState, useEffect, useRef } from 'react'
import Modal from './Modal'
import { useSettings } from '../hooks/useSettings'
import { downloadBackup, parseBackup, applyBackup } from '../utils/BackupRestore'
import RestoreConfirmModal from './RestoreConfirmModal'

function SettingsModal({ isOpen, onClose }) {
  const { settings, update } = useSettings()

  // Proxy form state
  const [proxyUrl, setProxyUrl] = useState('')
  const [proxyEnabled, setProxyEnabled] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState(null)

  // Backup / restore state
  const fileInputRef = useRef(null)
  const [parsedBackup, setParsedBackup] = useState(null)
  const [restoreSummary, setRestoreSummary] = useState(null)
  const [restoreConfirmOpen, setRestoreConfirmOpen] = useState(false)
  const [restoreError, setRestoreError] = useState('')
  const [restoreSuccess, setRestoreSuccess] = useState(null)

  // Load current settings into form when modal opens
  useEffect(() => {
    if (isOpen) {
      setProxyUrl(settings.proxyUrl || '')
      setProxyEnabled(!!settings.proxyEnabled)
      setTestResult(null)
      setRestoreError('')
      setRestoreSuccess(null)
    }
  }, [isOpen, settings.proxyUrl, settings.proxyEnabled])

  // --- Proxy actions ---

  const save = async () => {
    await update('proxyUrl', proxyUrl.trim())
    await update('proxyEnabled', !!proxyEnabled)
    onClose()
  }

  const testProxy = async () => {
    if (!proxyUrl.trim()) return
    setTesting(true)
    setTestResult(null)
    try {
      const cleanUrl = proxyUrl.trim().replace(/\/$/, '')
      const res = await fetch(`${cleanUrl}/health`)
      const data = await res.json()
      if (data.ok) {
        setTestResult({ ok: true, message: 'Proxy is reachable ✓' })
      } else {
        setTestResult({ ok: false, message: 'Unexpected response from proxy' })
      }
    } catch (e) {
      setTestResult({ ok: false, message: `Failed: ${e.message}` })
    } finally {
      setTesting(false)
    }
  }

  // --- Backup actions ---

  const handleBackup = async () => {
    try {
      await downloadBackup()
    } catch (e) {
      setRestoreError(`Backup failed: ${e.message}`)
    }
  }

  const handleFileChosen = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setRestoreError('')
    setRestoreSuccess(null)

    try {
      const text = await file.text()
      const parsed = parseBackup(text)
      setParsedBackup(parsed)
      setRestoreSummary({
        exportedAt: parsed.exportedAt,
        counts: {
          collections: (parsed.data.collections || []).length,
          requests: (parsed.data.requests || []).length,
          environments: (parsed.data.environments || []).length,
          history: (parsed.data.history || []).length,
          settings: (parsed.data.settings || []).length,
        },
      })
      setRestoreConfirmOpen(true)
    } catch (err) {
      setRestoreError(err.message)
    }

    // Reset input so picking the same file twice still triggers onChange
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleRestore = async (strategy) => {
    if (!parsedBackup) return
    try {
      const stats = await applyBackup(parsedBackup, strategy)
      setRestoreConfirmOpen(false)
      setParsedBackup(null)
      setRestoreSummary(null)
      setRestoreSuccess(stats)
    } catch (err) {
      setRestoreError(`Restore failed: ${err.message}`)
      setRestoreConfirmOpen(false)
    }
  }

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Settings"
        width="w-[560px]"
        footer={
          <>
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-300 hover:text-white border border-slate-600 rounded hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              onClick={save}
              className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded font-medium"
            >
              Save
            </button>
          </>
        }
      >
        <div className="space-y-5">
          {/* --- CORS proxy section --- */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-1">CORS proxy</h4>
            <p className="text-xs text-slate-400">
              Browsers block requests to most APIs due to CORS. A proxy forwards your
              requests through a server, bypassing the restriction. You can deploy your
              own free proxy on Cloudflare Workers in a few minutes.
            </p>
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1">Proxy URL</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={proxyUrl}
                onChange={(e) => setProxyUrl(e.target.value)}
                placeholder="https://api-tester-proxy.your-name.workers.dev"
                className="flex-1 bg-slate-700 text-white px-3 py-2 rounded border border-slate-600 placeholder-slate-400 text-sm"
              />
              <button
                onClick={testProxy}
                disabled={testing || !proxyUrl.trim()}
                className="px-3 py-2 text-sm text-slate-300 hover:text-white border border-slate-600 rounded hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {testing ? 'Testing…' : 'Test'}
              </button>
            </div>
            {testResult && (
              <p
                className={`text-xs mt-2 ${
                  testResult.ok ? 'text-green-400' : 'text-red-400'
                }`}
              >
                {testResult.message}
              </p>
            )}
          </div>

          <div className="flex items-center gap-3">
            <input
              id="proxy-enabled"
              type="checkbox"
              checked={proxyEnabled}
              onChange={(e) => setProxyEnabled(e.target.checked)}
              className="w-4 h-4"
            />
            <label htmlFor="proxy-enabled" className="text-sm text-slate-200">
              Send all requests through the proxy by default
            </label>
          </div>

          <div className="text-xs text-slate-500 bg-slate-900/50 border border-slate-700 rounded p-3">
            <strong className="text-slate-400">Privacy note:</strong> When the proxy is
            enabled, your requests (including auth headers and body) pass through the
            proxy server. For sensitive APIs, deploy your own proxy.
          </div>

          {/* --- Backup & restore section --- */}
          <div className="border-t border-slate-700 pt-5">
            <h4 className="text-sm font-semibold text-white mb-1">Backup & restore</h4>
            <p className="text-xs text-slate-400 mb-3">
              Export all your data as a JSON file, or restore from one. Useful for moving
              to a new device, sharing setups with teammates, or keeping a safety backup.
            </p>

            <div className="flex gap-2">
              <button
                onClick={handleBackup}
                className="flex-1 px-3 py-2 text-sm text-slate-200 border border-slate-600 rounded hover:bg-slate-700"
              >
                ↓ Download backup
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 px-3 py-2 text-sm text-slate-200 border border-slate-600 rounded hover:bg-slate-700"
              >
                ↑ Restore from file
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleFileChosen}
                className="hidden"
              />
            </div>

            {restoreError && (
              <div className="mt-3 bg-red-950 border border-red-900 text-red-300 px-3 py-2 rounded text-xs">
                {restoreError}
              </div>
            )}

            {restoreSuccess && (
  <div className="mt-3 bg-green-950 border border-green-900 text-green-300 px-3 py-2 rounded text-xs">
    {typeof restoreSuccess.collections === 'object' ? (
      <>
        ✓ Restored:&nbsp;
        {restoreSuccess.collections.added} new + {restoreSuccess.collections.updated} updated collections,&nbsp;
        {restoreSuccess.requests.added} new + {restoreSuccess.requests.updated} updated requests,&nbsp;
        {restoreSuccess.environments.added} new + {restoreSuccess.environments.updated} updated environments,&nbsp;
        {restoreSuccess.history.added} new history entries (
        {restoreSuccess.history.skipped} duplicates skipped),&nbsp;
        {restoreSuccess.settings.applied} settings.
      </>
    ) : (
      <>
        ✓ Restored: {restoreSuccess.collections} collections,{' '}
        {restoreSuccess.requests} requests, {restoreSuccess.environments}{' '}
        environments, {restoreSuccess.history} history entries,{' '}
        {restoreSuccess.settings} settings.
      </>
    )}
  </div>
)}
          </div>
        </div>
      </Modal>

      {/* Restore confirmation lives outside the main Settings modal so it floats on top */}
      <RestoreConfirmModal
        isOpen={restoreConfirmOpen}
        onClose={() => setRestoreConfirmOpen(false)}
        summary={restoreSummary}
        onConfirm={handleRestore}
      />
    </>
  )
}

export default SettingsModal