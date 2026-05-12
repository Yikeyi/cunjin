import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface PromptModalProps {
  title: string;
  message?: string;
  value?: string;
  placeholder?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  zIndex?: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
}

export default function PromptModal({ title, message, value: initialValue = '', placeholder = '', confirmLabel = '确定', cancelLabel = '取消', onConfirm, onCancel, zIndex = '9999' }: PromptModalProps) {
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 100); }, []);

  return createPortal(
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center" style={{ zIndex: Number(zIndex) }} onClick={onCancel}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 pt-5 pb-3">
          <h3 className="text-base font-bold text-gray-800 mb-1">{title}</h3>
          {message && <p className="text-sm text-gray-500">{message}</p>}
        </div>
        <div className="px-5 pb-4">
          <input ref={inputRef} className="input" value={value} onChange={(e) => setValue(e.target.value)} placeholder={placeholder}
            onKeyDown={(e) => { if (e.key === 'Enter' && value.trim()) onConfirm(value.trim()); }} />
        </div>
        <div className="flex gap-3 px-5 pb-5">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-600 text-sm font-medium">{cancelLabel}</button>
          <button onClick={() => value.trim() && onConfirm(value.trim())} className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium">{confirmLabel}</button>
        </div>
      </div>
    </div>,
    document.body
  );
}
