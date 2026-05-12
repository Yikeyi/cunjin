import { useState, useEffect, Component, ReactNode } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import HabitTable from './components/HabitTable';
import GoalTable from './components/GoalTable';
import CalendarView from './components/CalendarView';
import Dashboard from './components/Dashboard';
import { initAppDatabase } from './api';
import TemplatePicker from './components/TemplatePicker';
import { isFirstLaunch, storeTemplateId, Template } from './data/templates';

// Apply saved theme
const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'dark') document.documentElement.classList.add('dark');
else document.documentElement.classList.remove('dark');

// Register daily notification reminder (native only)
async function registerDailyReminder() {
  try {
    const { Capacitor } = await import('@capacitor/core');
    if (!Capacitor.isNativePlatform()) return;
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    const perm = await LocalNotifications.checkPermissions();
    if (perm.display === 'prompt' || perm.display === 'prompt-with-rationale') {
      await LocalNotifications.requestPermissions();
    }
    await LocalNotifications.cancel({ notifications: [{ id: 1 }] });
    const savedTime = localStorage.getItem('reminder_time') || '20:00';
    const [hour, minute] = savedTime.split(':').map(Number);
    await LocalNotifications.schedule({
      notifications: [{
        id: 1,
        title: '寸进 · 今日打卡',
        body: '今天前进了一寸吗？来看看今天的进度吧 🌱',
        schedule: { repeats: true, on: { hour, minute } },
        iconColor: '#6366f1',
      }],
    });
  } catch {}
}

// Global error handler
window.addEventListener('error', (e) => {
  try { localStorage.setItem('app_crash_log', JSON.stringify({message: e.message, stack: e.error?.stack, time: new Date().toISOString()})); } catch {}
});
window.addEventListener('unhandledrejection', (e) => {
  try { localStorage.setItem('app_crash_log', JSON.stringify({message: e.reason?.message || String(e.reason), stack: e.reason?.stack, time: new Date().toISOString()})); } catch {}
});

class ErrorBoundary extends Component<{children: ReactNode}, {error: string}> {
  constructor(props: {children: ReactNode}) {
    super(props);
    this.state = { error: '' };
  }
  static getDerivedStateFromError(error: Error) {
    return { error: error.message + '\n\n' + (error.stack || '') };
  }
  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="card max-w-lg w-full">
            <h2 className="text-lg font-semibold text-red-600 mb-2">出错了</h2>
            <pre className="text-xs text-gray-600 bg-gray-100 p-3 rounded-lg overflow-auto max-h-80 whitespace-pre-wrap">{this.state.error}</pre>
            <button onClick={() => this.setState({ error: '' })} className="btn-primary mt-4">重试</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [initDetail, setInitDetail] = useState('准备启动...');
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);

  async function handleTemplateSelect(template: Template) {
    storeTemplateId(template.id);
    setShowTemplatePicker(false);
    try {
      const { api } = await import('./api');
      const today = new Date().toLocaleDateString('en-CA');
      const habit = await api.getHabitByDate(today);
      if (!habit) {
        await api.createHabit(today);
      }
    } catch {}
  }

  useEffect(() => {
    setInitDetail('正在加载数据库...');
    initAppDatabase()
      .then(async () => {
        setInitDetail('就绪');
        await registerDailyReminder();
        setReady(true);
      })
      .catch((err) => {
        const msg = err?.message || String(err) || '数据库初始化失败';
        setError(msg + (err?.stack ? '\n\n' + err.stack : ''));
      });
  }, []);

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="card max-w-lg w-full">
          <h2 className="text-lg font-semibold text-red-600 mb-2">启动失败</h2>
          <pre className="text-xs text-gray-600 bg-gray-100 p-3 rounded-lg overflow-auto max-h-80 whitespace-pre-wrap">{error}</pre>
          <p className="text-xs text-gray-400 mt-4">请截图此信息。</p>
        </div>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 to-indigo-800 flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 bg-white/15 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg">
            <svg viewBox="0 0 32 32" className="w-10 h-10 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="6" y1="9" x2="20" y2="9"/>
              <path d="M 13 9 L 13 22"/>
              <path d="M 13 22 Q 18 24 22 18"/>
              <line x1="6" y1="14" x2="10" y2="14"/>
              <path d="M 24 20 A 6 6 0 1 1 26 16" strokeOpacity="0.5"/>
              <path d="M 25 15 L 27 13 L 24 14"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">寸进</h1>
          <p className="text-indigo-200 text-sm mb-6">日积跬步，以至千里</p>
          <div className="flex justify-center mb-3">
            <div className="w-7 h-7 border-[3px] border-white/30 border-t-white rounded-full animate-spin" />
          </div>
          <p className="text-indigo-300 text-xs">{initDetail}</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <HashRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Navigate to="/habits" replace />} />
            <Route path="/habits" element={<HabitTable />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/goals" element={<GoalTable />} />
            <Route path="/calendar" element={<CalendarView />} />
          </Routes>
        </Layout>
      </HashRouter>
      {showTemplatePicker && <TemplatePicker onSelect={handleTemplateSelect} onCancel={() => setShowTemplatePicker(false)} />}
    </ErrorBoundary>
  );
}

export default App;
