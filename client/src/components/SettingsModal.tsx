import { useState } from 'react';
import { createPortal } from 'react-dom';
import TimePickerModal from './TimePickerModal';
import { exportAllDataToFile, importDataFromFile } from '../utils/data-transfer';

interface SettingsModalProps {
  reminderTime: string;
  darkMode: boolean;
  onSetReminderTime: (val: string) => void;
  onToggleTheme: () => void;
  onClose: () => void;
}

export default function SettingsModal({ reminderTime, darkMode, onSetReminderTime, onToggleTheme, onClose }: SettingsModalProps) {
  const [showTimePicker, setShowTimePicker] = useState(false);

  function handleToggleTheme() {
    const next = !darkMode;
    localStorage.setItem('theme', next ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', next);
    onToggleTheme();
  }

  return (
    <>
      {createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[99999]" onClick={onClose}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-5">
              <h2 className="text-white text-lg font-bold">⚙️ 设置</h2>
              <p className="text-indigo-200 text-xs mt-1">通知 · 主题 · 数据</p>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <span className="text-lg">{darkMode ? '🌙' : '☀️'}</span>
                  <div><p className="text-sm font-medium text-gray-800">深色模式</p></div>
                </div>
                <button onClick={handleToggleTheme}
                  className={`w-11 h-6 rounded-full transition-colors relative ${darkMode ? 'bg-indigo-600' : 'bg-gray-300'}`}>
                  <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-all ${darkMode ? 'left-5' : 'left-0.5'}`} />
                </button>
              </div>
              <div className="border-t border-gray-100" />
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <span className="text-lg">⏰</span>
                  <div><p className="text-sm font-medium text-gray-800">每日提醒</p><p className="text-[11px] text-gray-400">每天 {reminderTime}</p></div>
                </div>
                <button onClick={() => setShowTimePicker(true)} className="text-sm bg-gray-100 hover:bg-gray-200 rounded-lg px-3 py-1.5 text-gray-700 font-medium">{reminderTime}</button>
              </div>
              <div className="border-t border-gray-100" />
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-2 uppercase">数据</p>
                <div className="flex gap-2">
                  <button onClick={() => importDataFromFile(true)} className="flex-1 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium">📥 导入</button>
                  <button onClick={() => exportAllDataToFile()} className="flex-1 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium">📤 导出</button>
                </div>
              </div>
            </div>
            <div className="px-5 pb-5">
              <button onClick={onClose} className="w-full py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700">关闭</button>
            </div>
          </div>
        </div>,
        document.body
      )}
      {showTimePicker && createPortal(<TimePickerModal value={reminderTime} onConfirm={(val) => { onSetReminderTime(val); setShowTimePicker(false); }} onCancel={() => setShowTimePicker(false)} />, document.body)}
    </>
  );
}
