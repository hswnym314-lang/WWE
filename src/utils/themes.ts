import { ThemeId, FontSizeOption, FontWeightOption } from '../types/ledger';

export interface AppTheme {
  id: ThemeId;
  name: string;
  subtitle: string;
  isDark: boolean;
  metaThemeColor: string;
  previewBg: string;
  previewSurface: string;
  previewAccent: string;
  vars: {
    '--theme-bg': string;
    '--theme-surface': string;
    '--theme-surface-alt': string;
    '--theme-border': string;
    '--theme-text': string;
    '--theme-text-muted': string;
    '--theme-accent': string;
    '--theme-accent-hover': string;
    '--theme-accent-soft': string;
    '--theme-accent-text': string;
  };
}

export const APP_THEMES: AppTheme[] = [
  {
    id: 'light',
    name: 'النهاري الكلاسيكي',
    subtitle: 'أبيض مريح وواضح',
    isDark: false,
    metaThemeColor: '#047857',
    previewBg: '#f1f5f9',
    previewSurface: '#ffffff',
    previewAccent: '#059669',
    vars: {
      '--theme-bg': '#f1f5f9',
      '--theme-surface': '#ffffff',
      '--theme-surface-alt': '#f8fafc',
      '--theme-border': '#e2e8f0',
      '--theme-text': '#0f172a',
      '--theme-text-muted': '#64748b',
      '--theme-accent': '#059669',
      '--theme-accent-hover': '#047857',
      '--theme-accent-soft': '#ecfdf5',
      '--theme-accent-text': '#047857',
    },
  },
  {
    id: 'diwan',
    name: 'ورق الديوان الدافئ',
    subtitle: 'طابع دفتر حسابات تقليدي',
    isDark: false,
    metaThemeColor: '#b45309',
    previewBg: '#f3ebd9',
    previewSurface: '#fdfaf2',
    previewAccent: '#b45309',
    vars: {
      '--theme-bg': '#f3ebd9',
      '--theme-surface': '#fdfaf2',
      '--theme-surface-alt': '#f7f0e2',
      '--theme-border': '#e2d5bc',
      '--theme-text': '#2c1e16',
      '--theme-text-muted': '#78614e',
      '--theme-accent': '#b45309',
      '--theme-accent-hover': '#92400e',
      '--theme-accent-soft': '#fef3c7',
      '--theme-accent-text': '#92400e',
    },
  },
  {
    id: 'royal',
    name: 'الأزرق الملكي',
    subtitle: 'رسمي وأنيق للعمل',
    isDark: false,
    metaThemeColor: '#1d4ed8',
    previewBg: '#eff4fb',
    previewSurface: '#ffffff',
    previewAccent: '#2563eb',
    vars: {
      '--theme-bg': '#eff4fb',
      '--theme-surface': '#ffffff',
      '--theme-surface-alt': '#f5f8fd',
      '--theme-border': '#dbe4f0',
      '--theme-text': '#0f172a',
      '--theme-text-muted': '#475569',
      '--theme-accent': '#2563eb',
      '--theme-accent-hover': '#1d4ed8',
      '--theme-accent-soft': '#eff6ff',
      '--theme-accent-text': '#1d4ed8',
    },
  },
  {
    id: 'burgundy',
    name: 'العنابي الوقور',
    subtitle: 'لون دافئ فخم',
    isDark: false,
    metaThemeColor: '#9f1239',
    previewBg: '#f8f0f2',
    previewSurface: '#ffffff',
    previewAccent: '#be123c',
    vars: {
      '--theme-bg': '#f8f0f2',
      '--theme-surface': '#ffffff',
      '--theme-surface-alt': '#fdf6f8',
      '--theme-border': '#ecd8de',
      '--theme-text': '#1f1215',
      '--theme-text-muted': '#6e5259',
      '--theme-accent': '#be123c',
      '--theme-accent-hover': '#9f1239',
      '--theme-accent-soft': '#fff1f2',
      '--theme-accent-text': '#9f1239',
    },
  },
  {
    id: 'dark',
    name: 'الليلي الداكن',
    subtitle: 'مريح للعين في الإضاءة الخافتة',
    isDark: true,
    metaThemeColor: '#020617',
    previewBg: '#020617',
    previewSurface: '#0f172a',
    previewAccent: '#10b981',
    vars: {
      '--theme-bg': '#020617',
      '--theme-surface': '#0f172a',
      '--theme-surface-alt': '#1e293b',
      '--theme-border': '#1e293b',
      '--theme-text': '#f1f5f9',
      '--theme-text-muted': '#94a3b8',
      '--theme-accent': '#10b981',
      '--theme-accent-hover': '#059669',
      '--theme-accent-soft': 'rgba(16, 185, 129, 0.14)',
      '--theme-accent-text': '#34d399',
    },
  },
  {
    id: 'forest',
    name: 'الزمردي الليلي',
    subtitle: 'داكن بلمسة خضراء هادئة',
    isDark: true,
    metaThemeColor: '#051b14',
    previewBg: '#051b14',
    previewSurface: '#0a291f',
    previewAccent: '#10b981',
    vars: {
      '--theme-bg': '#051b14',
      '--theme-surface': '#0a291f',
      '--theme-surface-alt': '#113a2d',
      '--theme-border': '#174938',
      '--theme-text': '#ecfdf5',
      '--theme-text-muted': '#86efac',
      '--theme-accent': '#10b981',
      '--theme-accent-hover': '#059669',
      '--theme-accent-soft': 'rgba(16, 185, 129, 0.18)',
      '--theme-accent-text': '#6ee7b7',
    },
  },
];

export function getThemeById(id?: ThemeId): AppTheme {
  return APP_THEMES.find((t) => t.id === id) || APP_THEMES[0];
}

export function applyThemeToDocument(themeId?: ThemeId): AppTheme {
  const theme = getThemeById(themeId);
  const root = document.documentElement;

  root.setAttribute('data-theme', theme.id);
  if (theme.isDark) {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }

  Object.entries(theme.vars).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });

  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) {
    metaTheme.setAttribute('content', theme.metaThemeColor);
  }

  return theme;
}

export interface FontSizeMeta {
  id: FontSizeOption;
  label: string;
  px: string;
  description: string;
}

export const FONT_SIZE_OPTIONS: FontSizeMeta[] = [
  { id: 'small', label: 'صغير', px: '14px', description: 'يعرض تفاصيل أكثر' },
  { id: 'medium', label: 'متوسط', px: '16px', description: 'الحجم الافتراضي' },
  { id: 'large', label: 'كبير', px: '18px', description: 'أوضح للقراءة' },
  { id: 'xlarge', label: 'كبير جداً', px: '20px', description: 'مريح للنظر' },
];

export interface FontWeightMeta {
  id: FontWeightOption;
  label: string;
  description: string;
}

export const FONT_WEIGHT_OPTIONS: FontWeightMeta[] = [
  { id: 'normal', label: 'خط عادي', description: 'السُمك القياسي' },
  { id: 'bold', label: 'خط عريض', description: 'وضوح عالٍ للنصوص والأرقام' },
  { id: 'extrabold', label: 'عريض جداً', description: 'أقصى وضوح وبروز' },
];

export function applyTypographyToDocument(
  fontSize: FontSizeOption = 'medium',
  fontWeight: FontWeightOption = 'normal'
): void {
  const root = document.documentElement;
  const sizeMeta = FONT_SIZE_OPTIONS.find((s) => s.id === fontSize) || FONT_SIZE_OPTIONS[1];
  root.style.fontSize = sizeMeta.px;
  root.setAttribute('data-font-size', sizeMeta.id);
  root.setAttribute('data-font-weight', fontWeight || 'normal');
}
