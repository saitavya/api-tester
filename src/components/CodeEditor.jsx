import CodeMirror from '@uiw/react-codemirror'
import { javascript } from '@codemirror/lang-javascript'
import { json } from '@codemirror/lang-json'
import { oneDark } from '@codemirror/theme-one-dark'
import { EditorView } from '@codemirror/view'

const LANGUAGES = {
  javascript: javascript({ jsx: false }),
  json: json(),
}

const editorTheme = EditorView.theme({
  '&': {
    fontSize: '13px',
    backgroundColor: 'transparent',
  },
  '.cm-content': {
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
  },
  '.cm-gutters': {
    backgroundColor: 'rgb(15 23 42)',
    border: 'none',
  },
  '.cm-activeLine': {
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  '.cm-activeLineGutter': {
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
})

function CodeEditor({
  value,
  onChange,
  language = 'javascript',
  height = '200px',
  placeholder = '',
  readOnly = false,
}) {
  const extensions = [LANGUAGES[language] || LANGUAGES.javascript, editorTheme]

  return (
    <div className="bg-slate-900 border border-slate-700 rounded overflow-hidden">
      <CodeMirror
        value={value}
        height={height}
        theme={oneDark}
        extensions={extensions}
        onChange={onChange}
        placeholder={placeholder}
        readOnly={readOnly}
        basicSetup={{
          lineNumbers: true,
          highlightActiveLine: true,
          foldGutter: true,
          autocompletion: true,
          bracketMatching: true,
          closeBrackets: true,
          history: true,
          tabSize: 2,
        }}
      />
    </div>
  )
}

export default CodeEditor