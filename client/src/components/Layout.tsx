import { ReactNode, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import SettingsModal from './SettingsModal';

const navItems = [
  { path: '/habits', label: '寸进', icon: '✅', exact: false },
  { path: '/dashboard', label: '行远', icon: '📊', exact: true },
  { path: '/goals', label: '千里', icon: '🎯', exact: false },
  { path: '/calendar', label: '逐日', icon: '📅', exact: false },
];

interface LayoutProps { children: ReactNode; }

export default function Layout({ children }: LayoutProps) {
  const [showSettings, setShowSettings] = useState(false);
  const location = useLocation();
  const isHabitsPage = location.pathname === '/habits';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col md:flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:flex-col w-60 bg-white dark:bg-gray-800 border-r border-gray-100 dark:border-gray-700 shrink-0">
        <div className="px-6 pt-6 pb-5">
          <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-xl flex items-center justify-center text-white mb-3 shadow-sm">
            <svg viewBox="0 0 32 32" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="6" y1="9" x2="20" y2="9"/>
              <path d="M 13 9 L 13 22"/>
              <path d="M 13 22 Q 18 24 22 18"/>
              <line x1="6" y1="14" x2="10" y2="14"/>
              <path d="M 24 20 A 6 6 0 1 1 26 16" strokeOpacity="0.5"/>
              <path d="M 25 15 L 27 13 L 24 14"/>
            </svg>
          </div>
          <h1 className="text-base font-bold text-gray-800 dark:text-gray-100">寸进</h1>
          <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5 tracking-wide">日积跬步，以至千里</p>
        </div>
        <nav className="flex-1 px-3 space-y-0.5">
          {navItems.map((item) => (
            <NavLink key={item.path} to={item.path} end={item.exact}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-indigo-50 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-200'
                }`
              }>
              <span className="text-lg leading-none">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        {/* Settings */}
        <div className="px-6 py-3 border-t border-gray-50 dark:border-gray-700">
          <button onClick={() => setShowSettings(true)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-200 transition-all">
            <span className="text-lg leading-none">⚙️</span>
            <span>设置</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-auto pb-28 md:pb-0">
        <div className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/90 dark:bg-gray-900/90 backdrop-blur-lg border-t border-gray-100/80 dark:border-gray-700/80">
        <div className="flex items-center justify-around h-14">
          {navItems.map((item) => (
            <NavLink key={item.path} to={item.path} end={item.exact}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-0.5 min-w-0 flex-1 h-full relative ${
                  isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400 dark:text-gray-500'
                }`
              }>
              {({ isActive }) => (
                <>
                  {isActive && <span className="absolute -top-px left-1/4 right-1/4 h-0.5 bg-indigo-500 rounded-full" />}
                  <span className={`text-xl leading-none ${isActive ? '' : 'opacity-60'}`}>{item.icon}</span>
                  <span className="text-[10px] font-medium tracking-tight">{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </div>

      {/* Settings FAB */}
      <button onClick={() => setShowSettings(true)}
        className="md:hidden fixed bottom-16 right-4 z-[99999] text-[10px] bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md px-2 py-0.5 text-gray-500 dark:text-gray-400 font-medium transition-colors">
        ⚙️
      </button>

      {/* Settings Modal */}
      {showSettings && (
        <SettingsModal
          onClose={() => setShowSettings(false)}
          darkMode={localStorage.getItem('theme') === 'dark'}
          onToggleTheme={() => {}}
          reminderTime={localStorage.getItem('reminder_time') || '20:00'}
          onSetReminderTime={(val) => localStorage.setItem('reminder_time', val)}
        />
      )}
    </div>
  );
}
