import * as XLSX from 'xlsx';

export async function exportWorkbook(wb: XLSX.WorkBook, filename: string) {
  const isCapacitor = !!(window as any).Capacitor?.isNativePlatform();
  if (isCapacitor) {
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });
    // Filesystem import for Capacitor - handled by dynamic import in caller
    const { Filesystem, Directory } = await import('@capacitor/filesystem');
    Filesystem.writeFile({ path: filename, data: wbout, directory: Directory.Documents });
    alert(`✅ 已导出到 Documents/${filename}`);
  } else {
    XLSX.writeFile(wb, filename);
  }
}
