import { exportAllAppData, importAllAppData } from '../api';
import { Filesystem, Directory } from '@capacitor/filesystem';

export async function exportAllDataToFile(): Promise<void> {
  const isCapacitor = !!(window as any).Capacitor?.isNativePlatform();
  try {
    const data = exportAllAppData();
    const json = JSON.stringify(data, null, 2);
    if (isCapacitor) {
      const base64 = btoa(unescape(encodeURIComponent(json)));
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      await Filesystem.writeFile({ path: `habit-tracker-backup-${timestamp}.json`, data: base64, directory: Directory.Documents });
      alert(`✅ 数据已导出到 Documents/habit-tracker-backup-${timestamp}.json`);
    } else {
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `habit-tracker-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      alert('✅ 数据导出完成');
    }
  } catch (err: any) {
    alert('❌ 导出失败: ' + (err.message || String(err)));
  }
}

export async function importDataFromFile(skipConfirm?: boolean, filename?: string): Promise<void> {
  const isCapacitor = !!(window as any).Capacitor?.isNativePlatform();
  if (!skipConfirm && !confirm('⚠️ 导入数据将替换当前所有数据！确定继续吗？')) return;

  try {
    let data: any;

    if (isCapacitor && filename?.trim()) {
      try {
        const cleanName = filename.trim().split('/').pop() || filename.trim();
        const result = await Filesystem.readFile({ path: cleanName, directory: Directory.Documents });
        const json = decodeURIComponent(escape(atob(result.data as string)));
        data = JSON.parse(json);
      } catch { data = null; }
    }

    if (!data) {
      const text = await new Promise<string>((resolve, reject) => {
        const input = document.createElement('input');
        input.type = 'file'; input.accept = '.json';
        input.onchange = () => {
          const file = input.files?.[0];
          if (!file) { reject(new Error('未选择文件')); return; }
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string || '');
          reader.onerror = () => reject(new Error('读取文件失败'));
          reader.readAsText(file);
        };
        input.click();
      });
      data = JSON.parse(text);
    }

    importAllAppData(data);
    alert('✅ 数据导入成功！请刷新页面查看。');
    window.location.reload();
  } catch (err: any) {
    alert('❌ 导入失败: ' + (err.message || String(err)));
  }
}
