import { useState, useEffect, useMemo } from 'react';
import { api, Habit, CustomHabitItem } from '../api';
import PromptModal from './PromptModal';
import ConfirmModal from './ConfirmModal';
import * as XLSX from 'xlsx';
import { exportWorkbook } from '../utils/export-xlsx';

const DEFAULT_HABITS = [
  { key: 'early_sleep', defaultLabel: '早睡早起' },
  { key: 'exercise', defaultLabel: '每日锻炼' },
  { key: 'study', defaultLabel: '每日学习' },
  { key: 'hobby', defaultLabel: '每日兴趣' },
  { key: 'healthy_diet', defaultLabel: '健康饮食' },
];

const CUSTOM_STORAGE_KEY = 'custom_habit_labels';
const RENAME_STORAGE_KEY = 'renamed_habit_labels';

function getCustomLabels(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(CUSTOM_STORAGE_KEY) || '{}'); } catch { return {}; }
}

function getRenamedLabels(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(RENAME_STORAGE_KEY) || '{}'); } catch { return {}; }
}

function getItemLabel(item: { id: string; label: string; isDefault: boolean }, habit: Habit): string {
  if (!item.isDefault) return item.label;
  const renamed = getRenamedLabels();
  return renamed[item.id] || item.label;
}

function getVisibleItems(habit: Habit): { id: string; label: string; checked: boolean; isDefault: boolean; isGoalCreated: boolean; note?: string }[] {
  const items: { id: string; label: string; checked: boolean; isDefault: boolean; isGoalCreated: boolean; note?: string }[] = [];
  const deletedKeys = new Set((habit.custom_items || []).filter(i => i.label.startsWith('__deleted_')).map(i => { const m = i.label.match(/__deleted_(.+)=/); return m ? m[1] : ''; }));
  for (const dh of DEFAULT_HABITS) {
    if (deletedKeys.has(dh.key)) continue;
    const checked = !!(habit as any)[dh.key];
    const renamed = getRenamedLabels();
    items.push({ id: dh.key, label: renamed[dh.key] || dh.defaultLabel, checked, isDefault: true, isGoalCreated: false });
  }
  for (const ci of (habit.custom_items || [])) {
    if (ci.label.startsWith('__')) continue;
    const customLabels = getCustomLabels();
    const isGoalCreated = (habit.custom_items || []).some(m => m.label.startsWith('__goal_') && m.label.endsWith(`=${ci.label}`));
    items.push({ id: ci.label, label: customLabels[ci.label] || ci.label, checked: ci.checked, isDefault: false, isGoalCreated, note: ci.note });
  }
  return items;
}

function getAllItems(habit: Habit): { id: string; label: string; checked: boolean; isDefault: boolean }[] {
  return getVisibleItems(habit);
}

interface HabitItemInfo {
  id: string;
  label: string;
  isDefault: boolean;
  isGoalCreated?: boolean;
}

export default function HabitTable() {
  const [habit, setHabit] = useState<Habit | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toLocaleDateString('en-CA'));
  const [loading, setLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<Habit[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [detailItem, setDetailItem] = useState<HabitItemInfo | null>(null);
  const [promptData, setPromptData] = useState<{ mode: string; title: string; value?: string } | null>(null);
  const [toast, setToast] = useState('');
  const [confirmData, setConfirmData] = useState<{ message: string; onConfirm: () => void } | null>(null);
  const [celebrateMsg, setCelebrateMsg] = useState('');

  useEffect(() => {
    if (selectedDate) loadHabitByDate(selectedDate);
  }, [selectedDate]);

  useEffect(() => {
    if (toast) { const t = setTimeout(() => setToast(''), 2000); return () => clearTimeout(t); }
  }, [toast]);

  useEffect(() => {
    if (celebrateMsg) { const t = setTimeout(() => setCelebrateMsg(''), 2500); return () => clearTimeout(t); }
  }, [celebrateMsg]);

  async function loadHabitByDate(date: string) {
    setLoading(true);
    try {
      const h = await api.getHabitByDate(date);
      if (!h) { setHabit(null); return; }
      // Sync goal-linked habits
      const goals = await api.getGoals();
      const activeGoals = goals.filter((g: any) => g.linked_habit_key && g.start_date <= date && g.end_date >= date && !g.archived);
      let updated = false;
      let items = [...(h.custom_items || [])];
      for (const g of activeGoals) {
        const key = g.linked_habit_key;
        const standardKeys = ['early_sleep', 'exercise', 'study', 'hobby', 'healthy_diet'];
        if (standardKeys.includes(key)) continue;
        const existingLabels = new Set(items.map(i => i.label));
        if (!existingLabels.has(key)) {
          items.push({ label: `__goal_${g.id}=${key}`, checked: false });
          items.push({ label: key, checked: false });
          updated = true;
        }
      }
      // Apply deleted items filter
      const deletedKeys = new Set(items.filter(i => i.label.startsWith('__deleted_')).map(i => { const m = i.label.match(/__deleted_(.+)=/); return m ? m[1] : ''; }));
      for (const dh of DEFAULT_HABITS) {
        if (deletedKeys.has(dh.key)) continue;
        if (!(h as any)[dh.key]) continue;
        const existingLabels = new Set(items.map(i => i.label));
        if (!existingLabels.has(dh.defaultLabel)) {
          items.push({ label: dh.defaultLabel, checked: (h as any)[dh.key] });
          updated = true;
        }
      }
      if (updated) {
        const r = await api.updateHabit(h.id, { custom_items: items });
        setHabit(r);
      } else {
        setHabit(h);
      }
      // Celebration toast on all complete
      const visItems = getVisibleItems(habit || h);
      if (visItems.length > 0 && visItems.every(i => i.checked)) {
        if (date === new Date().toLocaleDateString('en-CA')) setCelebrateMsg('🎉 全部完成！今天又前进了一寸！');
      }
    } catch (err: any) {
      setToast('❌ ' + (err.message || '加载失败'));
    } finally { setLoading(false); }
  }

  async function createTodayHabit() {
    if (!selectedDate) return;
    try {
      const h = await api.createHabit(selectedDate);
      // Sync goal-linked habits
      const goals = await api.getGoals();
      const activeGoals = goals.filter((g: any) => g.linked_habit_key && g.start_date <= selectedDate && g.end_date >= selectedDate && !g.archived);
      let items = [...(h.custom_items || [])];
      for (const g of activeGoals) {
        const key = g.linked_habit_key;
        const standardKeys = ['early_sleep', 'exercise', 'study', 'hobby', 'healthy_diet'];
        if (standardKeys.includes(key)) continue;
        items.push({ label: `__goal_${g.id}=${key}`, checked: false });
        items.push({ label: key, checked: false });
      }
      if (items.length > (h.custom_items || []).length) {
        const r = await api.updateHabit(h.id, { custom_items: items });
        setHabit(r);
      } else {
        setHabit(h);
      }
    } catch (err: any) { setToast('❌ ' + err.message); }
  }

  async function toggleItem(id: string, fullIdx: number, isCustom: boolean) {
    if (!habit) return;
    const update: Partial<Habit> = {};
    if (!isCustom) {
      (update as any)[id] = !(habit as any)[id];
    } else {
      const items = [...(habit.custom_items || [])];
      const idx = items.findIndex(ci => !ci.label.startsWith('__') && ci.label === id);
      if (idx >= 0) items[idx] = { ...items[idx], checked: !items[idx].checked };
      update.custom_items = items;
    }
    const r = await api.updateHabit(habit.id, update);
    setHabit(r);
    const visItems = getVisibleItems(r);
    if (visItems.length > 0 && visItems.every(i => i.checked)) {
      const today = new Date().toLocaleDateString('en-CA');
      if (selectedDate === today) setCelebrateMsg('🎉 全部完成！今天又前进了一寸！');
    }
  }

  function renameItem(fullIdx: number, isCustom: boolean) {
    if (!habit) return;
    const items = getAllItems(habit);
    const item = items[fullIdx];
    if (!item) return;
    setPromptData({ mode: isCustom ? 'renameCustom' : 'renameDefault', title: `重命名「${item.label}」`, value: item.label });
  }

  function hasRename(id: string): boolean {
    const renamed = getRenamedLabels();
    return !!renamed[id];
  }

  function resetDefaultItemName(id: string) {
    const renamed = getRenamedLabels();
    delete renamed[id];
    localStorage.setItem(RENAME_STORAGE_KEY, JSON.stringify(renamed));
    loadHabitByDate(selectedDate);
  }

  function addCustomItem() {
    setPromptData({ mode: 'addCustom', title: '添加自定义打卡项', value: '' });
  }

  function deleteItem(fullIdx: number, isDefault: boolean) {
    if (!habit) return;
    const items = getAllItems(habit);
    const item = items[fullIdx];
    if (!item) return;
    if (isDefault) {
      const deleted = getDeletedKeys();
      deleted.push(item.id);
      localStorage.setItem('deleted_default_habits', JSON.stringify(deleted));
      const customItems = [...(habit.custom_items || [])];
      customItems.push({ label: `__deleted_${item.id}=${item.label}`, checked: false });
      const labelIdx = customItems.findIndex(ci => ci.label === item.label && !ci.label.startsWith('__'));
      if (labelIdx >= 0) customItems.splice(labelIdx, 1);
      api.updateHabit(habit.id, { custom_items: customItems }).then(setHabit);
    } else {
      const customItems = (habit.custom_items || []).filter(ci => {
        if (ci.label.startsWith('__goal_') && ci.label.endsWith(`=${item.label}`)) return false;
        if (ci.label.startsWith('__')) return true;
        return ci.label !== item.label;
      });
      api.updateHabit(habit.id, { custom_items: customItems }).then(setHabit);
    }
  }

  function moveCustomItem(idx: number, dir: -1 | 1) {
    if (!habit) return;
    const items = [...(habit.custom_items || [])];
    const visibleCustomIndices: number[] = [];
    items.forEach((ci, i) => { if (!ci.label.startsWith('__')) visibleCustomIndices.push(i); });
    const from = visibleCustomIndices[idx];
    const to = visibleCustomIndices[idx + dir];
    if (to === undefined || to < 0 || to >= items.length) return;
    [items[from], items[to]] = [items[to], items[from]];
    api.updateHabit(habit.id, { custom_items: items }).then(setHabit);
  }

  function getDeletedKeys(): string[] {
    try { return JSON.parse(localStorage.getItem('deleted_default_habits') || '[]'); } catch { return []; }
  }

  async function openHistory() {
    setShowHistory(true);
    setHistoryLoading(true);
    try { const data = await api.getHabitHistory(90); setHistory(data); } catch {}
    setHistoryLoading(false);
  }

  async function createNewHistoryRecord() {
    setPromptData({ mode: 'addDate', title: '新增日期', value: new Date().toLocaleDateString('en-CA') });
  }

  async function deleteHabitRecord(id: number) {
    setConfirmData({ message: '确定要删除这条记录吗？', onConfirm: async () => { setConfirmData(null); await api.deleteHabit(id); setHistory(prev => prev.filter(h => h.id !== id)); } });
  }

  function exportToXlsx() {
    if (history.length === 0) { alert('没有可导出的数据'); return; }
    const rows = history.map(h => {
      const items = getVisibleItems(h);
      const row: Record<string, any> = { '日期': h.date, '完成数': h.completed_count, '完成率': `${Math.round(h.completion_rate)}%`, '总结': h.summary || '' };
      items.forEach(i => { row[i.label] = i.checked ? '✓' : '✗'; });
      return row;
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '寸进');
    exportWorkbook(wb, `寸进_打卡记录_${new Date().toLocaleDateString('en-CA')}.xlsx`);
  }

  const today = new Date().toLocaleDateString('en-CA');

  return (
    <div>
      <h2 className="text-lg font-bold text-gray-900 mb-4">✅ 今日寸进</h2>
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <button onClick={() => { const d = new Date(selectedDate + 'T00:00:00'); d.setDate(d.getDate() - 1); setSelectedDate(d.toLocaleDateString('en-CA')); }}
          className="btn-secondary text-xs !px-2 !py-1">◀ 昨天</button>
        <button onClick={() => setSelectedDate(today)} className={`text-xs !px-2 !py-1 ${selectedDate === today ? 'btn-primary' : 'btn-secondary'}`}>今天</button>
        <button onClick={() => { const d = new Date(selectedDate + 'T00:00:00'); d.setDate(d.getDate() + 1); if (d <= new Date()) setSelectedDate(d.toLocaleDateString('en-CA')); }}
          className="btn-secondary text-xs !px-2 !py-1">明天 ▶</button>
        {!habit && <button onClick={createTodayHabit} className="btn-primary text-xs">创建今日打卡</button>}
        <button onClick={openHistory} className="btn-secondary text-xs">📋 历史记录</button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full" /></div>
      ) : !habit ? (
        <div className="card text-center py-12">
          <div className="text-4xl mb-3">🌱</div>
          <p className="text-gray-400">{selectedDate === today ? '今天还没有打卡' : '这一天没有打卡记录'}</p>
          {selectedDate === today && <p className="text-xs text-gray-400 mt-1">点击上方「创建今日打卡」开始记录</p>}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
            {getVisibleItems(habit).map((item, idx) => {
              const fullItems = getAllItems(habit);
              const fullIdx = fullItems.findIndex(fi => fi.id === item.id);
              const isCustom = fullIdx !== -1 && !fullItems[fullIdx].isDefault;
              return (
                <div key={item.id}
                  className={`flex flex-col gap-1 p-2.5 rounded-xl border-2 transition-all ${item.checked ? 'bg-green-50 border-green-400' : 'bg-white border-gray-200'}`}>
                  <div className="flex items-center gap-2">
                    <button onClick={() => toggleItem(item.id, fullIdx, !isCustom)}
                      className={`w-8 h-8 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all ${item.checked ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300'}`}>
                      {item.checked && <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                    </button>
                    <button onClick={() => setDetailItem({ id: item.id, label: item.label, isDefault: item.isDefault })}
                      className={`text-sm flex-1 font-medium min-w-0 truncate text-left ${item.checked ? 'text-green-800' : 'text-gray-700'} hover:text-indigo-600 transition-colors`}>
                      {item.label}
                    </button>
                    {!item.isGoalCreated && <>
                      {!item.isDefault && <>
                        <button onClick={() => moveCustomItem(fullIdx, -1)} className="text-gray-300 hover:text-indigo-500 text-xs shrink-0 p-0.5">▲</button>
                        <button onClick={() => moveCustomItem(fullIdx, 1)} className="text-gray-300 hover:text-indigo-500 text-xs shrink-0 p-0.5">▼</button>
                      </>}
                      <button onClick={() => renameItem(fullIdx, !isCustom)} className="text-gray-300 hover:text-indigo-500 text-xs shrink-0 p-0.5" title="重命名">✏️</button>
                      {item.isDefault && hasRename(item.id) && (
                        <button onClick={() => resetDefaultItemName(item.id)} className="text-gray-300 hover:text-amber-500 text-xs shrink-0 p-0.5" title="恢复默认名称">↩</button>
                      )}
                      <button onClick={() => deleteItem(fullIdx, item.isDefault)} className="text-gray-300 hover:text-red-500 text-xs shrink-0 p-0.5" title="删除">✕</button>
                    </>}
                  </div>
                  {item.checked && !item.isGoalCreated && item.note && (
                    <div className="text-[10px] text-gray-400 pl-10">📝 {item.note}</div>
                  )}
                </div>
              );
            })}
          </div>
          <button onClick={addCustomItem} className="text-indigo-600 hover:text-indigo-800 text-sm font-medium">＋ 添加自定义打卡项</button>
          {celebrateMsg && (
            <div className="mt-4 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 rounded-xl text-center animate-bounce">
              <p className="text-lg font-bold text-indigo-700">{celebrateMsg}</p>
            </div>
          )}
        </>
      )}

      {/* History Modal */}
      {showHistory && (
        <div className="fixed inset-0 bg-black/40 flex flex-col z-[99999]">
          <div className="bg-white rounded-t-2xl shadow-xl flex flex-col max-h-[85vh] mt-auto">
            <div className="shrink-0 px-5 pt-5 pb-2 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-800 mb-1">📋 历史打卡记录</h3>
              <p className="text-[11px] text-gray-400">最多显示近 90 天记录</p>
              <div className="flex gap-2 mt-3 flex-wrap">
                <button onClick={exportToXlsx} className="btn-primary text-[11px] !px-3 !py-1.5">📥 导出 xlsx</button>
                <button onClick={createNewHistoryRecord} className="btn-secondary text-[11px] !px-3 !py-1.5">＋ 新增日期</button>
                <button onClick={() => setConfirmData({ message: '确定要清空所有打卡记录吗？此操作不可撤销！', onConfirm: async () => { setConfirmData(null); try { await api.clearAllHabits(); setShowHistory(false); loadHabitByDate(selectedDate); } catch { alert('清空失败'); } } })}
                  className="btn-danger text-[11px] !px-3 !py-1.5">🗑 清空</button>
                <button onClick={() => setShowHistory(false)} className="btn-primary text-[11px] !px-3 !py-1.5">关闭</button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-4 space-y-2">
              {historyLoading ? (
                <div className="flex justify-center py-8"><div className="animate-spin h-6 w-6 border-4 border-indigo-600 border-t-transparent rounded-full" /></div>
              ) : history.length === 0 ? (
                <div className="text-center py-12"><p className="text-gray-400">暂无历史记录</p></div>
              ) : (
                history.map(h => {
                  const items = getVisibleItems(h);
                  const doneCount = items.filter(i => i.checked).length;
                  const totalCount = items.length;
                  const rate = totalCount > 0 ? Math.round(doneCount / totalCount * 100) : 0;
                  return (
                    <div key={h.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-gray-200 transition-all bg-white">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-gray-700">{h.date}</span>
                          <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${rate >= 80 ? 'bg-green-100 text-green-700' : rate >= 40 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                            {doneCount}/{totalCount} · {rate}%
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {items.map(i => (
                            <span key={i.label} className={`text-[10px] px-1.5 py-0.5 rounded-md ${i.checked ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-400'}`}>
                              {i.checked ? '✅' : '⬜'} {i.label}
                            </span>
                          ))}
                        </div>
                      </div>
                      <button onClick={() => { setConfirmData({ message: '确定删除此记录？', onConfirm: async () => { setConfirmData(null); await api.deleteHabit(h.id); setHistory(prev => prev.filter(x => x.id !== h.id)); } }); }}
                        className="text-gray-200 hover:text-red-500 text-xs shrink-0 px-1.5 py-1 rounded-lg hover:bg-red-50 transition-colors">🗑</button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Detail Popup */}
      {detailItem && (() => {
        const habitKey = DEFAULT_HABITS.find(dh => dh.key === detailItem.id) ? detailItem.id : null;
        const historyData = (() => {
          try {
            return history.length > 0 ? history.map(h => ({
              date: h.date,
              done: habitKey ? (h as any)[habitKey] === true : (h.custom_items || []).some(i => !i.label.startsWith('__') && i.label === detailItem.label && i.checked),
            })).filter(h => h.done !== undefined) : [];
          } catch { return []; }
        })();

        return (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[99999]" onClick={() => setDetailItem(null)}>
            <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-5" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-gray-800">{detailItem.label}</h3>
                <button onClick={() => setDetailItem(null)} className="text-gray-400 hover:text-gray-600">✕</button>
              </div>
              {(() => {
                const today = new Date();
                const year = today.getFullYear();
                const month = today.getMonth();
                const daysInM = new Date(year, month + 1, 0).getDate();
                const firstD = new Date(year, month, 1).getDay();
                const doneSet = new Set(historyData.filter(h => h.done).map(h => h.date));
                const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
                let currentStreak = 0, cursor = new Date(today);
                while (cursor >= new Date(today.getTime() - 365 * 86400000)) { const ds = cursor.toLocaleDateString('en-CA'); if (doneSet.has(ds)) { currentStreak++; cursor.setDate(cursor.getDate() - 1); } else break; }
                let longestStreak = 0, streak = 0;
                for (const ds of historyData.map(h => h.date).sort()) { if (doneSet.has(ds)) { streak++; longestStreak = Math.max(longestStreak, streak); } else streak = 0; }

                return (
                  <>
                    <p className="text-xs text-gray-400 mb-2">📅 {year}年{month + 1}月</p>
                    {historyData.length > 0 && (
                      <div className="flex items-center gap-3 mb-3 text-[11px]">
                        <span className="text-green-700 font-medium">🔥 连 {currentStreak} 天</span>
                        <span className="text-gray-400">·</span>
                        <span className="text-amber-700 font-medium">🏆 最长 {longestStreak} 天</span>
                      </div>
                    )}
                    <div className="grid grid-cols-7 gap-0.5 mb-1">
                      {weekDays.map(d => <div key={d} className="text-center text-[9px] font-semibold text-gray-400 py-0.5">{d}</div>)}
                    </div>
                    <div className="grid grid-cols-7 gap-0.5">
                      {Array.from({ length: firstD }, (_, i) => <div key={`e-${i}`} />)}
                      {Array.from({ length: daysInM }, (_, i) => {
                        const day = i + 1;
                        const ds = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                        const isDone = doneSet.has(ds);
                        const isT = ds === today.toLocaleDateString('en-CA');
                        return <div key={day} className={`aspect-square rounded-md flex items-center justify-center text-[10px] font-medium ${isDone ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-400'} ${isT ? 'ring-2 ring-indigo-500 ring-inset' : ''}`}>{day}</div>;
                      })}
                    </div>
                    <div className="flex items-center gap-2 mt-3 text-[10px] text-gray-400">
                      <span className="w-3 h-3 rounded-sm bg-gray-100" /><span>未打卡</span>
                      <span className="w-3 h-3 rounded-sm bg-green-500" /><span>已打卡</span>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        );
      })()}

      {/* Prompt Modal */}
      {promptData && (
        <PromptModal title={promptData.title} value={promptData.value} confirmLabel="确定"
          onConfirm={async (val) => {
            if (promptData.mode === 'addCustom') {
              if (!val.trim()) return;
              const items = [...(habit?.custom_items || [])];
              items.push({ label: val.trim(), checked: false });
              if (habit) { const r = await api.updateHabit(habit.id, { custom_items: items }); setHabit(r); }
            } else if (promptData.mode === 'renameCustom') {
              const oldLabel = promptData.value || val;
              const items = [...(habit?.custom_items || [])];
              const idx = items.findIndex(ci => ci.label === oldLabel);
              if (idx >= 0) items[idx] = { ...items[idx], label: val };
              if (habit) { const r = await api.updateHabit(habit.id, { custom_items: items }); setHabit(r); }
            } else if (promptData.mode === 'renameDefault') {
              const key = promptData.value ? (() => {
                const renamed = getRenamedLabels();
                return Object.entries(renamed).find(([, v]) => v === promptData.value)?.[0];
              })() : null;
              if (key) { const renamed = getRenamedLabels(); renamed[key] = val; localStorage.setItem(RENAME_STORAGE_KEY, JSON.stringify(renamed)); }
              else { const renamed = getRenamedLabels(); renamed[DEFAULT_HABITS.find((_, i) => getVisibleItems(habit!)[i]?.id)?.key || ''] = val; localStorage.setItem(RENAME_STORAGE_KEY, JSON.stringify(renamed)); }
              loadHabitByDate(selectedDate);
            } else if (promptData.mode === 'addDate') {
              if (!/^\d{4}-\d{2}-\d{2}$/.test(val)) { alert('日期格式错误，请使用 YYYY-MM-DD'); return; }
              try { await api.createHabit(val); setHistoryLoading(true); const data = await api.getHabitHistory(90); setHistory(data); if (val === selectedDate) await loadHabitByDate(selectedDate); setToast('✅ 创建成功！'); } catch (err: any) { setToast('❌ ' + err.message); } finally { setHistoryLoading(false); }
            }
            setPromptData(null);
          }}
          onCancel={() => setPromptData(null)}
        />
      )}

      {/* Confirm Modal */}
      {confirmData && (
        <ConfirmModal message={confirmData.message} onConfirm={confirmData.onConfirm} onCancel={() => setConfirmData(null)} />
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[999999] bg-gray-800 text-white px-4 py-2 rounded-xl text-sm shadow-lg">
          {toast}
        </div>
      )}

      {/* Bottom bar */}
      <div className="md:hidden fixed bottom-14 left-0 right-0 z-40 flex items-center justify-start gap-2 px-4 py-1.5 bg-white/90 dark:bg-gray-900/90 backdrop-blur-lg border-t border-gray-100/80 dark:border-gray-700/80">
        <button onClick={() => loadHabitByDate(selectedDate)} className="text-[10px] bg-gray-100 hover:bg-gray-200 rounded-md px-2 py-0.5 text-gray-500 font-medium transition-colors">🔄 刷新</button>
      </div>
    </div>
  );
}
