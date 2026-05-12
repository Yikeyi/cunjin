import { useState } from 'react';
import { createPortal } from 'react-dom';
import { TEMPLATES, getCustomTemplates, Template } from '../data/templates';
import PromptModal from './PromptModal';

interface GoalPickerProps {
  onSelect: (goal: { title: string; type: string; startDate?: string; endDate?: string; sub_goals?: { title: string }[] }) => void;
  onCancel: () => void;
}

const PRESET_GOALS = [
  { title: '每天阅读30分钟', type: '学习', sub_goals: [{ title: '完成3本书' }, { title: '做读书笔记' }] },
  { title: '减重5公斤', type: '健康', sub_goals: [{ title: '每周运动4次' }, { title: '控制饮食' }] },
  { title: '完成一个项目', type: '工作', sub_goals: [{ title: '需求分析' }, { title: '开发实现' }, { title: '测试上线' }] },
  { title: '学会一门新技能', type: '兴趣', sub_goals: [{ title: '每天练习30分钟' }, { title: '完成一个作品' }] },
];

export default function GoalPicker({ onSelect, onCancel }: GoalPickerProps) {
  const [selected, setSelected] = useState<{ title: string; type: string; sub_goals?: { title: string }[] } | null>(null);
  const all = [...PRESET_GOALS, ...TEMPLATES.filter(t => t.goals.length > 0).flatMap(t => t.goals.map(g => ({ ...g, fromTemplate: t.name })))];

  if (selected) {
    const today = new Date().toLocaleDateString('en-CA');
    const end = new Date(); end.setMonth(end.getMonth() + 1);
    const defEnd = end.toLocaleDateString('en-CA');
    return (
      <PromptModal
        title={`设置「${selected.title}」日期`}
        message="默认从今天开始，为期一个月"
        value={`${today} ~ ${defEnd}`}
        confirmLabel="创建"
        zIndex="999999"
        onConfirm={(val) => {
          const match = val.match(/(\d{4}-\d{2}-\d{2})\s*~\s*(\d{4}-\d{2}-\d{2})/);
          if (match) {
            onSelect({ ...selected, startDate: match[1], endDate: match[2] });
          } else {
            onSelect({ ...selected, startDate: today, endDate: defEnd });
          }
        }}
        onCancel={() => setSelected(null)}
      />
    );
  }

  return createPortal(
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[99999]" onClick={onCancel}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-5">
          <h2 className="text-white text-lg font-bold">🎯 预设目标</h2>
          <p className="text-indigo-200 text-xs mt-1">选择一个预设目标快速创建</p>
        </div>
        <div className="p-4 space-y-2">
          {all.map((g, idx) => (
            <button key={idx} onClick={() => setSelected(g)}
              className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all text-left">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800">{g.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                    g.type === '学习' ? 'bg-blue-100 text-blue-800' : g.type === '健康' ? 'bg-green-100 text-green-800' : g.type === '工作' ? 'bg-purple-100 text-purple-800' : 'bg-orange-100 text-orange-800'
                  }`}>{g.type}</span>
                  {(g as any).fromTemplate && <span className="text-[10px] text-gray-400">{'·'} {(g as any).fromTemplate}</span>}
                </div>
                {g.sub_goals && g.sub_goals.length > 0 && (
                  <p className="text-[10px] text-gray-400 mt-1">{g.sub_goals.length} 个子目标</p>
                )}
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
