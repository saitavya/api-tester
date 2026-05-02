import Modal from './Modal'

function ConfirmModal({ isOpen, onClose, onConfirm, title = 'Are you sure?', message, confirmLabel = 'Confirm', danger = false }) {
  const handleConfirm = async () => {
    await onConfirm()
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      footer={
        <>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-300 hover:text-white border border-slate-600 rounded hover:bg-slate-700"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className={`px-4 py-2 text-sm text-white rounded font-medium ${
              danger ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      <p className="text-slate-300 text-sm">{message}</p>
    </Modal>
  )
}

export default ConfirmModal