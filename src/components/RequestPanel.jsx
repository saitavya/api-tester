import { useState } from 'react'
import KeyValueEditor from './KeyValueEditor'
import AuthEditor from './AuthEditor'
import CodeEditor from './CodeEditor'

const PRE_REQUEST_PLACEHOLDER = `// Runs before the request is sent.
// Use the pm.* API to set environment variables, etc.
//
// Example:
//   pm.environment.set('timestamp', Date.now());
//   const token = pm.environment.get('refreshToken');
`

const TEST_SCRIPT_PLACEHOLDER = `// Runs after the response arrives.
// Use pm.test() to define assertions.
//
// Example:
//   pm.test('status is 200', () => {
//     pm.expect(pm.response.status).toBe(200);
//   });
//
//   const json = pm.response.json();
//   pm.environment.set('userId', json.id);
`

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
  preRequestScript,
  setPreRequestScript,
  testScript,
  setTestScript,
}) {
  const [activeTab, setActiveTab] = useState('params')

  const tabs = [
    { id: 'params', label: 'Params' },
    { id: 'auth', label: 'Auth' },
    { id: 'headers', label: 'Headers' },
    { id: 'body', label: 'Body' },
    { id: 'preRequest', label: 'Pre-request' },
    { id: 'tests', label: 'Tests' },
  ]

  const authActive = auth && auth.type !== 'none'
  const preRequestActive = !!(preRequestScript && preRequestScript.trim())
  const testActive = !!(testScript && testScript.trim())

  const tabClass = (id) =>
    `px-4 py-2 text-sm border-b-2 ${
      activeTab === id
        ? 'text-white border-blue-500'
        : 'text-slate-400 hover:text-white border-transparent'
    }`

  const dot = (
    <span className="ml-1.5 inline-block w-1.5 h-1.5 bg-green-400 rounded-full align-middle" />
  )

  return (
    <div className="bg-slate-900 border-b border-slate-700">
      <div className="flex border-b border-slate-700">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={tabClass(tab.id)}
          >
            {tab.label}
            {tab.id === 'auth' && authActive && dot}
            {tab.id === 'preRequest' && preRequestActive && dot}
            {tab.id === 'tests' && testActive && dot}
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
              Tip: add a{' '}
              <code className="bg-slate-700 px-1 rounded">Content-Type: application/json</code>{' '}
              header for JSON bodies.
            </div>
          </div>
        )}

        {activeTab === 'preRequest' && (
          <div>
            <p className="text-xs text-slate-400 mb-2">
              JavaScript that runs <strong className="text-slate-300">before</strong> the
              request is sent. Useful for generating timestamps, refreshing tokens, or
              computing dynamic values.
            </p>
            <CodeEditor
              value={preRequestScript || ''}
              onChange={setPreRequestScript}
              language="javascript"
              height="220px"
              placeholder={PRE_REQUEST_PLACEHOLDER}
            />
          </div>
        )}

        {activeTab === 'tests' && (
          <div>
            <p className="text-xs text-slate-400 mb-2">
              JavaScript that runs <strong className="text-slate-300">after</strong> the
              response arrives. Use <code className="bg-slate-700 px-1 rounded">pm.test()</code>{' '}
              to define assertions.
            </p>
            <CodeEditor
              value={testScript || ''}
              onChange={setTestScript}
              language="javascript"
              height="220px"
              placeholder={TEST_SCRIPT_PLACEHOLDER}
            />
          </div>
        )}
      </div>
    </div>
  )
}

export default RequestPanel