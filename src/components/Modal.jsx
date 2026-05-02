import { useEffect } from 'react'

function Modal({ isOpen, onClose, title, children, footer, width = 'w-[480px]' }) {
  useEffect(() => {
    if (!isOpen) return
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className={`bg-slate-800 border border-slate-700 rounded-lg ${width} max-h-[90vh] flex flex-col overflow-hidden`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-3 border-b border-slate-700 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">{title}</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-lg leading-none"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex-1">{children}</div>

        {footer && (
          <div className="px-5 py-3 border-t border-slate-700 flex justify-end gap-2 bg-slate-800">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

export default Modal