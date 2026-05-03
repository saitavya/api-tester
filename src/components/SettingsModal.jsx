import { useState, useEffect } from 'react'
import Modal from './Modal'
import { useSettings } from '../hooks/useSettings'

function SettingsModal({ isOpen, onClose }) {
  const { settings, update } = useSettings()
  const [proxyUrl, setProxyUrl] = useState('')
  const [proxyEnabled, setProxyEnabled] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState(null)

  useEffect(() => {
    if (isOpen) {
      setProxyUrl(settings.proxyUrl || '')
      setProxyEnabled(!!settings.proxyEnabled)
      setTestResult(null)
    }
  }, [isOpen, settings.proxyUrl, settings.proxyEnabled])

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

  return (
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
        <div>
          <h4 className="text-sm font-semibold text-white mb-1">CORS proxy</h4>
          <p className="text-xs text-slate-400">
            Browsers block requests to most APIs due to CORS. A proxy forwards your requests
            through a server, bypassing the restriction. You can deploy your own
            free proxy on Cloudflare Workers in a few minutes.
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
          <strong className="text-slate-400">Privacy note:</strong> When the proxy is enabled,
          your requests (including auth headers and body) pass through the proxy server.
          For sensitive APIs, deploy your own proxy.
        </div>
      </div>
    </Modal>
  )
}

export default SettingsModal