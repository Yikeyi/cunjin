import { createPortal } from 'react-dom';

interface ConfirmModalProps {
  message: string;
  subMessage?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({ message, subMessage, confirmLabel = '确定', cancelLabel = '取消', onConfirm, onCancel }: ConfirmModalProps) {
  return createPortal(
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[99999]" onClick={onCancel}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-5" onClick={(e) => e.stopPropagation()}>
        <p className="text-sm text-gray-700">{message}</p>
        {subMessage && <p className="text-xs text-gray-400 mt-1">{subMessage}</p>}
        <div className="flex gap-3 mt-4">
          <button onClick={onCancel} className="flex-1 py-2 rounded-lg bg-gray-100 text-gray-600 text-sm font-medium">{cancelLabel}</button>
          <button onClick={onConfirm} className="flex-1 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium">{confirmLabel}</button>
        </div>
      </div>
    </div>,
    document.body
  );
}
