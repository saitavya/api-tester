function AuthEditor({ auth, setAuth }) {
  const updateAuth = (changes) => setAuth({ ...auth, ...changes })

  const setType = (type) => {
    if (type === 'none') setAuth({ type: 'none' })
    else if (type === 'bearer') setAuth({ type: 'bearer', token: '' })
    else if (type === 'basic') setAuth({ type: 'basic', username: '', password: '' })
    else if (type === 'apikey')
      setAuth({ type: 'apikey', key: '', value: '', addTo: 'header' })
  }

  const inputClass =
    'w-full bg-slate-700 text-white px-3 py-2 rounded border border-slate-600 placeholder-slate-400 text-sm'

  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs text-slate-400 block mb-1">Type</label>
        <select
          value={auth.type}
          onChange={(e) => setType(e.target.value)}
          className="bg-slate-700 text-white px-3 py-2 rounded border border-slate-600 text-sm"
        >
          <option value="none">No Auth</option>
          <option value="bearer">Bearer Token</option>
          <option value="basic">Basic Auth</option>
          <option value="apikey">API Key</option>
        </select>
      </div>

      {auth.type === 'none' && (
        <p className="text-slate-500 text-sm">
          This request will not use any authentication.
        </p>
      )}

      {auth.type === 'bearer' && (
        <div>
          <label className="text-xs text-slate-400 block mb-1">Token</label>
          <input
            type="text"
            value={auth.token || ''}
            onChange={(e) => updateAuth({ token: e.target.value })}
            placeholder="Paste your token (supports {{variables}})"
            className={inputClass}
          />
          <p className="text-xs text-slate-500 mt-1">
            Sent as: <code className="bg-slate-800 px-1 rounded">Authorization: Bearer &lt;token&gt;</code>
          </p>
        </div>
      )}

      {auth.type === 'basic' && (
        <div className="space-y-3">
          <div>
            <label className="text-xs text-slate-400 block mb-1">Username</label>
            <input
              type="text"
              value={auth.username || ''}
              onChange={(e) => updateAuth({ username: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">Password</label>
            <input
              type="password"
              value={auth.password || ''}
              onChange={(e) => updateAuth({ password: e.target.value })}
              className={inputClass}
            />
          </div>
          <p className="text-xs text-slate-500">
            Sent as: <code className="bg-slate-800 px-1 rounded">Authorization: Basic &lt;base64(user:pass)&gt;</code>
          </p>
        </div>
      )}

      {auth.type === 'apikey' && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Key</label>
              <input
                type="text"
                value={auth.key || ''}
                onChange={(e) => updateAuth({ key: e.target.value })}
                placeholder="e.g. X-API-Key"
                className={inputClass}
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Value</label>
              <input
                type="text"
                value={auth.value || ''}
                onChange={(e) => updateAuth({ value: e.target.value })}
                placeholder="Your API key"
                className={inputClass}
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">Add to</label>
            <select
              value={auth.addTo || 'header'}
              onChange={(e) => updateAuth({ addTo: e.target.value })}
              className="bg-slate-700 text-white px-3 py-2 rounded border border-slate-600 text-sm"
            >
              <option value="header">Header</option>
              <option value="query">Query Params</option>
            </select>
          </div>
        </div>
      )}
    </div>
  )
}

export default AuthEditor