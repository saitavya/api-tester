import { useState, useEffect } from 'react'

function ResponsePanel({ response, loading }) {
  const [activeTab, setActiveTab] = useState('body')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (response) setActiveTab('body')
  }, [response])

  const getStatusColor = (status) => {
    if (status >= 200 && status < 300) return 'text-green-400'
    if (status >= 300 && status < 400) return 'text-yellow-400'
    if (status >= 400) return 'text-red-400'
    return 'text-slate-500'
  }

  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  const responseSize = response?.body ? new Blob([response.body]).size : 0
  const headerCount = response?.headers ? Object.keys(response.headers).length : 0

  const copyBody = async () => {
    if (!response?.body) return
    try {
      await navigator.clipboard.writeText(response.body)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // ignore
    }
  }

  const tabClass = (id) =>
    `px-4 py-2 text-sm border-b-2 ${
      activeTab === id
        ? 'text-white border-blue-500'
        : 'text-slate-400 hover:text-white border-transparent'
    }`

  return (
    <div className="bg-slate-900 flex-1 flex flex-col min-h-[300px]">
      {/* Status bar */}
      <div className="px-4 py-2 border-b border-slate-700 flex items-center gap-4 text-sm flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-slate-400">Status:</span>
          <span className={response ? getStatusColor(response.status) : 'text-slate-500'}>
            {response ? `${response.status} ${response.statusText}` : '—'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-400">Time:</span>
          <span className="text-slate-300">{response ? `${response.time} ms` : '—'}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-400">Size:</span>
          <span className="text-slate-300">{response ? formatSize(responseSize) : '—'}</span>
        </div>
      </div>

      {/* Tabs (only shown when there is a response) */}
      {response && (
        <div className="flex border-b border-slate-700 items-center">
          <button onClick={() => setActiveTab('body')} className={tabClass('body')}>
            Body
          </button>
          <button onClick={() => setActiveTab('headers')} className={tabClass('headers')}>
            Headers
            {headerCount > 0 && (
              <span className="ml-2 text-xs text-slate-500">({headerCount})</span>
            )}
          </button>

          {activeTab === 'body' && response.body && (
            <button
              onClick={copyBody}
              className="ml-auto mr-3 text-xs text-slate-400 hover:text-white px-2 py-1"
              title="Copy body to clipboard"
            >
              {copied ? '✓ Copied' : '⧉ Copy'}
            </button>
          )}
        </div>
      )}

      {/* Single content area — only ONE of these renders at a time */}
      <div className="flex-1 p-4 overflow-auto">
        {loading ? (
          <span className="text-slate-400 text-sm">Loading...</span>
        ) : !response ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-slate-500 text-sm">
              <div className="mb-2 text-3xl opacity-30">⚡</div>
              Send a request to see the response here
            </div>
          </div>
        ) : activeTab === 'body' ? (
          <pre className="text-slate-200 whitespace-pre-wrap break-words font-mono text-sm">
            {response.body || <span className="text-slate-500 italic">(empty response)</span>}
          </pre>
        ) : (
          <div className="text-sm">
            {headerCount === 0 ? (
              <span className="text-slate-500 italic">No headers returned</span>
            ) : (
              <table className="w-full">
                <tbody>
                  {Object.entries(response.headers).map(([key, value]) => (
                    <tr key={key} className="border-b border-slate-800">
                      <td className="py-2 pr-4 text-slate-400 font-mono align-top whitespace-nowrap">
                        {key}
                      </td>
                      <td className="py-2 text-slate-200 font-mono break-all">{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default ResponsePanel