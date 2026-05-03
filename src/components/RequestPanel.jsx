import { useState } from 'react'
import KeyValueEditor from './KeyValueEditor'
import AuthEditor from './AuthEditor'
import BodyEditor from './BodyEditor'

function RequestPanel({
  headers,
  setHeaders,
  params,
  setParams,
  body,
  setBody,
  bodyType,
  setBodyType,
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

  const authActive = auth && auth.type !== 'none'
  const bodyActive = !!(body && body.trim())

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
            {tab.id === 'body' && bodyActive && dot}
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
          <BodyEditor
            body={body}
            setBody={setBody}
            bodyType={bodyType}
            setBodyType={setBodyType}
            methodSupportsBody={methodSupportsBody}
          />
        )}
      </div>
    </div>
  )
}

export default RequestPanel