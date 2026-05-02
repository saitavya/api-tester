function ResponsePanel({ response, loading }) {
  const getStatusColor = (status) => {
    if (status >= 200 && status < 300) return 'text-green-400'
    if (status >= 300 && status < 400) return 'text-yellow-400'
    if (status >= 400) return 'text-red-400'
    return 'text-slate-500'
  }

  return (
    <div className="bg-slate-900 flex-1 p-4">
      <div className="flex items-center gap-4 mb-3 text-sm">
        <span className="text-slate-400">Status:</span>
        <span className={response ? getStatusColor(response.status) : 'text-slate-500'}>
          {response ? `${response.status} ${response.statusText}` : '—'}
        </span>
        <span className="text-slate-400">Time:</span>
        <span className="text-slate-300">
          {response ? `${response.time} ms` : '—'}
        </span>
      </div>

      <div className="bg-slate-800 rounded p-4 min-h-[200px] font-mono text-sm overflow-auto">
        {loading && <span className="text-slate-400">Loading...</span>}
        {!loading && !response && (
          <span className="text-slate-400">Send a request to see the response here</span>
        )}
        {!loading && response && (
          <pre className="text-slate-200 whitespace-pre-wrap break-words">
            {response.body}
          </pre>
        )}
      </div>
    </div>
  )
}

export default ResponsePanel