import { useMemo } from 'react'
import CodeEditor from './CodeEditor'

const BODY_TYPES = [
  { id: 'json', label: 'JSON' },
  { id: 'text', label: 'Plain text' },
]

function BodyEditor({ body, setBody, bodyType, setBodyType, methodSupportsBody }) {
  // Validate JSON only when type is JSON
  const validation = useMemo(() => {
    if (bodyType !== 'json') return { state: 'na' }
    if (!body || !body.trim()) return { state: 'empty' }
    try {
      JSON.parse(body)
      return { state: 'valid' }
    } catch (e) {
      return { state: 'invalid', message: e.message }
    }
  }, [body, bodyType])

  const formatJson = () => {
    if (bodyType !== 'json' || !body.trim()) return
    try {
      const parsed = JSON.parse(body)
      setBody(JSON.stringify(parsed, null, 2))
    } catch {
      // Invalid JSON — do nothing; the indicator already tells the user
    }
  }

  const editorLanguage = bodyType === 'json' ? 'json' : 'javascript' // 'javascript' is harmless for plain text

  return (
    <div>
      {!methodSupportsBody && (
        <div className="text-slate-400 text-sm mb-2">
          Body is typically used with POST, PUT, PATCH, or DELETE.
        </div>
      )}

      {/* Top toolbar */}
      <div className="flex items-center gap-3 mb-2">
        <select
          value={bodyType}
          onChange={(e) => setBodyType(e.target.value)}
          className="bg-slate-700 text-white px-2 py-1 rounded border border-slate-600 text-xs"
        >
          {BODY_TYPES.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>

        {bodyType === 'json' && (
          <button
            onClick={formatJson}
            disabled={validation.state !== 'valid'}
            className="text-xs text-blue-400 hover:text-blue-300 disabled:text-slate-600 disabled:cursor-not-allowed"
            title="Pretty-print JSON"
          >
            ⇲ Format
          </button>
        )}

        {/* Validity indicator */}
        {bodyType === 'json' && (
          <div className="ml-auto text-xs">
            {validation.state === 'valid' && (
              <span className="text-green-400">✓ Valid JSON</span>
            )}
            {validation.state === 'invalid' && (
              <span className="text-red-400" title={validation.message}>
                ✗ Invalid JSON
              </span>
            )}
            {validation.state === 'empty' && (
              <span className="text-slate-500">Empty</span>
            )}
          </div>
        )}
      </div>

      <CodeEditor
        value={body}
        onChange={setBody}
        language={editorLanguage}
        height="240px"
        placeholder={
          bodyType === 'json' ? '{ "key": "value" }' : 'Plain text body…'
        }
      />

      {bodyType === 'json' && validation.state === 'invalid' && (
        <div className="text-xs text-red-400 mt-2 font-mono">
          {validation.message}
        </div>
      )}

      {bodyType === 'json' && (
        <div className="text-slate-500 text-xs mt-2">
          Tip: add a{' '}
          <code className="bg-slate-700 px-1 rounded">Content-Type: application/json</code>{' '}
          header so the server parses your body as JSON.
        </div>
      )}
    </div>
  )
}

export default BodyEditor