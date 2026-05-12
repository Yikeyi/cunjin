import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';

let db: SqlJsDatabase | null = null;
const DB_KEY = 'sqljs_db';

interface ExportData {
  version: number;
  exported_at: string;
  habits: any[];
  goals: any[];
  sub_goals: any[];
  events: any[];
}

export async function initDatabase(): Promise<void> {
  const SQL = await initSqlJs({
    locateFile: (file: string) => {
      // sql.js WASM is in public/ → copied to dist/ at build
      // On Vercel it's at /sql-wasm.wasm
      // The base path varies by deployment, so return a relative path
      return `/sql-wasm.wasm`;
    },
  });

  // Try loading existing DB from localStorage
  const savedData = localStorage.getItem(DB_KEY);
  if (savedData) {
    try {
      const binary = atob(savedData);
      const buffer = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) buffer[i] = binary.charCodeAt(i);
      db = new SQL.Database(buffer);
    } catch (e) {
      console.error('Failed to load DB, creating new:', e);
      db = new SQL.Database();
    }
  } else {
    db = new SQL.Database();
  }

  // Enable WAL-like mode and ensure schema
  db.run('PRAGMA journal_mode=OFF');
  db.run('PRAGMA page_size=4096');

  // Create tables
  db.run(`CREATE TABLE IF NOT EXISTS habits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT UNIQUE NOT NULL,
    early_sleep INTEGER DEFAULT 0,
    exercise INTEGER DEFAULT 0,
    study INTEGER DEFAULT 0,
    hobby INTEGER DEFAULT 0,
    healthy_diet INTEGER DEFAULT 0,
    completed_count INTEGER DEFAULT 0,
    completion_rate REAL DEFAULT 0,
    summary TEXT DEFAULT '',
    custom_items TEXT DEFAULT '[]',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS goals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    type TEXT DEFAULT '学习',
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    progress INTEGER DEFAULT 0,
    satisfaction INTEGER DEFAULT 0,
    summary TEXT DEFAULT '',
    color TEXT DEFAULT '#6366f1',
    linked_habit_key TEXT,
    archived INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS sub_goals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    goal_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    completed INTEGER DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE CASCADE
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    goal_id INTEGER,
    date TEXT NOT NULL,
    title TEXT NOT NULL,
    type TEXT DEFAULT 'event',
    color TEXT DEFAULT '#6366f1',
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE SET NULL
  )`);

  persistDb();
}

function getDb(): SqlJsDatabase {
  if (!db) throw new Error('Database not initialized');
  return db;
}

function persistDb(): void {
  if (!db) return;
  try {
    const data = db.export();
    const binary = new Uint8Array(data);
    let binaryString = '';
    for (let i = 0; i < binary.length; i++) binaryString += String.fromCharCode(binary[i]);
    localStorage.setItem(DB_KEY, btoa(binaryString));
  } catch (e) {
    console.error('Failed to persist DB:', e);
  }
}

function rowsToObjects<T>(result: { columns: string[]; values: any[][] }): T[] {
  return (result.values || []).map((row) => {
    const obj: any = {};
    result.columns.forEach((col, i) => { obj[col] = row[i]; });
    return obj as T;
  });
}

function rowToObject<T>(result: { columns: string[]; values: any[][] }): T | null {
  if (!result.values || result.values.length === 0) return null;
  const obj: any = {};
  result.columns.forEach((col, i) => { obj[col] = result.values[0][i]; });
  return obj as T;
}

export function exportAllData(): ExportData {
  const d = getDb();
  function dumpTable(table: string): any[] {
    const r = d.exec(`SELECT * FROM ${table} ORDER BY id`);
    if (r.length === 0) return [];
    return rowsToObjects<any>(r[0]);
  }
  return {
    version: 1,
    exported_at: new Date().toISOString(),
    habits: dumpTable('habits'),
    goals: dumpTable('goals'),
    sub_goals: dumpTable('sub_goals'),
    events: dumpTable('events'),
  };
}

export function importAllData(data: ExportData): void {
  const d = getDb();
  const ver = data.version || 0;
  if (ver < 0) throw new Error('不兼容的数据文件版本');

  d.run('DELETE FROM sub_goals');
  d.run('DELETE FROM events');
  d.run('DELETE FROM goals');
  d.run('DELETE FROM habits');

  if (Array.isArray(data.habits)) {
    for (const h of data.habits) {
      const customItems = typeof h.custom_items === 'string' ? h.custom_items : JSON.stringify(h.custom_items || []);
      d.run('INSERT INTO habits (id,date,early_sleep,exercise,study,hobby,healthy_diet,completed_count,completion_rate,summary,custom_items) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
        [h.id, h.date, h.early_sleep || 0, h.exercise || 0, h.study || 0, h.hobby || 0, h.healthy_diet || 0, h.completed_count || 0, h.completion_rate || 0, h.summary || '', customItems]);
    }
  }
  if (Array.isArray(data.goals)) {
    for (const g of data.goals) {
      d.run('INSERT INTO goals (id,title,type,start_date,end_date,progress,satisfaction,summary,color,linked_habit_key,archived) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
        [g.id, g.title, g.type || '学习', g.start_date, g.end_date, g.progress || 0, g.satisfaction || 0, g.summary || '', g.color || '#6366f1', g.linked_habit_key || null, g.archived || 0]);
    }
  }
  if (Array.isArray(data.sub_goals)) {
    for (const s of data.sub_goals) {
      d.run('INSERT INTO sub_goals (id,goal_id,title,completed,sort_order) VALUES (?,?,?,?,?)',
        [s.id, s.goal_id, s.title, s.completed || 0, s.sort_order || 0]);
    }
  }
  if (Array.isArray(data.events)) {
    for (const e of data.events) {
      d.run('INSERT INTO events (id,goal_id,date,title,type,color) VALUES (?,?,?,?,?,?)',
        [e.id, e.goal_id, e.date, e.title, e.type || 'event', e.color || '#6366f1']);
    }
  }
  persistDb();
}

export { getDb, persistDb, rowsToObjects, rowToObject };
export type { ExportData };
