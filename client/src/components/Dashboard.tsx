import { useEffect, useState, useMemo } from 'react';
import { api, DashboardStats } from '../api';
import CalendarChart from './CalendarChart';

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [goals, setGoals] = useState<any[]>([]);

  useEffect(() => { loadDashboard(); }, []);

  async function loadDashboard() {
    try {
      setLoading(true);
      const data = await api.getDashboard();
      setStats(data);
      const goalData = await api.getGoals();
      const allHabits = await api.getHabitHistory(365);
      const habitMap = new Map<string, any>();
      for (const h of allHabits) habitMap.set(h.date, h);
      setGoals(goalData.filter((g: any) => g.linked_habit_key).map((g: any) => {
        const start = new Date(g.start_date + 'T00:00:00');
        const end = new Date(g.end_date + 'T00:00:00');
        let done = 0, total = 0;
        const cursor = new Date(start);
        while (cursor <= end) {
          total++;
          const ds = cursor.toLocaleDateString('en-CA');
          const day = habitMap.get(ds);
          if (day) {
            const items = (day.custom_items || []);
            const isDone = (day as any)[g.linked_habit_key] === true || items.some((ci: any) => !ci.label.startsWith('__') && ci.label === g.linked_habit_key && ci.checked);
            if (isDone) done++;
          }
          cursor.setDate(cursor.getDate() + 1);
        }
        return { id: g.id, title: g.title, type: g.type, linkedHabit: g.linked_habit_key, progress: g.progress, habitRate: total > 0 ? Math.round(done / total * 100) : 0, habitDone: done, habitTotal: total };
      }));
    } catch (err: any) { setError(err.message); } finally { setLoading(false); }
  }

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full" /></div>;
  if (error) return <div className="card text-center py-12"><p className="text-red-500">加载失败</p></div>;
  if (!stats) return null;

  const today = new Date().toLocaleDateString('en-CA');

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold text-gray-900">📊 行远自迩</h2>
        <button onClick={() => {
          const emoji = stats.currentStreak >= 7 ? '🔥' : stats.currentStreak >= 3 ? '⭐' : '🌱';
          const motto = stats.currentStreak >= 7 ? '一周千里！' : stats.currentStreak >= 3 ? '三连寸！' : '每天进步一寸';
          const card = `┌──────────────────────────┐\n│      📊 寸进周报           │\n│  第 ${String(Math.ceil((new Date().getTime() - new Date(new Date().getFullYear(), 0, 1).getTime()) / 604800000)).padEnd(3)} 周              │\n├──────────────────────────┤\n│ ${emoji} 本周寸进  ${String(stats.weekInches).padEnd(10)}   │\n│ 📅 今日寸进  ${String(stats.todayInches).padEnd(10)}   │\n│ 📦 累计总寸  ${String(stats.totalInches).padEnd(10)}   │\n│ 🔥 连续打卡  ${String(stats.currentStreak).padEnd(10)}   │\n│ 🏆 最长记录  ${String(stats.longestStreak).padEnd(10)}   │\n│ 🎯 完成目标  ${String(stats.totalGoals).padEnd(10)}   │\n│ ✅ 完成率    ${String(Math.round(stats.avgCompletionRate)).padEnd(7)}%   │\n├──────────────────────────┤\n│   ${motto}         │\n│  日积跬步，以至千里       │\n│  —— 寸进 · v2.0          │\n└──────────────────────────┘`;
          try { (navigator as any).clipboard.writeText(card).then(() => alert('✅ 周报已复制到剪贴板')); } catch { alert(card); }
        }} className="btn-secondary text-xs">📋 保存周报</button>
      </div>

      <div className="mb-5"><CalendarChart data={stats.dailyTrend.map(d => ({ date: d.date, count: d.completed_count }))} /></div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100/80 p-4">
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">今日寸进</p>
          <p className="text-2xl font-bold text-indigo-600">{stats.todayInches}<span className="text-sm text-gray-400 ml-1">寸</span></p>
          <p className="text-[11px] text-gray-400 mt-1">今天前进了 {stats.todayInches} 寸</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100/80 p-4">
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">本周寸进</p>
          <p className="text-2xl font-bold text-emerald-600">{stats.weekInches}<span className="text-sm text-gray-400 ml-1">寸</span></p>
          <p className="text-[11px] text-gray-400 mt-1">本周共 {stats.weekInches} 寸</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100/80 p-4">
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">累计总寸</p>
          <p className="text-2xl font-bold text-amber-600">{stats.totalInches}<span className="text-sm text-gray-400 ml-1">寸</span></p>
          <p className="text-[11px] text-gray-400 mt-1">日积跬步，以至千里</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100/80 p-4">
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">连续打卡{stats.currentStreak >= 3 && <span className="ml-1">{stats.currentStreak >= 30 ? '🏅' : stats.currentStreak >= 7 ? '🔥' : '⭐'}</span>}</p>
          <p className="text-2xl font-bold text-purple-600">{stats.currentStreak}<span className="text-sm text-gray-400 ml-1">天</span></p>
          <p className="text-[11px] text-gray-400 mt-1">{stats.currentStreak >= 30 ? '🏅 月满寸进！' : stats.currentStreak >= 7 ? '🔥 一周千里！' : stats.currentStreak >= 3 ? '⭐ 三连寸！' : stats.longestStreak > 0 ? `最长 ${stats.longestStreak} 天` : '开始打卡吧'}</p>
        </div>
      </div>

      {stats.totalInches > 0 && (
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-100/80 px-4 py-3 mb-4">
          <p className="text-sm text-indigo-700 font-medium">
            {stats.currentStreak >= 7 ? `🔥 本周前进了 ${stats.weekInches} 寸 · 连续打卡 ${stats.currentStreak} 天 · 完成 ${stats.totalGoals} 个目标` : stats.currentStreak >= 3 ? `⭐ 本周前进了 ${stats.weekInches} 寸 · 连续打卡 ${stats.currentStreak} 天` : `🌱 本周前进了 ${stats.weekInches} 寸 · 累计 ${stats.totalInches} 寸`}
          </p>
        </div>
      )}

      {/* Goal-Habit Association */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100/80 p-4 mb-5">
        <h3 className="text-sm font-semibold text-gray-800 mb-3">🌱 寸进看板</h3>
        {goals.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-gray-400">
            <span className="text-3xl mb-2">🔗</span>
            <span className="text-sm">暂无关联的习惯和目标</span>
          </div>
        ) : (
          <div className="space-y-3">
            {goals.map(g => {
              const isGood = g.habitRate >= 80;
              return (
                <div key={g.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-gray-200 transition-all">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 ${g.progress >= 100 ? 'bg-green-100' : g.habitRate >= 60 ? 'bg-indigo-50' : 'bg-red-50'}`}>
                    {g.progress >= 100 ? '🎉' : g.habitRate >= 60 ? '📎' : '💪'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-800 truncate">{g.title}</span>
                      <span className={`badge ${g.type === '学习' ? 'bg-blue-100 text-blue-800' : g.type === '健康' ? 'bg-green-100 text-green-800' : g.type === '工作' ? 'bg-purple-100 text-purple-800' : 'bg-orange-100 text-orange-800'} text-[10px]`}>{g.type}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[11px] text-indigo-600 font-medium">📎 {g.linkedHabit}</span>
                      <span className={`ml-1 text-[10px] font-medium ${isGood ? 'text-green-700 bg-green-50' : g.habitRate >= 40 ? 'text-yellow-700 bg-yellow-50' : 'text-red-700 bg-red-50'} px-1.5 py-0.5 rounded-full`}>{g.habitDone}/{g.habitTotal} 天 · {g.habitRate}%</span>
                    </div>
                    <div className="mt-1.5 w-full bg-gray-100 rounded-full h-1.5">
                      <div className={`h-1.5 rounded-full ${isGood ? 'bg-green-500' : g.habitRate >= 40 ? 'bg-yellow-500' : 'bg-red-400'}`} style={{ width: `${Math.min(g.habitRate, 100)}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom bar */}
      <div className="md:hidden fixed bottom-14 left-0 right-0 z-40 flex items-center justify-start gap-2 px-4 py-1.5 bg-white/90 dark:bg-gray-900/90 backdrop-blur-lg border-t border-gray-100/80 dark:border-gray-700/80">
        <button onClick={loadDashboard} className="text-[10px] bg-gray-100 hover:bg-gray-200 rounded-md px-2 py-0.5 text-gray-500 font-medium transition-colors">🔄 刷新</button>
      </div>
    </div>
  );
}
