import { useState } from 'react';
import { createPortal } from 'react-dom';

interface SelectModalProps {
  title?: string;
  options: { key: string; label: string }[];
  value?: string;
  onConfirm: (key: string) => void;
  onCancel: () => void;
}

export default function SelectModal({ title, options, value, onConfirm, onCancel }: SelectModalProps) {
  return createPortal(
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[99999]" onClick={onCancel}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xs mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {title && <div className="px-5 pt-5 pb-2 text-base font-bold text-gray-800">{title}</div>}
        <div className="px-3 py-2 max-h-60 overflow-y-auto">
          {options.map(opt => (
            <button key={opt.key} onClick={() => onConfirm(opt.key)}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-colors ${value === opt.key ? 'bg-indigo-100 text-indigo-700 font-medium' : 'text-gray-700 hover:bg-gray-100'}`}>
              {opt.label}
            </button>
          ))}
        </div>
        <div className="px-5 pb-4">
          <button onClick={onCancel} className="w-full py-2.5 rounded-xl bg-gray-100 text-gray-600 text-sm font-medium">取消</button>
        </div>
      </div>
    </div>,
    document.body
  );
}
