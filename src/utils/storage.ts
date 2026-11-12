import { Debtor, MonthInstallment, AppSettings, AmountUnitMode } from '../types/ledger';
import { formatAmountInWords } from './tafqeet';

const STORAGE_KEYS = {
  DEBTORS: 'ledgerapp_debtors_v2',
  DEBTORS_MIRROR: 'ledgerapp_debtors_mirror_v2',
  SETTINGS: 'ledgerapp_settings_v2',
  SETTINGS_MIRROR: 'ledgerapp_settings_mirror_v2',
  DEMO_CLEANED: 'ledgerapp_demo_removed_v1',
};

const IDB_NAME = 'LedgerPhoneOfflineDB';
const IDB_VERSION = 1;
const IDB_STORE = 'kv_store';

export const MAX_DEBTORS = 1000;

const DEMO_DEBTOR_IDS = new Set([
  'debtor-1',
  'debtor-2',
  'debtor-3',
  'debtor-4',
  'debtor-5',
]);

export const MONTH_NAMES_AR = [
  'الشهر الأول',
  'الشهر الثاني',
  'الشهر الثالث',
  'الشهر الرابع',
  'الشهر الخامس',
  'الشهر السادس',
  'الشهر السابع',
  'الشهر الثامن',
  'الشهر التاسع',
  'الشهر العاشر',
];

export const DEFAULT_SETTINGS: AppSettings = {
  storeName: 'سجل ديوان الحسابات والديون',
  currencySymbol: 'د.ع',
  phone: '',
  theme: 'light',
  fontSize: 'medium',
  fontWeight: 'normal',
  amountUnitMode: 'thousands',
};

// --- IndexedDB Phone Persistent Storage Mirror ---
function openPhoneDB(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    try {
      const request = window.indexedDB.open(IDB_NAME, IDB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function idbSet(key: string, value: unknown): Promise<void> {
  try {
    const db = await openPhoneDB();
    if (!db) return;
    await new Promise<void>((resolve) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).put(value, key);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        resolve();
      };
    });
  } catch {
    // Fallback gracefully to localStorage
  }
}

async function idbGet<T>(key: string): Promise<T | null> {
  try {
    const db = await openPhoneDB();
    if (!db) return null;
    return await new Promise<T | null>((resolve) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const req = tx.objectStore(IDB_STORE).get(key);
      req.onsuccess = () => {
        const res = req.result as T | undefined;
        db.close();
        resolve(res !== undefined ? res : null);
      };
      req.onerror = () => {
        db.close();
        resolve(null);
      };
    });
  } catch {
    return null;
  }
}

// --- WebSQL / Android WebView setDatabaseEnabled extra mirror (if available) ---
interface WebSqlTx {
  executeSql: (
    sql: string,
    args?: unknown[],
    cb?: (tx: WebSqlTx, res: { rows: { length: number; item: (i: number) => { val: string } } }) => void
  ) => void;
}
interface WebSqlDb {
  transaction: (cb: (tx: WebSqlTx) => void) => void;
}

function getWebSqlDb(): WebSqlDb | null {
  try {
    const w = window as unknown as { openDatabase?: (name: string, ver: string, desc: string, size: number) => WebSqlDb };
    if (typeof window !== 'undefined' && typeof w.openDatabase === 'function') {
      return w.openDatabase('LedgerAppPhoneDB', '1.0', 'Ledger Offline Storage', 10 * 1024 * 1024);
    }
  } catch {
    // ignore if unavailable
  }
  return null;
}

function webSqlSet(key: string, value: unknown): void {
  try {
    const db = getWebSqlDb();
    if (!db) return;
    const serialized = JSON.stringify(value);
    db.transaction((tx) => {
      tx.executeSql('CREATE TABLE IF NOT EXISTS kv_backup (k TEXT PRIMARY KEY, v TEXT)');
      tx.executeSql('INSERT OR REPLACE INTO kv_backup (k, v) VALUES (?, ?)', [key, serialized]);
    });
  } catch {
    // ignore
  }
}

function webSqlGet<T>(key: string): Promise<T | null> {
  return new Promise((resolve) => {
    try {
      const db = getWebSqlDb();
      if (!db) {
        resolve(null);
        return;
      }
      db.transaction((tx) => {
        tx.executeSql('CREATE TABLE IF NOT EXISTS kv_backup (k TEXT PRIMARY KEY, v TEXT)');
        tx.executeSql(
          'SELECT v AS val FROM kv_backup WHERE k = ?',
          [key],
          (_tx, res) => {
            if (res.rows.length > 0) {
              try {
                resolve(JSON.parse(res.rows.item(0).val) as T);
              } catch {
                resolve(null);
              }
            } else {
              resolve(null);
            }
          }
        );
      });
    } catch {
      resolve(null);
    }
  });
}

// Request persistent storage permission from Android WebView / Mobile Browser so OS never evicts data
export async function requestPersistentPhoneStorage(): Promise<boolean> {
  try {
    if (navigator.storage && navigator.storage.persist) {
      return await navigator.storage.persist();
    }
  } catch {
    // ignore
  }
  return false;
}

// Generate 10 months breakdown from total amount and starting date
export function generateDefaultTenMonths(
  totalAmount: number,
  startDateStr: string,
  prefilledPaidMonths: number = 0
): MonthInstallment[] {
  const baseMonthly = Math.floor(totalAmount / 10);
  const remainder = totalAmount - baseMonthly * 10;

  const startDate = startDateStr ? new Date(startDateStr) : new Date();

  const months: MonthInstallment[] = [];

  for (let i = 1; i <= 10; i++) {
    const d = new Date(startDate);
    d.setMonth(d.getMonth() + (i - 1));
    const dueDateStr = !isNaN(d.getTime()) ? d.toISOString().slice(0, 10) : '';

    // Give remainder to the first month so total sums up exactly
    const target = i === 1 ? baseMonthly + remainder : baseMonthly;

    const isPaid = i <= prefilledPaidMonths;
    const paidAmount = isPaid ? target : 0;

    months.push({
      monthIndex: i,
      monthLabel: MONTH_NAMES_AR[i - 1],
      dueDate: dueDateStr,
      targetAmount: target,
      paidAmount: paidAmount,
      status: isPaid ? 'paid' : 'unpaid',
      paidDate: isPaid ? dueDateStr : undefined,
      notes: isPaid ? 'تم الاستلام نقداً' : '',
    });
  }

  return months;
}

// Synchronous Storage helpers (instant startup)
export function loadDebtors(): Debtor[] {
  try {
    const raw =
      localStorage.getItem(STORAGE_KEYS.DEBTORS) ??
      localStorage.getItem(STORAGE_KEYS.DEBTORS_MIRROR);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        // One-time cleanup of previously seeded dummy/demo debtors
        if (!localStorage.getItem(STORAGE_KEYS.DEMO_CLEANED)) {
          const cleaned = parsed.filter((d: Debtor) => !DEMO_DEBTOR_IDS.has(d.id));
          localStorage.setItem(STORAGE_KEYS.DEMO_CLEANED, '1');
          localStorage.removeItem('ledgerapp_customers_v1');
          localStorage.removeItem('ledgerapp_transactions_v1');
          localStorage.removeItem('ledgerapp_cash_v1');
          saveDebtors(cleaned);
          return cleaned;
        }
        return parsed;
      }
    } else {
      localStorage.setItem(STORAGE_KEYS.DEMO_CLEANED, '1');
    }
  } catch (e) {
    console.warn('Failed to load debtors from localStorage', e);
  }
  return [];
}

export function saveDebtors(debtors: Debtor[]): void {
  const capped = debtors.slice(0, MAX_DEBTORS);
  const serialized = JSON.stringify(capped);
  try {
    localStorage.setItem(STORAGE_KEYS.DEBTORS, serialized);
  } catch (e) {
    console.warn('Primary localStorage quota reached, using IndexedDB phone storage', e);
  }
  try {
    localStorage.setItem(STORAGE_KEYS.DEBTORS_MIRROR, serialized);
  } catch {
    // Skip duplicate mirror in localStorage if storage exceeds ~5MB at ~1000 customers
  }
  void idbSet(STORAGE_KEYS.DEBTORS, capped);
  webSqlSet(STORAGE_KEYS.DEBTORS, capped);
}

export function loadSettings(): AppSettings {
  try {
    const raw =
      localStorage.getItem(STORAGE_KEYS.SETTINGS) ??
      localStorage.getItem(STORAGE_KEYS.SETTINGS_MIRROR);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch (e) {
    console.warn('Failed to load settings', e);
  }
  return DEFAULT_SETTINGS;
}

export function saveSettings(settings: AppSettings): void {
  const serialized = JSON.stringify(settings);
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, serialized);
    localStorage.setItem(STORAGE_KEYS.SETTINGS_MIRROR, serialized);
  } catch (e) {
    console.error('Failed to save settings', e);
  }
  void idbSet(STORAGE_KEYS.SETTINGS, settings);
  webSqlSet(STORAGE_KEYS.SETTINGS, settings);
}

// Flush latest state synchronously on app close / background / swipe away
export function flushPhoneStorage(debtors: Debtor[], settings: AppSettings): void {
  saveDebtors(debtors);
  saveSettings(settings);
}

// Async hydration from IndexedDB / WebSQL phone storage in case localStorage was cleared
export async function syncPhoneStorageOnBoot(): Promise<{
  debtors: Debtor[] | null;
  settings: AppSettings | null;
}> {
  await requestPersistentPhoneStorage();

  const lsDebtorsRaw =
    localStorage.getItem(STORAGE_KEYS.DEBTORS) ??
    localStorage.getItem(STORAGE_KEYS.DEBTORS_MIRROR);

  let recoveredDebtors: Debtor[] | null = null;
  let lsParsed: Debtor[] = [];
  if (lsDebtorsRaw) {
    try {
      const parsed = JSON.parse(lsDebtorsRaw);
      if (Array.isArray(parsed)) {
        lsParsed = parsed;
      }
    } catch {
      lsParsed = [];
    }
  }

  const idbDebtors = await idbGet<Debtor[]>(STORAGE_KEYS.DEBTORS);
  const sqlDebtors = idbDebtors ?? (await webSqlGet<Debtor[]>(STORAGE_KEYS.DEBTORS));

  if (!lsDebtorsRaw || (Array.isArray(sqlDebtors) && sqlDebtors.length > lsParsed.length)) {
    if (Array.isArray(sqlDebtors) && sqlDebtors.length > 0) {
      const cleaned = sqlDebtors.filter((d) => !DEMO_DEBTOR_IDS.has(d.id)).slice(0, MAX_DEBTORS);
      saveDebtors(cleaned);
      recoveredDebtors = cleaned;
    }
  } else if (lsParsed.length > 0) {
    const capped = lsParsed.slice(0, MAX_DEBTORS);
    void idbSet(STORAGE_KEYS.DEBTORS, capped);
    webSqlSet(STORAGE_KEYS.DEBTORS, capped);
  }

  const lsSettingsRaw =
    localStorage.getItem(STORAGE_KEYS.SETTINGS) ??
    localStorage.getItem(STORAGE_KEYS.SETTINGS_MIRROR);

  let recoveredSettings: AppSettings | null = null;
  if (!lsSettingsRaw) {
    const idbSettings = await idbGet<AppSettings>(STORAGE_KEYS.SETTINGS);
    const sqlSettings = idbSettings ?? (await webSqlGet<AppSettings>(STORAGE_KEYS.SETTINGS));
    if (sqlSettings) {
      const merged = { ...DEFAULT_SETTINGS, ...sqlSettings };
      saveSettings(merged);
      recoveredSettings = merged;
    }
  } else {
    try {
      const parsed = { ...DEFAULT_SETTINGS, ...JSON.parse(lsSettingsRaw) };
      saveSettings(parsed);
    } catch {
      // ignore
    }
  }

  return { debtors: recoveredDebtors, settings: recoveredSettings };
}

// Offline Backup File Export / Import directly to/from Phone Storage
export interface PhoneBackupPayload {
  version: string;
  exportedAt: string;
  settings: AppSettings;
  debtors: Debtor[];
}

export function exportPhoneBackupFile(debtors: Debtor[], settings: AppSettings): void {
  const payload: PhoneBackupPayload = {
    version: '2.0',
    exportedAt: new Date().toISOString(),
    settings,
    debtors,
  };
  const jsonStr = JSON.stringify(payload, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const dateStr = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `سجل_الديوان_نسخة_${dateStr}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function parsePhoneBackupFile(jsonText: string): {
  debtors: Debtor[];
  settings?: AppSettings;
  truncatedCount: number;
} {
  const parsed = JSON.parse(jsonText);
  if (!parsed || !Array.isArray(parsed.debtors)) {
    throw new Error('ملف النسخة الاحتياطية غير صالح');
  }
  const allDebtors = parsed.debtors as Debtor[];
  const truncatedCount = Math.max(0, allDebtors.length - MAX_DEBTORS);
  return {
    debtors: allDebtors.slice(0, MAX_DEBTORS),
    settings: parsed.settings ? { ...DEFAULT_SETTINGS, ...parsed.settings } : undefined,
    truncatedCount,
  };
}

// Format numbers with thousands separators
export function formatMoney(amount: number, symbol: string = 'د.ع'): string {
  const formatted = Math.abs(amount).toLocaleString('ar-IQ');
  return `${amount < 0 ? '-' : ''}${formatted} ${symbol}`.trim();
}

// Format date in Arabic
export function formatDateAr(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('ar-IQ', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

// Generate plain text summary (for offline copy or WhatsApp)
export function getDebtorStatementText(
  debtor: Debtor,
  currencySymbol: string,
  unitMode: AmountUnitMode = 'thousands'
): string {
  const paidCount = debtor.months.filter((m) => m.status === 'paid').length;

  let msg = `*سجل حساب ديوان / كشف دين*\n`;
  msg += `👤 *الاسم:* ${debtor.name}\n`;
  msg += `💰 *المبلغ الكامل:* ${formatMoney(debtor.totalAmount, currencySymbol)} (${formatAmountInWords(debtor.totalAmount, currencySymbol, unitMode)})\n`;
  msg += `✅ *المبلغ الواصل:* ${formatMoney(debtor.totalPaid, currencySymbol)} (${formatAmountInWords(debtor.totalPaid, currencySymbol, unitMode)}) - تم سداد ${paidCount} من 10 أشهر\n`;
  msg += `⚖️ *المبلغ الصافي المتبقي:* ${formatMoney(debtor.netAmount, currencySymbol)} (${formatAmountInWords(debtor.netAmount, currencySymbol, unitMode)})\n`;
  msg += `📅 *التاريخ والسنة:* ${debtor.startDate} / ${debtor.year}\n`;
  if (debtor.notes) {
    msg += `📝 *ملاحظات:* ${debtor.notes}\n`;
  }
  msg += `\n*جدول الأشهر (10 أشهر):*\n`;

  debtor.months.forEach((m) => {
    const statusText = m.status === 'paid' ? '✅ واصل بالكامل' : m.status === 'partial' ? `⚠️ واصل ${formatMoney(m.paidAmount, currencySymbol)}` : '⏳ متبقي';
    msg += `• ${m.monthLabel}: ${formatMoney(m.targetAmount, currencySymbol)} [${statusText}]\n`;
  });

  return msg;
}

export function getWhatsAppShareText(
  debtor: Debtor,
  currencySymbol: string,
  unitMode: AmountUnitMode = 'thousands'
): string {
  return `https://wa.me/?text=${encodeURIComponent(getDebtorStatementText(debtor, currencySymbol, unitMode))}`;
}
