// Convert our internal data model back into Postman v2.1 collection JSON.
// Input: { name, requests }
// Output: a Postman collection object that can be JSON.stringify'd and re-imported

const POSTMAN_SCHEMA = 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'

// --- URL helpers ---

// Postman wants URL split into protocol/host/path/query.
// We do best-effort: rely on the URL constructor for parseable URLs,
// fall back to leaving raw for unparseable / templated ones like {{baseUrl}}/users.
function buildUrlObject(rawUrl, params) {
  const enabledParams = (params || []).filter((p) => p.key)
  const queryArray = enabledParams.map((p) => ({
    key: p.key,
    value: p.value || '',
    ...(p.enabled === false ? { disabled: true } : {}),
  }))

  let parsed
  try {
    parsed = new URL(rawUrl)
  } catch {
    // URL contains {{vars}} or is malformed — return minimal object
    return {
      raw: rawUrl,
      ...(queryArray.length > 0 ? { query: queryArray } : {}),
    }
  }

  return {
    raw: rawUrl,
    protocol: parsed.protocol.replace(':', ''),
    host: parsed.hostname.split('.'),
    ...(parsed.port ? { port: parsed.port } : {}),
    path: parsed.pathname.split('/').filter(Boolean),
    ...(queryArray.length > 0 ? { query: queryArray } : {}),
  }
}

// --- Auth ---

function buildAuth(auth) {
  if (!auth || !auth.type || auth.type === 'none') return undefined

  if (auth.type === 'bearer') {
    return {
      type: 'bearer',
      bearer: [{ key: 'token', value: auth.token || '', type: 'string' }],
    }
  }

  if (auth.type === 'basic') {
    return {
      type: 'basic',
      basic: [
        { key: 'username', value: auth.username || '', type: 'string' },
        { key: 'password', value: auth.password || '', type: 'string' },
      ],
    }
  }

  if (auth.type === 'apikey') {
    return {
      type: 'apikey',
      apikey: [
        { key: 'key', value: auth.key || '', type: 'string' },
        { key: 'value', value: auth.value || '', type: 'string' },
        { key: 'in', value: auth.addTo === 'query' ? 'query' : 'header', type: 'string' },
      ],
    }
  }

  return undefined
}

// --- Body ---

function buildBody(body) {
  if (!body || !body.trim()) return undefined
  return {
    mode: 'raw',
    raw: body,
    options: {
      raw: { language: 'json' },
    },
  }
}

// --- Headers ---

function buildHeaders(headers) {
  if (!Array.isArray(headers)) return []
  return headers
    .filter((h) => h.key)
    .map((h) => ({
      key: h.key,
      value: h.value || '',
      type: 'text',
      ...(h.enabled === false ? { disabled: true } : {}),
    }))
}

// --- Convert one of our requests into a Postman item ---

function toPostmanItem(req) {
  const item = {
    name: req.name || `${req.method} ${req.url}`,
    request: {
      method: (req.method || 'GET').toUpperCase(),
      header: buildHeaders(req.headers),
      url: buildUrlObject(req.url || '', req.params),
    },
    response: [],
  }

  const auth = buildAuth(req.auth)
  if (auth) item.request.auth = auth

  const body = buildBody(req.body)
  if (body) item.request.body = body

  return item
}

// --- Folder reconstruction ---

// Parse our naming convention "[A / B] Request name" into:
//   { folderPath: ['A', 'B'], cleanName: 'Request name' }
// or { folderPath: [], cleanName: 'Request name' } if no folder prefix.
function parseFolderPrefix(name) {
  if (!name) return { folderPath: [], cleanName: '' }
  const match = name.match(/^\[([^\]]+)\]\s*(.*)$/)
  if (!match) return { folderPath: [], cleanName: name }
  const folderPath = match[1].split('/').map((s) => s.trim()).filter(Boolean)
  return { folderPath, cleanName: match[2].trim() || name }
}

// Build a tree of folders from a flat list of requests.
// Each folder node: { name, item: [...children] }
// Each request leaf: full Postman item
function buildItemTree(requests) {
  const root = { item: [] }

  for (const req of requests) {
    const { folderPath, cleanName } = parseFolderPrefix(req.name)
    const postmanItem = toPostmanItem({ ...req, name: cleanName })

    // Walk/create folder nodes
    let cursor = root
    for (const folderName of folderPath) {
      let folder = cursor.item.find(
        (n) => n.name === folderName && Array.isArray(n.item) && !n.request
      )
      if (!folder) {
        folder = { name: folderName, item: [] }
        cursor.item.push(folder)
      }
      cursor = folder
    }
    cursor.item.push(postmanItem)
  }

  return root.item
}

// --- Public API ---

export function buildPostmanExport(collectionName, requests) {
  return {
    info: {
      name: collectionName || 'Exported Collection',
      _postman_id: crypto.randomUUID(),
      schema: POSTMAN_SCHEMA,
      _exporter_id: 'api-tester',
    },
    item: buildItemTree(requests || []),
  }
}

// Trigger a browser download of the JSON file
export function downloadCollection(collectionName, requests) {
  const data = buildPostmanExport(collectionName, requests)
  const json = JSON.stringify(data, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)

  const safeName = (collectionName || 'collection')
    .replace(/[^a-z0-9-_ ]/gi, '')
    .trim()
    .replace(/\s+/g, '-')
    .toLowerCase()

  const a = document.createElement('a')
  a.href = url
  a.download = `${safeName}.postman_collection.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}