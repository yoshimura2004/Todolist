// src/components/Modal.jsx
function Modal({ open, onClose, title, children }) {
  if (!open) return null

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()} // 안쪽 클릭 시 닫히지 않게
      >
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  )
}

export default Modal
