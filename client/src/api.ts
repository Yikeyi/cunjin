import { initDatabase, exportAllData, importAllData } from './db/database';
import * as Habits from './db/habits';
import * as Goals from './db/goals';

export type { Habit, CustomHabitItem } from './db/habits';
export type { Goal, SubGoal } from './db/goals';

export interface DashboardStats {
  todayInches: number;
  weekInches: number;
  totalInches: number;
  currentStreak: number;
  longestStreak: number;
  totalGoals: number;
  avgCompletionRate: number;
  goalsByType: { type: string; count: number }[];
  dailyTrend: { date: string; completed_count: number }[];
}

export async function initAppDatabase(): Promise<void> {
  await initDatabase();
}

export function exportAllAppData() {
  return exportAllData();
}

export function importAllAppData(data: any): void {
  importAllData(data);
}

export const api = {
  getHabits: () => Promise.resolve(Habits.getAllHabits()),
  getHabitHistory: (limit = 90) => Promise.resolve(Habits.getHabitsHistory(limit)),
  getTodayHabit: () => Promise.resolve(Habits.getTodayHabit()),
  getHabitByDate: (date: string) => Promise.resolve(Habits.getHabitByDate(date)),
  createHabit: (date: string) => Promise.resolve(Habits.createTodayHabit(date)),
  updateHabit: (id: number, data: Partial<Habits.Habit>) => Promise.resolve(Habits.updateHabit(id, data)),
  deleteHabit: (id: number) => { Habits.deleteHabit(id); return Promise.resolve(); },
  clearAllHabits: () => { Habits.clearAllHabits(); return Promise.resolve(); },

  getGoals: () => Promise.resolve(Goals.getAllGoals()),
  getGoal: (id: number) => Promise.resolve(Goals.getGoal(id)),
  createGoal: (data: Partial<Goals.Goal>) => Promise.resolve(Goals.createGoal(data)),
  updateGoal: (id: number, data: Partial<Goals.Goal>) => Promise.resolve(Goals.updateGoal(id, data)),
  deleteGoal: (id: number) => { Goals.deleteGoal(id); return Promise.resolve(); },

  getSubGoals: (goalId: number) => Promise.resolve(Goals.getSubGoals(goalId)),
  createSubGoal: (goalId: number, data: Partial<Goals.SubGoal>) => Promise.resolve(Goals.createSubGoal(goalId, data)),
  updateSubGoal: (goalId: number, subId: number, data: Partial<Goals.SubGoal>) => Promise.resolve(Goals.updateSubGoal(goalId, subId, data)),
  deleteSubGoal: (goalId: number, subId: number) => { Goals.deleteSubGoal(goalId, subId); return Promise.resolve(); },

  getDashboard: async (): Promise<DashboardStats> => {
    const allHabits = Habits.getAllHabits();
    const today = new Date().toLocaleDateString('en-CA');
    const todayHabit = allHabits.find(h => h.date === today);

    const todayInches = todayHabit ? todayHabit.completed_count : 0;

    const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const weekHabits = allHabits.filter(h => h.date >= weekStart.toLocaleDateString('en-CA') && h.date <= today);
    const weekInches = weekHabits.reduce((sum, h) => sum + h.completed_count, 0);

    const totalInches = allHabits.reduce((sum, h) => sum + h.completed_count, 0);

    let currentStreak = 0;
    const cursor = new Date(today);
    while (cursor >= new Date(today)) {
      const ds = cursor.toLocaleDateString('en-CA');
      const h = allHabits.find(x => x.date === ds);
      if (h && h.completed_count > 0) { currentStreak++; cursor.setDate(cursor.getDate() - 1); }
      else break;
    }
    if (currentStreak === 0) currentStreak = 0;

    let longestStreak = 0, streak = 0;
    const sorted = [...allHabits].sort((a, b) => a.date.localeCompare(b.date));
    for (const h of sorted) {
      if (h.completed_count > 0) { streak++; longestStreak = Math.max(longestStreak, streak); }
      else streak = 0;
    }

    const goals = Goals.getAllGoals();
    const totalGoals = goals.length;
    const avgCompletionRate = totalGoals > 0 ? goals.reduce((s, g) => s + g.progress, 0) / totalGoals : 0;

    const goalsByTypeMap: Record<string, number> = {};
    for (const g of goals) {
      goalsByTypeMap[g.type] = (goalsByTypeMap[g.type] || 0) + 1;
    }
    const goalsByType = Object.entries(goalsByTypeMap).map(([type, count]) => ({ type, count }));

    const dailyTrend = sorted.map(h => ({ date: h.date, completed_count: h.completed_count }));

    return { todayInches, weekInches, totalInches, currentStreak, longestStreak, totalGoals, avgCompletionRate, goalsByType, dailyTrend };
  },
};
