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

function App() {
  const [method, setMethod] = useState('GET')
  const [url, setUrl] = useState('')
  const [response, setResponse] = useState(null)
  const [loading, setLoading] = useState(false)

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
    if (enabledParams.length === 0) return substitutedUrl
    try {
      const u = new URL(substitutedUrl)
      enabledParams.forEach((p) =>
        u.searchParams.append(
          substituteVariables(p.key, envMap),
          substituteVariables(p.value, envMap)
        )
      )
      return u.toString()
    } catch {
      const qs = enabledParams
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
            loading={loading}
            previewUrl={buildFinalUrl()}
          />
          <RequestPanel
            headers={headers}
            setHeaders={setHeaders}
            params={params}
            setParams={setParams}
            body={body}
            setBody={setBody}
            methodSupportsBody={methodSupportsBody}
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
    </div>
  )
}

export default App