import { useState } from 'react';
import { createPortal } from 'react-dom';

interface TimePickerModalProps {
  value?: string;
  onConfirm: (time: string) => void;
  onCancel: () => void;
}

export default function TimePickerModal({ value, onConfirm, onCancel }: TimePickerModalProps) {
  const [hours, setHours] = useState(value ? parseInt(value.split(':')[0]) : 9);
  const [minutes, setMinutes] = useState(value ? parseInt(value.split(':')[1]) : 0);

  const hoursList = Array.from({ length: 24 }, (_, i) => i);
  const minutesList = [0, 15, 30, 45];

  return createPortal(
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[999999]" onClick={onCancel}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xs mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-5 pt-5 pb-4">
          <div className="text-indigo-200 text-xs font-medium mb-1">选择时间</div>
          <div className="text-white text-lg font-bold">{String(hours).padStart(2, '0')}:{String(minutes).padStart(2, '0')}</div>
        </div>
        <div className="flex gap-4 px-5 py-4">
          <div className="flex-1">
            <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2 text-center">时</div>
            <div className="max-h-40 overflow-y-auto space-y-1 scrollbar-thin">
              {hoursList.map(h => (
                <button key={h} onClick={() => setHours(h)}
                  className={`w-full text-center py-1.5 rounded-lg text-sm transition-colors ${hours === h ? 'bg-indigo-100 text-indigo-700 font-medium' : 'text-gray-600 hover:bg-gray-100'}`}>
                  {String(h).padStart(2, '0')}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1">
            <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2 text-center">分</div>
            <div className="max-h-40 overflow-y-auto space-y-1 scrollbar-thin">
              {minutesList.map(m => (
                <button key={m} onClick={() => setMinutes(m)}
                  className={`w-full text-center py-1.5 rounded-lg text-sm transition-colors ${minutes === m ? 'bg-indigo-100 text-indigo-700 font-medium' : 'text-gray-600 hover:bg-gray-100'}`}>
                  {String(m).padStart(2, '0')}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-3 px-5 pb-5">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-600 text-sm font-medium">取消</button>
          <button onClick={() => onConfirm(`${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`)}
            className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium">确认</button>
        </div>
      </div>
    </div>,
    document.body
  );
}
