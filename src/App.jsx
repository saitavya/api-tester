import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './db/database'
import { substituteVariables, envArrayToMap } from './utils/variables'
import Header from './components/Header'
import Sidebar from './components/Sidebar'
import RequestBar from './components/RequestBar'
import RequestPanel from './components/RequestPanel'
import ResponsePanel from './components/ResponsePanel'
import EnvironmentManager from './components/EnvironmentManager'
import SaveRequestModal from './components/SaveRequestModal'
import ImportCurlModal from './components/ImportCurlModal'
import CodeSnippetModal from './components/CodeSnippetModal'

function App() {
  const [method, setMethod] = useState('GET')
  const [url, setUrl] = useState('')
  const [response, setResponse] = useState(null)
  const [loading, setLoading] = useState(false)
  const [codeModalOpen, setCodeModalOpen] = useState(false)

  const [auth, setAuth] = useState({ type: 'none' })

  const [headers, setHeaders] = useState([{ id: 1, key: '', value: '', enabled: true }])
  const [params, setParams] = useState([{ id: 1, key: '', value: '', enabled: true }])
  const [body, setBody] = useState('')

  const [envManagerOpen, setEnvManagerOpen] = useState(false)
  const [saveModalOpen, setSaveModalOpen] = useState(false)
  const [importCurlOpen, setImportCurlOpen] = useState(false)

  const activeEnv = useLiveQuery(() => db.environments.where('isActive').equals(1).first())
  const envMap = envArrayToMap(activeEnv?.variables)

  const methodSupportsBody = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)

  const buildFinalUrl = () => {
  const substitutedUrl = substituteVariables(url, envMap)
  const enabledParams = params.filter((p) => p.enabled && p.key)

  // Add api key as query param if configured that way
  const allParams = [...enabledParams]
  if (auth.type === 'apikey' && auth.addTo === 'query' && auth.key && auth.value) {
    allParams.push({ key: auth.key, value: auth.value, enabled: true })
  }

  if (allParams.length === 0) return substitutedUrl
  try {
    const u = new URL(substitutedUrl)
    allParams.forEach((p) =>
      u.searchParams.append(
        substituteVariables(p.key, envMap),
        substituteVariables(p.value, envMap)
      )
    )
    return u.toString()
  } catch {
    const qs = allParams
      .map(
        (p) =>
          `${encodeURIComponent(substituteVariables(p.key, envMap))}=${encodeURIComponent(
            substituteVariables(p.value, envMap)
          )}`
      )
      .join('&')
    return substitutedUrl + (substitutedUrl.includes('?') ? '&' : '?') + qs
  }
}

  const buildHeaders = () => {
  const result = {}
  headers
    .filter((h) => h.enabled && h.key)
    .forEach((h) => {
      result[substituteVariables(h.key, envMap)] = substituteVariables(h.value, envMap)
    })

  // Layer auth on top
  if (auth.type === 'bearer' && auth.token) {
    result['Authorization'] = `Bearer ${substituteVariables(auth.token, envMap)}`
  } else if (auth.type === 'basic' && (auth.username || auth.password)) {
    const u = substituteVariables(auth.username || '', envMap)
    const p = substituteVariables(auth.password || '', envMap)
    result['Authorization'] = `Basic ${btoa(`${u}:${p}`)}`
  } else if (auth.type === 'apikey' && auth.addTo === 'header' && auth.key && auth.value) {
    result[substituteVariables(auth.key, envMap)] = substituteVariables(auth.value, envMap)
  }

  return result
}

  const handleImportCurl = (parsed) => {
  setMethod(parsed.method)
  setUrl(parsed.url)
  setBody(parsed.body || '')

  setHeaders(
    parsed.headers && parsed.headers.length > 0
      ? parsed.headers.map((h, i) => ({ id: i + 1, key: h.key, value: h.value, enabled: true }))
      : [{ id: 1, key: '', value: '', enabled: true }]
  )

  setParams(
    parsed.params && parsed.params.length > 0
      ? parsed.params.map((p, i) => ({ id: i + 1, key: p.key, value: p.value, enabled: true }))
      : [{ id: 1, key: '', value: '', enabled: true }]
  )

  setResponse(null)
}

  const loadRequest = (item) => {
  setMethod(item.method)
  setUrl(item.url)
  setBody(item.body || '')
  setHeaders(
    item.headers && item.headers.length > 0
      ? item.headers.map((h, i) => ({ ...h, id: i + 1, enabled: true }))
      : [{ id: 1, key: '', value: '', enabled: true }]
  )
  setParams(
    item.params && item.params.length > 0
      ? item.params.map((p, i) => ({ ...p, id: i + 1, enabled: true }))
      : [{ id: 1, key: '', value: '', enabled: true }]
  )
  setAuth(item.auth || { type: 'none' })
  setResponse(null)
}

  const openSaveModal = () => {
    if (!url) return
    setSaveModalOpen(true)
  }

  const handleSaveRequest = async (collectionId, requestName) => {
  await db.requests.add({
    collectionId,
    name: requestName,
    method,
    url,
    headers: headers.filter((h) => h.enabled && h.key),
    params: params.filter((p) => p.enabled && p.key),
    body,
    auth,
    createdAt: Date.now(),
  })
}

  const sendRequest = async () => {
    if (!url) return
    setLoading(true)
    setResponse(null)
    const startTime = Date.now()

    try {
      const finalUrl = buildFinalUrl()
      const fetchOptions = { method, headers: buildHeaders() }
      if (methodSupportsBody && body.trim()) {
        fetchOptions.body = substituteVariables(body, envMap)
      }

      const res = await fetch(finalUrl, fetchOptions)
      const elapsed = Date.now() - startTime
      const text = await res.text()

      let formattedBody = text
      try {
        formattedBody = JSON.stringify(JSON.parse(text), null, 2)
      } catch {
        // not JSON
      }

      const responseHeaders = {}
      res.headers.forEach((value, key) => {
        responseHeaders[key] = value
      })

      setResponse({
        status: res.status,
        statusText: res.statusText,
        time: elapsed,
        body: formattedBody,
        headers: responseHeaders,
        ok: res.ok,
      })

      await db.history.add({
        timestamp: Date.now(),
        method,
        url,
        headers: headers.filter((h) => h.enabled && h.key),
        params: params.filter((p) => p.enabled && p.key),
        body,
        status: res.status,
      })

      await db.history.add({
  timestamp: Date.now(),
  method,
  url,
  headers: headers.filter((h) => h.enabled && h.key),
  params: params.filter((p) => p.enabled && p.key),
  body,
  auth,
  status: res.status,
})

    } catch (err) {
      setResponse({
        status: 0,
        statusText: 'Network Error',
        time: Date.now() - startTime,
        body: err.message,
        headers: {},
        ok: false,
      })
    } finally {
      setLoading(false)
    }
  }
  const currentRequest = {
  method,
  url,
  headers,
  params,
  body,
  auth,
}

  return (
    <div className="h-screen bg-slate-900 text-white flex flex-col overflow-hidden">
      <Header
  onOpenEnvManager={() => setEnvManagerOpen(true)}
  onImportCurl={() => setImportCurlOpen(true)}
/>

      <div className="flex flex-1 overflow-hidden">
        <Sidebar onLoadRequest={loadRequest} />

        <div className="flex-1 flex flex-col overflow-y-auto">
          <RequestBar
  method={method}
  setMethod={setMethod}
  url={url}
  setUrl={setUrl}
  onSend={sendRequest}
  onSave={openSaveModal}
  onShowCode={() => setCodeModalOpen(true)}
  loading={loading}
  previewUrl={buildFinalUrl()}
  proxyAvailable={proxyAvailable}
  useProxy={useProxy}
  setUseProxy={setUseProxy}
/>
          <RequestPanel
  headers={headers}
  setHeaders={setHeaders}
  params={params}
  setParams={setParams}
  body={body}
  setBody={setBody}
  methodSupportsBody={methodSupportsBody}
  auth={auth}
  setAuth={setAuth}
/>
          <ResponsePanel response={response} loading={loading} />
        </div>
      </div>

      {envManagerOpen && (
        <EnvironmentManager onClose={() => setEnvManagerOpen(false)} />
      )}

      <SaveRequestModal
        isOpen={saveModalOpen}
        onClose={() => setSaveModalOpen(false)}
        defaultName={`${method} ${url}`}
        onSave={handleSaveRequest}
      />

      <ImportCurlModal
  isOpen={importCurlOpen}
  onClose={() => setImportCurlOpen(false)}
  onImport={handleImportCurl}
/>
<CodeSnippetModal
  isOpen={codeModalOpen}
  onClose={() => setCodeModalOpen(false)}
  request={currentRequest}
/>
    </div>
  )
}

export default App