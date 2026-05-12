import { useState } from 'react';
import { createPortal } from 'react-dom';

interface CalendarPickerProps {
  value: string;
  onConfirm: (val: string) => void;
  onCancel: () => void;
}

export default function CalendarPicker({ value, onConfirm, onCancel }: CalendarPickerProps) {
  const today = value ? new Date(value + 'T00:00:00') : new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selected, setSelected] = useState(value);

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

  function selectDate(day: number) {
    const ds = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setSelected(ds);
  }

  return createPortal(
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[99999]" onClick={onCancel}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xs mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-5 pt-5 pb-4">
          <div className="flex items-center justify-between mb-2">
            <button onClick={() => { if (month === 0) { setYear(y => y - 1); setMonth(11); } else setMonth(m => m - 1); }} className="text-white/70 hover:text-white">◀</button>
            <span className="text-white font-bold">{year}年{month + 1}月</span>
            <button onClick={() => { if (month === 11) { setYear(y => y + 1); setMonth(0); } else setMonth(m => m + 1); }} className="text-white/70 hover:text-white">▶</button>
          </div>
          <div className="text-white/70 text-xs">{selected || value || '请选择日期'}</div>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-7 gap-1 mb-1">
            {weekDays.map(d => <div key={d} className="text-center text-[10px] font-semibold text-gray-400 py-1">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const day = i + 1;
              const ds = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const isSel = ds === selected;
              const isT = ds === new Date().toLocaleDateString('en-CA');
              return (
                <button key={day} onClick={() => selectDate(day)}
                  className={`aspect-square rounded-lg text-sm font-medium transition-colors ${isSel ? 'bg-indigo-600 text-white' : isT ? 'bg-indigo-50 text-indigo-600' : 'text-gray-700 hover:bg-gray-100'}`}>
                  {day}
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex gap-3 px-4 pb-4">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-600 text-sm font-medium">取消</button>
          <button onClick={() => onConfirm(selected || value)} className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium">确认</button>
        </div>
      </div>
    </div>,
    document.body
  );
}
