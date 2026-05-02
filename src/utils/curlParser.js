// Tokenize a curl command, respecting single quotes, double quotes, and escapes.
// Returns an array of string tokens.
function tokenize(input) {
  const tokens = []
  let current = ''
  let i = 0
  let quote = null // null, '"', or "'"

  // Strip shell line continuations: backslash followed by newline = nothing
  const cleaned = input.replace(/\\\r?\n/g, ' ').trim()

  while (i < cleaned.length) {
    const ch = cleaned[i]

    if (quote) {
      if (ch === '\\' && quote === '"' && i + 1 < cleaned.length) {
        // backslash escape inside double quotes
        current += cleaned[i + 1]
        i += 2
        continue
      }
      if (ch === quote) {
        quote = null
        i++
        continue
      }
      current += ch
      i++
      continue
    }

    if (ch === '"' || ch === "'") {
      quote = ch
      i++
      continue
    }

    if (ch === ' ' || ch === '\t' || ch === '\n') {
      if (current) {
        tokens.push(current)
        current = ''
      }
      i++
      continue
    }

    current += ch
    i++
  }

  if (current) tokens.push(current)
  return tokens
}

// Parse a single header string "Key: Value" -> { key, value }
function parseHeader(str) {
  const idx = str.indexOf(':')
  if (idx === -1) return { key: str.trim(), value: '' }
  return {
    key: str.slice(0, idx).trim(),
    value: str.slice(idx + 1).trim(),
  }
}

// Main parser. Returns { method, url, headers, body } or throws.
export function parseCurl(input) {
  if (!input || !input.trim()) {
    throw new Error('Empty input')
  }

  const tokens = tokenize(input)

  if (tokens.length === 0 || tokens[0].toLowerCase() !== 'curl') {
    throw new Error('Command must start with "curl"')
  }

  let method = null
  let url = ''
  const headers = []
  let body = ''

  // Skip the first 'curl' token, walk the rest
  for (let i = 1; i < tokens.length; i++) {
    const t = tokens[i]

    // -X / --request METHOD
    if (t === '-X' || t === '--request') {
      method = (tokens[++i] || 'GET').toUpperCase()
      continue
    }

    // -H / --header "Key: Value"
    if (t === '-H' || t === '--header') {
      const headerStr = tokens[++i]
      if (headerStr) headers.push(parseHeader(headerStr))
      continue
    }

    // -d / --data / --data-raw / --data-binary BODY
    if (t === '-d' || t === '--data' || t === '--data-raw' || t === '--data-binary') {
      body = tokens[++i] || ''
      continue
    }

    // -u / --user — basic auth (skip for now, log a warning)
    if (t === '-u' || t === '--user') {
      i++ // skip the value
      continue
    }

    // Common flags we ignore safely
    if (
      t === '-i' ||
      t === '--include' ||
      t === '-v' ||
      t === '--verbose' ||
      t === '-s' ||
      t === '--silent' ||
      t === '-L' ||
      t === '--location' ||
      t === '-k' ||
      t === '--insecure' ||
      t === '--compressed'
    ) {
      continue
    }

    // Combined flags like -sL, -is
    if (t.startsWith('-') && !t.startsWith('--')) {
      continue
    }

    // Long flags with =, e.g. --request=POST
    if (t.startsWith('--')) {
      if (t.startsWith('--request=')) {
        method = t.slice('--request='.length).toUpperCase()
      } else if (t.startsWith('--header=')) {
        headers.push(parseHeader(t.slice('--header='.length)))
      } else if (t.startsWith('--data=') || t.startsWith('--data-raw=')) {
        body = t.split('=').slice(1).join('=')
      }
      continue
    }

    // First non-flag token is the URL
    if (!url) {
      url = t
      continue
    }
  }

  if (!url) throw new Error('No URL found in curl command')

  // Default method: POST if body exists, GET otherwise
  if (!method) method = body ? 'POST' : 'GET'

  // Split URL and query params
  let baseUrl = url
  const params = []
  try {
    const u = new URL(url)
    u.searchParams.forEach((value, key) => {
      params.push({ key, value })
    })
    baseUrl = `${u.origin}${u.pathname}`
    // Drop the search portion from baseUrl by reconstructing
  } catch {
    // URL might be relative or use a variable, leave as-is
  }

  return {
    method,
    url: baseUrl,
    headers,
    params,
    body,
  }
}