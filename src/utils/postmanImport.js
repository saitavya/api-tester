// Convert a Postman v2.1 collection JSON into our internal data model.
// Returns: { collectionName, requests: [...], warnings: [...] }
//
// Each request: { name, method, url, headers, params, body, auth, folderPath }

function buildUrl(urlField) {
  // Postman URLs come as either a string or an object
  if (!urlField) return ''
  if (typeof urlField === 'string') return urlField
  if (urlField.raw) return urlField.raw

  // Reconstruct from parts as a fallback
  const protocol = urlField.protocol || 'https'
  const host = Array.isArray(urlField.host) ? urlField.host.join('.') : urlField.host || ''
  const path = Array.isArray(urlField.path) ? urlField.path.join('/') : urlField.path || ''
  return `${protocol}://${host}/${path}`
}

function extractParams(urlField) {
  if (!urlField || typeof urlField === 'string') return []
  if (!Array.isArray(urlField.query)) return []
  return urlField.query
    .filter((q) => q && q.key)
    .map((q) => ({
      key: q.key,
      value: q.value || '',
      enabled: !q.disabled,
    }))
}

function extractHeaders(headerArray) {
  if (!Array.isArray(headerArray)) return []
  return headerArray
    .filter((h) => h && h.key)
    .map((h) => ({
      key: h.key,
      value: h.value || '',
      enabled: !h.disabled,
    }))
}

function extractBody(bodyField, warnings) {
  if (!bodyField) return ''
  const mode = bodyField.mode

  if (mode === 'raw') {
    return bodyField.raw || ''
  }

  if (mode === 'urlencoded' || mode === 'formdata') {
    warnings.push(`Body type "${mode}" is not yet supported and was skipped.`)
    return ''
  }

  if (mode === 'graphql') {
    const gql = bodyField.graphql || {}
    return JSON.stringify(
      { query: gql.query || '', variables: tryParseJson(gql.variables) },
      null,
      2
    )
  }

  if (mode === 'file') {
    warnings.push('File upload bodies are not supported and were skipped.')
    return ''
  }

  return ''
}

function tryParseJson(str) {
  if (!str) return {}
  try {
    return JSON.parse(str)
  } catch {
    return {}
  }
}

function extractAuth(authField, warnings) {
  if (!authField || !authField.type) return { type: 'none' }

  const type = authField.type
  const data = authField[type]

  // Postman stores auth params as either an object OR an array of {key,value}
  const get = (key) => {
    if (!data) return ''
    if (Array.isArray(data)) {
      const entry = data.find((d) => d.key === key)
      return entry ? entry.value : ''
    }
    return data[key] || ''
  }

  if (type === 'bearer') {
    return { type: 'bearer', token: get('token') }
  }

  if (type === 'basic') {
    return { type: 'basic', username: get('username'), password: get('password') }
  }

  if (type === 'apikey') {
    return {
      type: 'apikey',
      key: get('key'),
      value: get('value'),
      addTo: get('in') === 'query' ? 'query' : 'header',
    }
  }

  if (type === 'noauth') {
    return { type: 'none' }
  }

  warnings.push(`Auth type "${type}" is not supported and was set to None.`)
  return { type: 'none' }
}

// Walk the recursive item tree, flattening folders into a path string.
function walkItems(items, folderPath, out, warnings) {
  if (!Array.isArray(items)) return

  for (const item of items) {
    if (!item) continue

    // Folder: has nested items, no `request`
    if (Array.isArray(item.item) && !item.request) {
      const newPath = folderPath ? `${folderPath} / ${item.name}` : item.name
      walkItems(item.item, newPath, out, warnings)
      continue
    }

    // Request
    if (item.request) {
      const req = item.request
      const method = (req.method || 'GET').toUpperCase()
      const url = buildUrl(req.url)
      const params = extractParams(req.url)
      const headers = extractHeaders(req.header)
      const body = extractBody(req.body, warnings)
      const auth = extractAuth(req.auth, warnings)

      out.push({
        name: item.name || `${method} ${url}`,
        folderPath,
        method,
        url,
        headers,
        params,
        body,
        auth,
      })
    }
  }
}

export function parsePostmanCollection(rawJsonText) {
  let parsed
  try {
    parsed = JSON.parse(rawJsonText)
  } catch (e) {
    throw new Error(`Invalid JSON: ${e.message}`)
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('File does not contain a valid Postman collection')
  }

  // Check for v2 / v2.1 format markers
  const schema = parsed.info?.schema || ''
  const isPostmanCollection =
    parsed.info && Array.isArray(parsed.item) && schema.includes('getpostman.com')

  if (!isPostmanCollection) {
    throw new Error('This does not look like a Postman collection (v2 or v2.1)')
  }

  const collectionName = parsed.info?.name?.trim() || 'Imported Collection'
  const warnings = []
  const requests = []

  walkItems(parsed.item, '', requests, warnings)

  if (requests.length === 0) {
    throw new Error('No requests found in this collection')
  }

  // Deduplicate warnings — the same one might fire many times
  const uniqueWarnings = [...new Set(warnings)]

  return {
    collectionName,
    requests,
    warnings: uniqueWarnings,
  }
}