import { useEffect, useState, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { api, Goal } from '../api';
import { exportAllDataToFile, importDataFromFile } from '../utils/data-transfer';
import ConfirmModal from './ConfirmModal';
import PromptModal from './PromptModal';

export default function CalendarView() {
  const [events, setEvents] = useState<any[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmAction, setConfirmAction] = useState<{ message: string; onConfirm: () => void } | null>(null);
  const [importFilename, setImportFilename] = useState<string | null>(null);
  const calendarRef = useRef<FullCalendar>(null);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      setLoading(true);
      const gs = await api.getGoals();
      setGoals(gs);
      const evts: any[] = [];
      const activeGoals = gs.filter((g: Goal) => !g.archived);
      for (const g of activeGoals) {
        const colors: Record<string, string> = {
          '学习': '#3b82f6', '健康': '#10b981', '工作': '#8b5cf6', '兴趣': '#f59e0b',
        };
        const color = g.color || colors[g.type] || '#6366f1';
        evts.push({
          id: `goal-${g.id}`,
          title: g.title,
          start: g.start_date,
          end: (() => { const d = new Date(g.end_date + 'T00:00:00'); d.setDate(d.getDate() + 1); return d.toLocaleDateString('en-CA'); })(),
          backgroundColor: color,
          borderColor: color,
          textColor: '#fff',
          display: 'block',
          extendedProps: { type: 'goal', goalId: g.id, progress: g.progress },
        });
      }
      setEvents(evts);
    } catch {} finally { setLoading(false); }
  }

  const typeColorClass = (type: string) => {
    const map: Record<string, string> = { '学习': 'bg-blue-100 text-blue-800', '健康': 'bg-green-100 text-green-800', '工作': 'bg-purple-100 text-purple-800', '兴趣': 'bg-orange-100 text-orange-800' };
    return map[type] || 'bg-gray-100 text-gray-800';
  };

  function handleEventClick(info: any) {
    const g = goals.find((x: any) => x.id === info.event.extendedProps.goalId);
    if (!g) return;
    setConfirmAction({
      message: `${g.title} (${g.type})`,
      onConfirm: () => setConfirmAction(null),
    });
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-900">📅 日积跬步</h2>
        <div className="flex gap-2">
          <button onClick={() => {
            const isCap = !!(window as any).Capacitor?.isNativePlatform();
            if (isCap) { setImportFilename(''); }
            else { setConfirmAction({ message: '⚠️ 导入数据将替换当前所有数据！确定继续吗？', onConfirm: () => { setConfirmAction(null); importDataFromFile(true); } }); }
          }} className="btn-secondary text-xs">📥 导入</button>
          <button onClick={() => exportAllDataToFile()} className="btn-primary text-xs">📤 导出</button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100/80 overflow-hidden">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          locale="zh-cn"
          headerToolbar={{
            left: 'title',
            center: '',
            right: 'dayGridMonth,timeGridWeek today prev,next',
          }}
          buttonText={{ today: '今天', month: '月', week: '周' }}
          events={events}
          eventClick={handleEventClick}
          height="auto"
          contentHeight="auto"
          firstDay={1}
          dayMaxEvents={3}
        />
      </div>

      {/* Quick stats */}
      <div className="flex flex-wrap gap-3 mt-4">
        {goals.filter(g => !g.archived).map(g => (
          <div key={g.id} className="flex items-center gap-2 text-xs bg-white rounded-lg px-3 py-2 border border-gray-100 shadow-sm">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: g.color || '#6366f1' }} />
            <span className="text-gray-700">{g.title}</span>
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${typeColorClass(g.type)}`}>{g.type}</span>
          </div>
        ))}
      </div>

      {/* Confirm Modal */}
      {confirmAction && (
        <ConfirmModal message={confirmAction.message} onConfirm={confirmAction.onConfirm} onCancel={() => setConfirmAction(null)} />
      )}

      {/* Import Filename Modal */}
      {importFilename !== null && (
        <PromptModal
          title="导入备份"
          placeholder="输入备份文件名"
          confirmLabel="导入"
          value=""
          zIndex="999999"
          onConfirm={(val) => {
            setImportFilename(null);
            importDataFromFile(true, val);
          }}
          onCancel={() => setImportFilename(null)}
        />
      )}

      {/* Bottom bar */}
      <div className="md:hidden fixed bottom-14 left-0 right-0 z-40 flex items-center justify-start gap-2 px-4 py-1.5 bg-white/90 dark:bg-gray-900/90 backdrop-blur-lg border-t border-gray-100/80 dark:border-gray-700/80">
        <button onClick={loadData} className="text-[10px] bg-gray-100 hover:bg-gray-200 rounded-md px-2 py-0.5 text-gray-500 font-medium transition-colors">🔄 刷新</button>
      </div>
    </div>
  );
}
