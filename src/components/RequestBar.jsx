function RequestBar({
  method,
  setMethod,
  url,
  setUrl,
  onSend,
  onSave,
  onShowCode,
  loading,
  previewUrl,
  proxyAvailable,
  useProxy,
  setUseProxy,
}) {

  const showPreview = url && previewUrl && url !== previewUrl

  return (
    <div className="bg-slate-800 border-b border-slate-700">
      <div className="flex gap-2 p-4 pb-2">
        <select
          value={method}
          onChange={(e) => setMethod(e.target.value)}
          className="bg-slate-700 text-white px-3 py-2 rounded border border-slate-600 font-medium"
        >
          <option>GET</option>
          <option>POST</option>
          <option>PUT</option>
          <option>PATCH</option>
          <option>DELETE</option>
        </select>

        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter request URL — use {{variable}} for env vars"
          className="flex-1 bg-slate-700 text-white px-3 py-2 rounded border border-slate-600 placeholder-slate-400"
        />

        <button
          onClick={onSend}
          disabled={loading || !url}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white px-6 py-2 rounded font-medium"
        >
          {loading ? 'Sending...' : 'Send'}
        </button>

        <button
          onClick={onSave}
          disabled={!url}
          className="bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded font-medium border border-slate-600"
        >
          Save
        </button>

        <button
  onClick={onShowCode}
  disabled={!url}
  className="bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded font-medium border border-slate-600"
  title="Show code snippet"
>
  &lt;/&gt;
</button>
      </div>

      {showPreview && (
        <div className="px-4 pb-3 text-xs text-slate-400 truncate" title={previewUrl}>
          → <span className="text-slate-300 font-mono">{previewUrl}</span>
        </div>
      )}
    </div>
  )
}

export default RequestBar