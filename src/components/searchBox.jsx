import { useEffect, useRef } from 'react'

function SearchBox({ value, onChange, placeholder = 'Search…' }) {
  const inputRef = useRef(null)

  // Global Ctrl/Cmd+K to focus this box
  useEffect(() => {
    const onKey = (e) => {
      const isMac = navigator.platform.toLowerCase().includes('mac')
      const cmd = isMac ? e.metaKey : e.ctrlKey
      if (cmd && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
        inputRef.current?.select()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="px-3 py-2 border-b border-slate-700">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') onChange('')
          }}
          placeholder={placeholder}
          className="w-full bg-slate-900 text-white pl-7 pr-7 py-1.5 rounded border border-slate-700 placeholder-slate-500 text-xs focus:border-blue-500 focus:outline-none"
        />
        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500 text-xs pointer-events-none">
          🔍
        </span>
        {value && (
          <button
            onClick={() => onChange('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white text-xs"
            title="Clear (Esc)"
            tabIndex={-1}
          >
            ✕
          </button>
        )}
      </div>
      {!value && (
        <div className="text-[10px] text-slate-600 mt-1 px-1">
          Press <kbd className="px-1 py-0.5 bg-slate-700 rounded text-slate-400">Ctrl K</kbd> to search
        </div>
      )}
    </div>
  )
}

export default SearchBox