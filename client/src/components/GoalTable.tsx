import { useEffect, useState } from 'react';
import { api, Goal, SubGoal } from '../api';
import * as XLSX from 'xlsx';
import { exportWorkbook } from '../utils/export-xlsx';
import { getUniqueCustomItemLabels } from '../db/habits';
import PromptModal from './PromptModal';
import SelectModal from './SelectModal';
import ConfirmModal from './ConfirmModal';
import CalendarPicker from './CalendarPicker';
import GoalPicker from './GoalPicker';

const TYPE_OPTIONS = ['学习', '健康', '工作', '兴趣'] as const;
const COLOR_PRESETS = [
  { value: '#6366f1', label: '靛蓝' }, { value: '#10b981', label: '翠绿' },
  { value: '#f59e0b', label: '琥珀' }, { value: '#ef4444', label: '红色' },
  { value: '#8b5cf6', label: '紫色' }, { value: '#ec4899', label: '粉色' },
  { value: '#06b6d4', label: '青色' }, { value: '#84cc16', label: '酸橙' },
  { value: '#f97316', label: '橙色' }, { value: '#14b8a6', label: '青绿' },
];

function typeColorClass(type: string): string {
  const map: Record<string, string> = { '学习': 'bg-blue-100 text-blue-800', '健康': 'bg-green-100 text-green-800', '工作': 'bg-purple-100 text-purple-800', '兴趣': 'bg-orange-100 text-orange-800' };
  return map[type] || 'bg-gray-100 text-gray-800';
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

interface GoalFormData { title: string; type: string; start_date: string; end_date: string; progress: number; satisfaction: number; summary: string; color: string; linked_habit_key?: string | null; }
const emptyForm = (): GoalFormData => ({ title: '', type: '学习', start_date: '', end_date: '', progress: 0, satisfaction: 0, summary: '', color: '#6366f1', linked_habit_key: null });

export default function GoalTable() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<GoalFormData>(emptyForm());
  const [subGoals, setSubGoals] = useState<{ title: string; completed: boolean }[]>([]);
  const [goalSubGoals, setGoalSubGoals] = useState<Record<number, SubGoal[]>>({});
  const [expandedGoal, setExpandedGoal] = useState<number | null>(null);
  const [filterType, setFilterType] = useState('');
  const [dateField, setDateField] = useState<'start' | 'end' | null>(null);
  const [showGoalPicker, setShowGoalPicker] = useState(false);
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  const [showArchived, setShowArchived] = useState(false);

  useEffect(() => { loadGoals(); }, []);

  async function loadGoals() {
    try { setLoading(true); const d = await api.getGoals(); setGoals(d); } catch (err: any) { setError(err.message); } finally { setLoading(false); }
  }

  async function toggleExpandGoal(goalId: number) {
    if (expandedGoal === goalId) { setExpandedGoal(null); return; }
    setExpandedGoal(goalId);
    if (!goalSubGoals[goalId]) { try { const subs = await api.getSubGoals(goalId); setGoalSubGoals(prev => ({ ...prev, [goalId]: subs })); } catch { setGoalSubGoals(prev => ({ ...prev, [goalId]: [] })); } }
  }

  function openCreate() { setForm(emptyForm()); setSubGoals([]); setEditingId(null); setShowForm(true); }

  async function openEdit(goal: Goal) {
    setForm({ title: goal.title, type: goal.type, start_date: goal.start_date, end_date: goal.end_date, progress: goal.progress, satisfaction: goal.satisfaction, summary: goal.summary, color: goal.color || '#6366f1', linked_habit_key: goal.linked_habit_key || null });
    setEditingId(goal.id);
    try { const subs = await api.getSubGoals(goal.id); setSubGoals(subs.map(s => ({ title: s.title, completed: !!s.completed }))); } catch { setSubGoals([]); }
    setShowForm(true);
  }

  function addSubGoalField() { setSubGoals(prev => [...prev, { title: '', completed: false }]); }
  function removeSubGoalField(idx: number) { setSubGoals(prev => prev.filter((_, i) => i !== idx)); }
  function updateSubGoalField(idx: number, title: string) { setSubGoals(prev => prev.map((sg, i) => (i === idx ? { ...sg, title } : sg))); }

  async function handleSubmit() {
    if (!form.title || !form.start_date || !form.end_date) { alert('请填写标题、开始时间和结束时间'); return; }
    const payload = { ...form, sub_goals: subGoals.filter(sg => sg.title.trim()) };
    try {
      if (editingId) {
        const updated = await api.updateGoal(editingId, payload);
        setGoals(prev => prev.map(g => g.id === updated.id ? updated : g));
      } else {
        const created = await api.createGoal(payload);
        setGoals(prev => [created, ...prev]);
      }
      setShowForm(false);
    } catch (err: any) { alert('操作失败: ' + err.message); }
  }

  async function handleDelete(id: number) {
    try { await api.deleteGoal(id); setGoals(prev => prev.filter(g => g.id !== id)); } catch (err: any) { alert('删除失败: ' + err.message); }
  }

  function exportToXlsx() {
    if (goals.length === 0) { alert('没有可导出的数据'); return; }
    const rows = goals.map(g => ({ '目标': g.title, '类型': g.type, '进展': `${g.progress}%`, '开始时间': formatDate(g.start_date), '结束时间': formatDate(g.end_date), '满意度': g.satisfaction > 0 ? '★'.repeat(g.satisfaction) : '-', '总结': g.summary || '-' }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [{ wch: 30 }, { wch: 12 }, { wch: 8 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 30 }];
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, '寸进'); exportWorkbook(wb, `寸进_${new Date().toLocaleDateString('en-CA')}.xlsx`);
  }

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-900">🏔 志在千里</h2>
        <div className="flex gap-2">
          <button onClick={exportToXlsx} className="btn-primary text-xs">📥 导出</button>
          <button onClick={openCreate} className="btn-primary text-xs">＋ 新建</button>
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[70vh] overflow-y-auto p-5">
            <h3 className="text-lg font-semibold mb-4">{editingId ? '编辑目标' : '新建目标'}</h3>
            <div className="space-y-4">
              <div><label className="label">目标标题</label><input className="input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="输入个人目标..." /></div>
              <div><label className="label">类型</label>
                <div className="flex gap-2 flex-wrap">
                  {TYPE_OPTIONS.map(t => (
                    <button key={t} onClick={() => setForm({ ...form, type: t })} className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${form.type === t ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{t}</button>
                  ))}
                  <input className="input flex-1 text-xs !py-1.5" placeholder="自定义..." value={!TYPE_OPTIONS.includes(form.type as any) ? form.type : ''} onChange={e => setForm({ ...form, type: e.target.value || '学习' })} />
                </div>
              </div>
              <div><label className="label">关联习惯</label>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.linked_habit_key !== null} onChange={e => setForm(prev => ({ ...prev, linked_habit_key: e.target.checked ? '' : null } as any))} className="w-4 h-4 rounded border-gray-300 text-indigo-600" />
                    <span className="text-xs text-gray-600">关联</span>
                  </label>
                  {form.linked_habit_key !== null && (
                    <input className="input flex-1 text-sm" value={form.linked_habit_key || ''} onChange={e => setForm(prev => ({ ...prev, linked_habit_key: e.target.value } as any))} placeholder="输入习惯名称..." />
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">开始时间</label>
                  <button onClick={() => setDateField('start')} className="input w-full text-left cursor-pointer">{form.start_date || '选择日期'}</button></div>
                <div><label className="label">结束时间</label>
                  <button onClick={() => setDateField('end')} className="input w-full text-left cursor-pointer">{form.end_date || '选择日期'}</button></div>
              </div>
              <div><label className="label">进展: {form.progress}%</label>
                <input type="range" min="0" max="100" step="5" value={form.progress} onChange={e => setForm({ ...form, progress: parseInt(e.target.value) })} className="w-full accent-indigo-600" /></div>
              <div>
                <label className="label">满意度</label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button key={star} type="button" onClick={() => setForm({ ...form, satisfaction: form.satisfaction === star ? 0 : star })}
                      className={`text-2xl transition-colors ${star <= form.satisfaction ? 'text-yellow-400' : 'text-gray-300'} hover:text-yellow-400`}>★</button>
                  ))}
                </div>
              </div>
              <div className="border-t border-gray-200 pt-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="label mb-0">子目标</label>
                  <button type="button" onClick={addSubGoalField} className="text-indigo-600 text-xs font-medium">＋ 添加</button>
                </div>
                {subGoals.map((sg, idx) => (
                  <div key={idx} className="flex items-center gap-2 mb-2">
                    <input type="text" value={sg.title} onChange={e => updateSubGoalField(idx, e.target.value)} placeholder="子目标..." className="input flex-1 text-sm" />
                    <button type="button" onClick={() => removeSubGoalField(idx)} className="text-red-500 hover:text-red-700 shrink-0">✕</button>
                  </div>
                ))}
              </div>
              <div><label className="label">总结</label><textarea className="input resize-none" rows={2} value={form.summary} onChange={e => setForm({ ...form, summary: e.target.value })} placeholder="目标总结..." /></div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowForm(false)} className="btn-secondary">取消</button>
              <button onClick={handleSubmit} className="btn-primary">{editingId ? '保存修改' : '创建'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Filter */}
      {goals.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          <button onClick={() => setFilterType('')} className={`text-[11px] px-3 py-1 rounded-full font-medium transition-colors ${!filterType ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>全部</button>
          {[...new Set(goals.map(g => g.type))].map(t => (
            <button key={t} onClick={() => setFilterType(t)} className={`text-[11px] px-3 py-1 rounded-full font-medium transition-colors ${filterType === t ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{t}</button>
          ))}
        </div>
      )}

      {/* Goal Cards */}
      {goals.length === 0 ? (
        <div className="card text-center py-12">
          <div className="text-5xl mb-4">🎯</div>
          <p className="text-gray-500 font-medium mb-1">还没有目标</p>
          <p className="text-xs text-gray-400 mb-5">设定一个目标，每天为它前进一寸</p>
          <button onClick={openCreate} className="btn-primary">＋ 创建第一个目标</button>
        </div>
      ) : (() => {
        const activeGoals = goals.filter(g => !g.archived);
        const archivedGoals = goals.filter(g => g.archived);
        const filteredGoals = filterType ? activeGoals.filter(g => g.type === filterType) : activeGoals;
        return (
          <div className="space-y-3">
            {filteredGoals.map(goal => (
              <div key={goal.id} className="card !p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: goal.color || '#6366f1' }} />
                  <span className="text-sm font-semibold text-gray-800 truncate flex-1">{goal.title}</span>
                  <span className={`badge ${typeColorClass(goal.type)} shrink-0 cursor-pointer`} onClick={() => openEdit(goal)}>{goal.type}</span>
                  {goal.progress >= 100 && <span className="badge bg-yellow-100 text-yellow-800 shrink-0 animate-bounce">🎉 已达成</span>}
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <button onClick={() => openEdit(goal)} className="text-[11px] bg-gray-100 hover:bg-gray-200 text-gray-500 px-2 py-0.5 rounded-lg font-medium transition-colors shrink-0">编辑</button>
                  <button onClick={() => toggleExpandGoal(goal.id)} className="text-gray-400 hover:text-gray-600 text-xs px-1.5 py-1 rounded-lg hover:bg-gray-100">{expandedGoal === goal.id ? '▾' : '▸'} 子目标</button>
                  {goal.progress >= 100 && !goal.archived && (
                    <button onClick={async () => { try { await api.updateGoal(goal.id, { archived: 1 }); setGoals(prev => prev.map(g => g.id === goal.id ? { ...g, archived: 1 } : g)); } catch {} }}
                      className="text-gray-400 hover:text-yellow-600 text-xs px-1.5 py-1 rounded-lg hover:bg-yellow-50">📦 归档</button>
                  )}
                  {goal.archived && (
                    <button onClick={async () => { try { await api.updateGoal(goal.id, { archived: 0 }); setGoals(prev => prev.map(g => g.id === goal.id ? { ...g, archived: 0 } : g)); } catch {} }}
                      className="text-gray-400 hover:text-indigo-600 text-xs px-1.5 py-1 rounded-lg hover:bg-indigo-50">↩ 恢复</button>
                  )}
                  <button onClick={() => handleDelete(goal.id)} className="text-gray-300 hover:text-red-500 text-xs px-1.5 py-1 rounded-lg hover:bg-red-50">🗑</button>
                </div>
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-medium text-gray-500">进度</span>
                    <span className="text-[11px] font-semibold text-gray-600">{goal.progress}%</span>
                  </div>
                  <input type="range" min="0" max="100" step="5" value={goal.progress}
                    onChange={async e => { const v = parseInt(e.target.value); try { await api.updateGoal(goal.id, { progress: v }); setGoals(prev => prev.map(g => g.id === goal.id ? { ...g, progress: v } : g)); } catch {} }}
                    className="w-full accent-indigo-600 h-2 rounded-full appearance-none cursor-pointer bg-gray-100" />
                </div>
                {goal.linked_habit_key && (
                  <div className="flex items-center gap-2 text-xs text-indigo-600 mb-2">📎 {goal.linked_habit_key}</div>
                )}
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button key={star} onClick={async () => { const v = goal.satisfaction === star ? 0 : star; try { await api.updateGoal(goal.id, { satisfaction: v }); setGoals(prev => prev.map(g => g.id === goal.id ? { ...g, satisfaction: v } : g)); } catch {} }}
                      className={`text-sm transition-colors ${star <= goal.satisfaction ? 'text-yellow-400' : 'text-gray-300'} hover:text-yellow-400`}>★</button>
                  ))}
                </div>
                {expandedGoal === goal.id && (
                  <div className="mt-3 space-y-1">
                    {!goalSubGoals[goal.id] ? <p className="text-xs text-gray-400">加载中...</p> : goalSubGoals[goal.id].length === 0 ? <p className="text-xs text-gray-400">暂无子目标</p> : (
                      goalSubGoals[goal.id].map(sub => (
                        <div key={sub.id} className="flex items-center gap-2">
                          <button onClick={() => {}} className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${sub.completed ? 'bg-green-500 border-green-500' : 'border-gray-300'}`}>
                            {sub.completed && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                          </button>
                          <span className={`text-xs flex-1 ${sub.completed ? 'text-gray-400 line-through' : 'text-gray-700'}`}>{sub.title}</span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            ))}
            {archivedGoals.length > 0 && (
              <div className="mt-6">
                <button onClick={() => setShowArchived(!showArchived)} className="flex items-center gap-2 text-xs text-gray-400 hover:text-gray-600">
                  <span>{showArchived ? '▾' : '▸'}</span>
                  <span>📦 已归档目标（{archivedGoals.length} 个）</span>
                </button>
                {showArchived && (
                  <div className="space-y-2 mt-3">
                    {archivedGoals.map(goal => (
                      <div key={goal.id} className="card !p-3 opacity-70">
                        <div className="flex items-center gap-3">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: goal.color || '#6366f1' }} />
                          <span className="text-sm text-gray-500 line-through flex-1">{goal.title}</span>
                          <span className="text-[10px] text-gray-400">{goal.progress}%</span>
                          <button onClick={async () => { try { await api.updateGoal(goal.id, { archived: 0 }); setGoals(prev => prev.map(g => g.id === goal.id ? { ...g, archived: 0 } : g)); } catch {} }} className="text-[10px] text-indigo-500 hover:text-indigo-700 font-medium">恢复</button>
                          <button onClick={() => handleDelete(goal.id)} className="text-gray-300 hover:text-red-500 text-xs">🗑</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })()}

      {/* Calendar Picker */}
      {dateField && <CalendarPicker value={dateField === 'start' ? form.start_date : form.end_date} onConfirm={val => { if (dateField === 'start') setForm({ ...form, start_date: val }); else setForm({ ...form, end_date: val }); setDateField(null); }} onCancel={() => setDateField(null)} />}

      {/* Goal Picker */}
      {showGoalPicker && <GoalPicker onSelect={async (selected) => {
        setShowGoalPicker(false);
        const today = new Date().toLocaleDateString('en-CA');
        const end = new Date(); end.setMonth(end.getMonth() + 1);
        try {
          const created = await api.createGoal({
            title: selected.title,
            type: selected.type,
            start_date: selected.startDate || today,
            end_date: selected.endDate || end.toLocaleDateString('en-CA'),
            progress: 0,
          });
          setGoals(prev => [created, ...prev]);
          if (selected.sub_goals && selected.sub_goals.length > 0) {
            for (let i = 0; i < selected.sub_goals.length; i++) {
              await api.createSubGoal(created.id, { title: selected.sub_goals[i].title, sort_order: i });
            }
          }
        } catch (err: any) { alert('创建失败: ' + err.message); }
      }} onCancel={() => setShowGoalPicker(false)} />}

      {/* Bottom bar */}
      <div className="md:hidden fixed bottom-14 left-0 right-0 z-40 flex items-center justify-start gap-2 px-4 py-1.5 bg-white/90 dark:bg-gray-900/90 backdrop-blur-lg border-t border-gray-100/80 dark:border-gray-700/80">
        <button onClick={() => setViewMode(viewMode === 'card' ? 'list' : 'card')} className="text-[10px] bg-gray-100 hover:bg-gray-200 rounded-md px-2 py-0.5 text-gray-500 font-medium transition-colors">{viewMode === 'card' ? '📋 列表' : '📇 卡片'}</button>
        <button onClick={() => setShowGoalPicker(true)} className="text-[10px] bg-gray-100 hover:bg-gray-200 rounded-md px-2 py-0.5 text-gray-500 font-medium transition-colors">🎯 预设目标</button>
      </div>
    </div>
  );
}
