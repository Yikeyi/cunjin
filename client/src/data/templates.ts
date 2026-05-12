export interface TemplateHabit {
  key: string;
  defaultLabel: string;
}

export interface TemplateGoal {
  title: string;
  type: string;
  sub_goals?: { title: string; completed?: boolean }[];
}

export interface Template {
  id: string;
  name: string;
  icon: string;
  description: string;
  habits: TemplateHabit[];
  goals: TemplateGoal[];
  isPreset?: boolean;
}

export const TEMPLATES: Template[] = [
  {
    id: 'basic',
    name: '基础',
    icon: '🌱',
    description: '日常基础习惯',
    isPreset: true,
    habits: [
      { key: 'early_sleep', defaultLabel: '早睡早起' },
      { key: 'exercise', defaultLabel: '每日锻炼' },
      { key: 'study', defaultLabel: '每日学习' },
      { key: 'hobby', defaultLabel: '每日兴趣' },
      { key: 'healthy_diet', defaultLabel: '健康饮食' },
    ],
    goals: [],
  },
  {
    id: 'health',
    name: '身心健康',
    icon: '💪',
    description: '注重身体和心理的健康',
    isPreset: true,
    habits: [
      { key: 'early_sleep', defaultLabel: '早睡早起' },
      { key: 'exercise', defaultLabel: '每天运动30分钟' },
      { key: 'study', defaultLabel: '冥想10分钟' },
      { key: 'hobby', defaultLabel: '日记写作' },
      { key: 'healthy_diet', defaultLabel: '健康饮食' },
      { key: 'drink_water', defaultLabel: '喝够8杯水' },
    ],
    goals: [],
  },
  {
    id: 'study',
    name: '学霸模式',
    icon: '📚',
    description: '专注学习和成长',
    isPreset: true,
    habits: [
      { key: 'early_sleep', defaultLabel: '早起学习' },
      { key: 'exercise', defaultLabel: '短暂运动' },
      { key: 'study', defaultLabel: '专注学习2小时' },
      { key: 'hobby', defaultLabel: '阅读30分钟' },
      { key: 'healthy_diet', defaultLabel: '健康饮食' },
    ],
    goals: [],
  },
  {
    id: 'programmer',
    name: '程序员保养',
    icon: '💻',
    description: '程序员的自我修养',
    isPreset: true,
    habits: [
      { key: 'early_sleep', defaultLabel: '12点前睡觉' },
      { key: 'exercise', defaultLabel: '眼保健操' },
      { key: 'study', defaultLabel: '刷算法题' },
      { key: 'hobby', defaultLabel: '写博客' },
      { key: 'healthy_diet', defaultLabel: '少吃外卖' },
      { key: 'drink_water', defaultLabel: '站起来活动' },
    ],
    goals: [],
  },
  {
    id: 'fitness',
    name: '健身达人',
    icon: '🏋️',
    description: '打造完美身材',
    isPreset: true,
    habits: [
      { key: 'early_sleep', defaultLabel: '早睡' },
      { key: 'exercise', defaultLabel: '力量训练' },
      { key: 'study', defaultLabel: '健身知识学习' },
      { key: 'hobby', defaultLabel: '拉伸放松' },
      { key: 'healthy_diet', defaultLabel: '高蛋白饮食' },
    ],
    goals: [],
  },
];

const STORAGE_KEY = 'selected_template';
const CUSTOM_TEMPLATES_KEY = 'custom_templates';
const PRESET_OVERRIDES_KEY = 'preset_overrides';

export function getStoredTemplateId(): string {
  return localStorage.getItem(STORAGE_KEY) || 'basic';
}

export function storeTemplateId(id: string): void {
  localStorage.setItem(STORAGE_KEY, id);
}

export function getMergedTemplate(id: string): Template {
  const preset = TEMPLATES.find(t => t.id === id);
  if (preset) {
    const overrides = getPresetOverrides();
    if (overrides[id]) {
      return { ...preset, habits: overrides[id].habits || preset.habits, goals: overrides[id].goals || preset.goals };
    }
    return preset;
  }
  const custom = getCustomTemplates().find(t => t.id === id);
  if (custom) return custom;
  return TEMPLATES[0];
}

export function getCustomTemplates(): Template[] {
  try { return JSON.parse(localStorage.getItem(CUSTOM_TEMPLATES_KEY) || '[]'); } catch { return []; }
}

export function saveCustomTemplates(templates: Template[]): void {
  localStorage.setItem(CUSTOM_TEMPLATES_KEY, JSON.stringify(templates));
}

function getPresetOverrides(): Record<string, Partial<Template>> {
  try { return JSON.parse(localStorage.getItem(PRESET_OVERRIDES_KEY) || '{}'); } catch { return {}; }
}

export function savePresetOverrides(id: string, overrides: Partial<Template>): void {
  const all = getPresetOverrides();
  all[id] = overrides;
  localStorage.setItem(PRESET_OVERRIDES_KEY, JSON.stringify(all));
}

export function isFirstLaunch(): boolean {
  return !localStorage.getItem(STORAGE_KEY);
}
