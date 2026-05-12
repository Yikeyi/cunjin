interface CalendarChartProps {
  data: { date: string; count: number }[];
}

export default function CalendarChart({ data }: CalendarChartProps) {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

  const countMap = new Map(data.map(d => [d.date, d.count]));
  const maxCount = Math.max(...data.map(d => d.count), 1);

  function getColor(count: number): string {
    if (count === 0) return 'bg-gray-100';
    const ratio = count / maxCount;
    if (ratio >= 0.8) return 'bg-green-600';
    if (ratio >= 0.5) return 'bg-green-500';
    if (ratio >= 0.2) return 'bg-green-400';
    return 'bg-green-200';
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100/80 p-4">
      <p className="text-xs font-semibold text-gray-500 mb-2">{year}年{month + 1}月</p>
      <div className="grid grid-cols-7 gap-px">
        {weekDays.map(d => <div key={d} className="text-center text-[9px] font-semibold text-gray-400 py-0.5">{d}</div>)}
        {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1;
          const ds = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const count = countMap.get(ds) || 0;
          const isT = ds === today.toLocaleDateString('en-CA');
          return (
            <div key={day} title={`${ds}: ${count}`}
              className={`h-6 rounded-sm flex items-center justify-center text-[8px] font-medium ${getColor(count)} ${isT ? 'ring-2 ring-indigo-500 ring-inset' : ''}`}>
              {day}
            </div>
          );
        })}
      </div>
    </div>
  );
}
