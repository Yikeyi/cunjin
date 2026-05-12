import { getDb, persistDb, rowsToObjects, rowToObject } from './database';

export interface CustomHabitItem {
  label: string;
  checked: boolean;
  note?: string;
}

export interface Habit {
  id: number;
  date: string;
  early_sleep: number;
  exercise: number;
  study: number;
  hobby: number;
  healthy_diet: number;
  completed_count: number;
  completion_rate: number;
  summary: string;
  custom_items: CustomHabitItem[];
  created_at?: string;
  updated_at?: string;
}

function habitRowToHabit(row: any): Habit {
  return {
    ...row,
    early_sleep: row.early_sleep === 1 || row.early_sleep === true,
    exercise: row.exercise === 1 || row.exercise === true,
    study: row.study === 1 || row.study === true,
    hobby: row.hobby === 1 || row.hobby === true,
    healthy_diet: row.healthy_diet === 1 || row.healthy_diet === true,
    custom_items: typeof row.custom_items === 'string' ? JSON.parse(row.custom_items || '[]') : (row.custom_items || []),
  };
}

function calculateHabitStats(habit: { custom_items?: CustomHabitItem[] }) {
  const items = habit.custom_items || [];
  const visibleItems = items.filter(i => !i.label.startsWith('__'));
  const standardKeys = ['early_sleep', 'exercise', 'study', 'hobby', 'healthy_diet'];
  const defaults = standardKeys;
  const nonOverlapCustom = visibleItems.filter(i => !standardKeys.some(k => i.label === k));
  const totalItems = defaults.length + nonOverlapCustom.length;
  return { totalItems };
}

export function getAllHabits(): Habit[] {
  const d = getDb();
  const result = d.exec('SELECT * FROM habits ORDER BY date DESC');
  if (result.length === 0) return [];
  return rowsToObjects<any>(result[0]).map(habitRowToHabit);
}

export function getHabitByDate(date: string): Habit | null {
  const d = getDb();
  const result = d.exec('SELECT * FROM habits WHERE date = ?', [date]);
  if (result.length === 0 || !result[0].values || result[0].values.length === 0) return null;
  return habitRowToHabit(rowToObject<any>(result[0]));
}

export function createTodayHabit(date: string): Habit {
  const d = getDb();
  d.run('INSERT INTO habits (date, early_sleep, exercise, study, hobby, healthy_diet, completed_count, completion_rate, summary, custom_items) VALUES (?, 0, 0, 0, 0, 0, 0, 0, ?, ?)',
    [date, '', '[]']);
  persistDb();
  const result = d.exec('SELECT * FROM habits WHERE date = ?', [date]);
  return habitRowToHabit(rowToObject<any>(result[0]));
}

export function updateHabit(id: number, data: Partial<Habit>): Habit {
  const d = getDb();
  const habit = getHabitByDate('') || getHabitByDate(getAllHabits().find(h => h.id === id)?.date || '');
  const fields: string[] = [];
  const values: any[] = [];
  if (data.early_sleep !== undefined) { fields.push('early_sleep = ?'); values.push(data.early_sleep ? 1 : 0); }
  if (data.exercise !== undefined) { fields.push('exercise = ?'); values.push(data.exercise ? 1 : 0); }
  if (data.study !== undefined) { fields.push('study = ?'); values.push(data.study ? 1 : 0); }
  if (data.hobby !== undefined) { fields.push('hobby = ?'); values.push(data.hobby ? 1 : 0); }
  if (data.healthy_diet !== undefined) { fields.push('healthy_diet = ?'); values.push(data.healthy_diet ? 1 : 0); }
  if (data.summary !== undefined) { fields.push('summary = ?'); values.push(data.summary); }
  if (data.custom_items !== undefined) { fields.push('custom_items = ?'); values.push(JSON.stringify(data.custom_items)); }
  fields.push('updated_at = datetime(\'now\')');
  values.push(id);
  d.run(`UPDATE habits SET ${fields.join(', ')} WHERE id = ?`, values);
  persistDb();
  const result = d.exec('SELECT * FROM habits WHERE id = ?', [id]);
  return habitRowToHabit(rowToObject<any>(result[0]));
}

export function getTodayHabit(): Habit | null {
  const today = new Date().toLocaleDateString('en-CA');
  return getHabitByDate(today);
}

export function clearAllHabits(): void {
  const d = getDb();
  d.run('DELETE FROM habits');
  persistDb();
}

export function deleteHabit(id: number): boolean {
  const d = getDb();
  d.run('DELETE FROM habits WHERE id = ?', [id]);
  persistDb();
  return true;
}

export function getHabitsHistory(limit: number = 90): Habit[] {
  const d = getDb();
  const result = d.exec(`SELECT * FROM habits ORDER BY date DESC LIMIT ${limit}`);
  if (result.length === 0) return [];
  return rowsToObjects<any>(result[0]).map(habitRowToHabit);
}

export function getUniqueCustomItemLabels(): string[] {
  try {
    const all = getHabitsHistory(30);
    const labels = new Set<string>();
    for (const h of all) {
      for (const item of (h.custom_items || [])) {
        if (!item.label.startsWith('__')) labels.add(item.label);
      }
    }
    return [...labels];
  } catch { return []; }
}
