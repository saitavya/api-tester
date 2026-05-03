// Generate code snippets in various languages from a request shape.
// Input: { method, url, headers, params, body, auth }
// Output: a string of code for that language.

// --- Helpers ---

// Apply enabled headers + auth into a flat header object
function effectiveHeaders(req) {
  const result = {}
  ;(req.headers || [])
    .filter((h) => h.enabled !== false && h.key)
    .forEach((h) => {
      result[h.key] = h.value || ''
    })

  const auth = req.auth
  if (auth) {
    if (auth.type === 'bearer' && auth.token) {
      result['Authorization'] = `Bearer ${auth.token}`
    } else if (auth.type === 'basic' && (auth.username || auth.password)) {
      // We deliberately leave this as user:pass for code clarity rather than pre-encoding.
      // Each language has its own way of doing Basic Auth more idiomatically.
      result['_basicAuth'] = `${auth.username || ''}:${auth.password || ''}`
    } else if (auth.type === 'apikey' && auth.addTo === 'header' && auth.key) {
      result[auth.key] = auth.value || ''
    }
  }
  return result
}

// Build the URL with enabled query params + apikey-in-query auth
function effectiveUrl(req) {
  const enabledParams = (req.params || []).filter((p) => p.enabled !== false && p.key)
  const allParams = [...enabledParams]

  if (
    req.auth &&
    req.auth.type === 'apikey' &&
    req.auth.addTo === 'query' &&
    req.auth.key
  ) {
    allParams.push({ key: req.auth.key, value: req.auth.value || '' })
  }

  if (allParams.length === 0) return req.url || ''

  try {
    const u = new URL(req.url)
    allParams.forEach((p) => u.searchParams.append(p.key, p.value || ''))
    return u.toString()
  } catch {
    const qs = allParams
      .map(
        (p) =>
          `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value || '')}`
      )
      .join('&')
    const sep = (req.url || '').includes('?') ? '&' : '?'
    return `${req.url || ''}${sep}${qs}`
  }
}

const methodHasBody = (m) => ['POST', 'PUT', 'PATCH', 'DELETE'].includes(m)

// Escape a value for inclusion in single-quoted shell strings
function shellEscape(str) {
  if (str == null) return ''
  return String(str).replace(/'/g, `'\\''`)
}

// --- cURL ---

function toCurl(req) {
  const url = effectiveUrl(req)
  const headers = effectiveHeaders(req)
  const method = (req.method || 'GET').toUpperCase()
  const lines = [`curl -X ${method} '${shellEscape(url)}'`]

  // Basic auth gets a dedicated -u flag, not -H
  if (headers._basicAuth !== undefined) {
    lines.push(`  -u '${shellEscape(headers._basicAuth)}'`)
    delete headers._basicAuth
  }

  Object.entries(headers).forEach(([k, v]) => {
    lines.push(`  -H '${shellEscape(k)}: ${shellEscape(v)}'`)
  })

  if (methodHasBody(method) && req.body && req.body.trim()) {
    lines.push(`  -d '${shellEscape(req.body)}'`)
  }

  return lines.join(' \\\n')
}

// --- JavaScript fetch ---

function toFetch(req) {
  const url = effectiveUrl(req)
  const headers = effectiveHeaders(req)
  const method = (req.method || 'GET').toUpperCase()

  // Basic auth: encode and put as Authorization header
  if (headers._basicAuth !== undefined) {
    const encoded = `btoa('${headers._basicAuth.replace(/'/g, "\\'")}')`
    delete headers._basicAuth
    headers['Authorization'] = `__INLINE_BTOA__${encoded}__`
  }

  const options = { method }
  if (Object.keys(headers).length > 0) options.headers = headers
  if (methodHasBody(method) && req.body && req.body.trim()) {
    options.body = req.body
  }

  // Stringify with placeholder swap so we can inject btoa() unquoted
  let optsStr = JSON.stringify(options, null, 2)
  optsStr = optsStr.replace(/"__INLINE_BTOA__(.+?)__"/g, 'Basic ${$1}')
  // Wrap any Authorization basic in template literal
  optsStr = optsStr.replace(
    /"Authorization": "Basic \$\{(.+?)\}"/,
    '"Authorization": `Basic ${$1}`'
  )

  return `const response = await fetch('${url}', ${optsStr});
const data = await response.json();
console.log(data);`
}

// --- JavaScript axios ---

function toAxios(req) {
  const url = effectiveUrl(req)
  const headers = effectiveHeaders(req)
  const method = (req.method || 'GET').toLowerCase()

  const config = { method, url }

  if (headers._basicAuth !== undefined) {
    const [u, p] = headers._basicAuth.split(/:(.*)/)
    config.auth = { username: u || '', password: p || '' }
    delete headers._basicAuth
  }

  if (Object.keys(headers).length > 0) config.headers = headers
  if (methodHasBody(req.method) && req.body && req.body.trim()) {
    // Try to parse as JSON for a cleaner snippet
    try {
      config.data = JSON.parse(req.body)
    } catch {
      config.data = req.body
    }
  }

  return `import axios from 'axios';

const response = await axios(${JSON.stringify(config, null, 2)});
console.log(response.data);`
}

// --- Python requests ---

function toPythonRequests(req) {
  const url = effectiveUrl(req)
  const headers = effectiveHeaders(req)
  const method = (req.method || 'GET').toLowerCase()
  const lines = ['import requests', '']

  const args = [`'${url}'`]

  if (headers._basicAuth !== undefined) {
    const [u, p] = headers._basicAuth.split(/:(.*)/)
    args.push(`auth=('${u || ''}', '${p || ''}')`)
    delete headers._basicAuth
  }

  if (Object.keys(headers).length > 0) {
    const headerLines = Object.entries(headers).map(
      ([k, v]) => `    '${k}': '${v.replace(/'/g, "\\'")}'`
    )
    lines.push(`headers = {\n${headerLines.join(',\n')}\n}`)
    args.push('headers=headers')
  }

  if (methodHasBody(req.method) && req.body && req.body.trim()) {
    try {
      JSON.parse(req.body)
      lines.push(`payload = ${req.body}`)
      args.push('json=payload')
    } catch {
      lines.push(`payload = """${req.body}"""`)
      args.push('data=payload')
    }
  }

  lines.push('')
  lines.push(`response = requests.${method}(${args.join(', ')})`)
  lines.push('print(response.json())')
  return lines.join('\n')
}

// --- Node.js (https module, no deps) ---

function toNodeHttps(req) {
  const url = effectiveUrl(req)
  let parsed
  try {
    parsed = new URL(url)
  } catch {
    return `// Invalid or templated URL — replace before running\nconst url = '${url}';`
  }

  const headers = effectiveHeaders(req)
  const method = (req.method || 'GET').toUpperCase()
  const protocol = parsed.protocol === 'http:' ? 'http' : 'https'

  if (headers._basicAuth !== undefined) {
    headers['Authorization'] =
      `Basic ${Buffer.from(headers._basicAuth).toString('base64')}`
    delete headers._basicAuth
  }

  const options = {
    hostname: parsed.hostname,
    port: parsed.port || (protocol === 'https' ? 443 : 80),
    path: `${parsed.pathname}${parsed.search}`,
    method,
    headers,
  }

  const hasBody = methodHasBody(method) && req.body && req.body.trim()

  return `const ${protocol} = require('${protocol}');

const options = ${JSON.stringify(options, null, 2)};

const req = ${protocol}.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => (data += chunk));
  res.on('end', () => console.log(data));
});

req.on('error', (e) => console.error(e));
${hasBody ? `req.write(${JSON.stringify(req.body)});\n` : ''}req.end();`
}

// --- Go ---

function toGo(req) {
  const url = effectiveUrl(req)
  const headers = effectiveHeaders(req)
  const method = (req.method || 'GET').toUpperCase()
  const hasBody = methodHasBody(method) && req.body && req.body.trim()

  const lines = [
    'package main',
    '',
    'import (',
    '    "fmt"',
    '    "io"',
    hasBody ? '    "strings"' : null,
    '    "net/http"',
    ')',
    '',
    'func main() {',
  ]
    .filter(Boolean)

  if (hasBody) {
    lines.push(`    body := strings.NewReader(\`${req.body.replace(/`/g, '` + "`" + `')}\`)`)
    lines.push(`    req, err := http.NewRequest("${method}", "${url}", body)`)
  } else {
    lines.push(`    req, err := http.NewRequest("${method}", "${url}", nil)`)
  }

  lines.push('    if err != nil { panic(err) }')

  if (headers._basicAuth !== undefined) {
    const [u, p] = headers._basicAuth.split(/:(.*)/)
    lines.push(`    req.SetBasicAuth("${u || ''}", "${p || ''}")`)
    delete headers._basicAuth
  }

  Object.entries(headers).forEach(([k, v]) => {
    lines.push(`    req.Header.Set("${k}", "${v.replace(/"/g, '\\"')}")`)
  })

  lines.push('')
  lines.push('    resp, err := http.DefaultClient.Do(req)')
  lines.push('    if err != nil { panic(err) }')
  lines.push('    defer resp.Body.Close()')
  lines.push('')
  lines.push('    out, _ := io.ReadAll(resp.Body)')
  lines.push('    fmt.Println(string(out))')
  lines.push('}')

  return lines.join('\n')
}

// --- Public API ---

export const LANGUAGES = [
  { id: 'curl', label: 'cURL', editorLang: 'shell', generate: toCurl },
  { id: 'fetch', label: 'JavaScript (fetch)', editorLang: 'javascript', generate: toFetch },
  { id: 'axios', label: 'JavaScript (axios)', editorLang: 'javascript', generate: toAxios },
  { id: 'python', label: 'Python (requests)', editorLang: 'python', generate: toPythonRequests },
  { id: 'node', label: 'Node.js (https)', editorLang: 'javascript', generate: toNodeHttps },
  { id: 'go', label: 'Go (net/http)', editorLang: 'go', generate: toGo },
]

export function generateSnippet(languageId, req) {
  const lang = LANGUAGES.find((l) => l.id === languageId)
  if (!lang) return '// Unsupported language'
  try {
    return lang.generate(req)
  } catch (e) {
    return `// Failed to generate snippet: ${e.message}`
  }
}