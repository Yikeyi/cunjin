import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { TEMPLATES, getMergedTemplate, getCustomTemplates, saveCustomTemplates, Template } from '../data/templates';
import PromptModal from './PromptModal';

interface TemplatePickerProps {
  onCancel: () => void;
  onSelect: (t: Template) => void;
}

export default function TemplatePicker({ onCancel, onSelect }: TemplatePickerProps) {
  const [templates, setTemplates] = useState<Template[]>([...TEMPLATES, ...getCustomTemplates()]);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  function handleSelect(t: Template) {
    onSelect(t);
  }

  function handleDelete(id: string) {
    const custom = getCustomTemplates().filter(t => t.id !== id);
    saveCustomTemplates(custom);
    setTemplates([...TEMPLATES, ...custom]);
  }

  return createPortal(
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[99999]" onClick={onCancel}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-5">
          <h2 className="text-white text-lg font-bold">📦 选择模板</h2>
          <p className="text-indigo-200 text-xs mt-1">切换模板将替换当前习惯和目标</p>
        </div>
        <div className="p-4 space-y-2">
          {templates.map(t => (
            <button key={t.id} onClick={() => handleSelect(t)}
              className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all text-left">
              <span className="text-2xl">{t.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800">{t.name}</p>
                <p className="text-[11px] text-gray-400">{t.description}</p>
              </div>
            </button>
          ))}
        </div>
        <div className="px-4 pb-4">
          <button onClick={onCancel} className="w-full py-2.5 rounded-xl bg-gray-100 text-gray-600 text-sm font-medium">取消</button>
        </div>
      </div>
    </div>,
    document.body
  );
}
