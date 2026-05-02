import { useState } from 'react'
import KeyValueEditor from './KeyValueEditor'
import AuthEditor from './AuthEditor'

function RequestPanel({
  headers,
  setHeaders,
  params,
  setParams,
  body,
  setBody,
  methodSupportsBody,
  auth,
  setAuth,
}) {
  const [activeTab, setActiveTab] = useState('params')

  const tabs = [
    { id: 'params', label: 'Params' },
    { id: 'auth', label: 'Auth' },
    { id: 'headers', label: 'Headers' },
    { id: 'body', label: 'Body' },
  ]

  // Visual badge if auth is configured (other than 'none')
  const authActive = auth && auth.type !== 'none'

  const tabClass = (id) =>
    `px-4 py-2 text-sm border-b-2 ${
      activeTab === id
        ? 'text-white border-blue-500'
        : 'text-slate-400 hover:text-white border-transparent'
    }`

  return (
    <div className="bg-slate-900 border-b border-slate-700">
      <div className="flex border-b border-slate-700">
        {tabs.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={tabClass(tab.id)}>
            {tab.label}
            {tab.id === 'auth' && authActive && (
              <span className="ml-1.5 inline-block w-1.5 h-1.5 bg-green-400 rounded-full align-middle" />
            )}
          </button>
        ))}
      </div>

      <div className="p-4 min-h-[200px]">
        {activeTab === 'params' && (
          <KeyValueEditor items={params} setItems={setParams} keyPlaceholder="Param name" />
        )}

        {activeTab === 'auth' && <AuthEditor auth={auth} setAuth={setAuth} />}

        {activeTab === 'headers' && (
          <KeyValueEditor items={headers} setItems={setHeaders} keyPlaceholder="Header name" />
        )}

        {activeTab === 'body' && (
          <div>
            {!methodSupportsBody && (
              <div className="text-slate-400 text-sm mb-2">
                Body is typically used with POST, PUT, PATCH, or DELETE.
              </div>
            )}
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder='{ "key": "value" }'
              className="w-full h-48 bg-slate-700 text-white px-3 py-2 rounded border border-slate-600 placeholder-slate-400 font-mono text-sm resize-none"
            />
            <div className="text-slate-500 text-xs mt-2">
              Tip: add a <code className="bg-slate-700 px-1 rounded">Content-Type: application/json</code> header for JSON bodies.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default RequestPanel