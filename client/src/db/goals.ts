import { getDb, persistDb, rowsToObjects, rowToObject } from './database';

export interface Goal {
  id: number;
  title: string;
  type: string;
  start_date: string;
  end_date: string;
  progress: number;
  satisfaction: number;
  summary: string;
  color: string;
  linked_habit_key?: string | null;
  archived?: number;
}

export interface SubGoal {
  id: number;
  goal_id: number;
  title: string;
  completed: number;
  sort_order: number;
}

export function getAllGoals(): Goal[] {
  const d = getDb();
  const result = d.exec('SELECT * FROM goals ORDER BY created_at DESC');
  if (result.length === 0) return [];
  return rowsToObjects<Goal>(result[0]);
}

export function getGoal(id: number): Goal | null {
  const d = getDb();
  const result = d.exec('SELECT * FROM goals WHERE id = ?', [id]);
  if (result.length === 0 || !result[0].values || result[0].values.length === 0) return null;
  return rowToObject<Goal>(result[0]);
}

export function createGoal(data: Partial<Goal>): Goal {
  const d = getDb();
  d.run('INSERT INTO goals (title, type, start_date, end_date, progress, satisfaction, summary, color, linked_habit_key) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [data.title, data.type || '学习', data.start_date, data.end_date, data.progress || 0, data.satisfaction || 0, data.summary || '', data.color || '#6366f1', data.linked_habit_key || null]);
  persistDb();
  const result = d.exec('SELECT * FROM goals WHERE id = last_insert_rowid()');
  if (result.length === 0) throw new Error('Failed to create goal');
  return rowToObject<Goal>(result[0]);
}

export function updateGoal(id: number, data: Partial<Goal>): Goal {
  const d = getDb();
  const fields: string[] = [];
  const values: any[] = [];
  if (data.title !== undefined) { fields.push('title = ?'); values.push(data.title); }
  if (data.type !== undefined) { fields.push('type = ?'); values.push(data.type); }
  if (data.start_date !== undefined) { fields.push('start_date = ?'); values.push(data.start_date); }
  if (data.end_date !== undefined) { fields.push('end_date = ?'); values.push(data.end_date); }
  if (data.progress !== undefined) { fields.push('progress = ?'); values.push(data.progress); }
  if (data.satisfaction !== undefined) { fields.push('satisfaction = ?'); values.push(data.satisfaction); }
  if (data.summary !== undefined) { fields.push('summary = ?'); values.push(data.summary); }
  if (data.color !== undefined) { fields.push('color = ?'); values.push(data.color); }
  if (data.linked_habit_key !== undefined) { fields.push('linked_habit_key = ?'); values.push(data.linked_habit_key); }
  if (data.archived !== undefined) { fields.push('archived = ?'); values.push(data.archived); }
  fields.push('updated_at = datetime(\'now\')');
  values.push(id);
  d.run(`UPDATE goals SET ${fields.join(', ')} WHERE id = ?`, values);
  persistDb();
  const result = d.exec('SELECT * FROM goals WHERE id = ?', [id]);
  return rowToObject<Goal>(result[0]);
}

export function deleteGoal(id: number): boolean {
  const d = getDb();
  d.run('DELETE FROM sub_goals WHERE goal_id = ?', [id]);
  d.run('DELETE FROM goals WHERE id = ?', [id]);
  persistDb();
  return true;
}

export function getSubGoals(goalId: number): SubGoal[] {
  const d = getDb();
  const result = d.exec('SELECT * FROM sub_goals WHERE goal_id = ? ORDER BY sort_order', [goalId]);
  if (result.length === 0) return [];
  return rowsToObjects<SubGoal>(result[0]);
}

export function createSubGoal(goalId: number, data: Partial<SubGoal>): SubGoal {
  const d = getDb();
  d.run('INSERT INTO sub_goals (goal_id, title, completed, sort_order) VALUES (?, ?, ?, ?)',
    [goalId, data.title, data.completed || 0, data.sort_order || 0]);
  persistDb();
  const result = d.exec('SELECT * FROM sub_goals WHERE id = last_insert_rowid()');
  return rowToObject<SubGoal>(result[0]);
}

export function updateSubGoal(goalId: number, subId: number, data: Partial<SubGoal>): SubGoal | null {
  const d = getDb();
  const fields: string[] = [];
  const values: any[] = [];
  if (data.title !== undefined) { fields.push('title = ?'); values.push(data.title); }
  if (data.completed !== undefined) { fields.push('completed = ?'); values.push(data.completed ? 1 : 0); }
  if (data.sort_order !== undefined) { fields.push('sort_order = ?'); values.push(data.sort_order); }
  values.push(subId);
  d.run(`UPDATE sub_goals SET ${fields.join(', ')} WHERE id = ? AND goal_id = ?`, [...values, goalId]);
  persistDb();
  const result = d.exec('SELECT * FROM sub_goals WHERE id = ?', [subId]);
  if (result.length === 0) return null;
  return rowToObject<SubGoal>(result[0]);
}

export function deleteSubGoal(goalId: number, subId: number): void {
  const d = getDb();
  d.run('DELETE FROM sub_goals WHERE id = ? AND goal_id = ?', [subId, goalId]);
  persistDb();
}
