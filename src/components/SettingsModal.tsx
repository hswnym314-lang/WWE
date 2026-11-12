import React, { useRef, useState } from 'react';
import {
  AppSettings,
  Debtor,
  FontSizeOption,
  FontWeightOption,
  ThemeId,
  AmountUnitMode,
} from '../types/ledger';
import {
  APP_THEMES,
  FONT_SIZE_OPTIONS,
  FONT_WEIGHT_OPTIONS,
} from '../utils/themes';
import {
  exportPhoneBackupFile,
  parsePhoneBackupFile,
  formatMoney,
  MAX_DEBTORS,
} from '../utils/storage';
import {
  COUNTRIES_CURRENCIES,
  formatAmountInWords,
} from '../utils/tafqeet';
import {
  Settings,
  Type,
  Palette,
  Coins,
  HardDrive,
  X,
  Check,
  Download,
  Upload,
  CheckCircle2,
  AlertTriangle,
  WifiOff,
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  debtors: Debtor[];
  onSelectTheme: (themeId: ThemeId) => void;
  onSelectCurrency: (symbol: string) => void;
  onSelectFontSize: (fontSize: FontSizeOption) => void;
  onSelectFontWeight: (fontWeight: FontWeightOption) => void;
  onSelectAmountUnitMode: (mode: AmountUnitMode) => void;
  onRestoreBackup: (debtors: Debtor[], restoredSettings?: AppSettings) => void;
}

type SettingsTab = 'fonts' | 'themes' | 'currency' | 'storage';

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  debtors,
  onSelectTheme,
  onSelectCurrency,
  onSelectFontSize,
  onSelectFontWeight,
  onSelectAmountUnitMode,
  onRestoreBackup,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('fonts');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [statusMsg, setStatusMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  if (!isOpen) return null;

  const activeFontSize = settings.fontSize || 'medium';
  const activeFontWeight = settings.fontWeight || 'normal';
  const activeUnitMode: AmountUnitMode = settings.amountUnitMode || 'thousands';

  const handleExport = () => {
    try {
      exportPhoneBackupFile(debtors, settings);
      setStatusMsg({
        type: 'ok',
        text: 'تم حفظ ملف النسخة الاحتياطية على ذاكرة الهاتف بنجاح.',
      });
    } catch {
      setStatusMsg({
        type: 'err',
        text: 'تعذر إنشاء ملف النسخة الاحتياطية.',
      });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = String(ev.target?.result || '');
        const { debtors: importedDebtors, settings: importedSettings, truncatedCount } =
          parsePhoneBackupFile(text);
        onRestoreBackup(importedDebtors, importedSettings);
        setStatusMsg({
          type: 'ok',
          text:
            truncatedCount > 0
              ? `تم استرجاع أول ${importedDebtors.length} زبون بنجاح (الحد الأقصى ${MAX_DEBTORS} زبون).`
              : `تم استرجاع ${importedDebtors.length} سجل من ذاكرة الهاتف بنجاح.`,
        });
      } catch {
        setStatusMsg({
          type: 'err',
          text: 'الملف المختار غير صالح أو تالف.',
        });
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const tabs: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
    { id: 'fonts', label: 'الخطوط', icon: <Type className="w-4 h-4" /> },
    { id: 'themes', label: 'الثيمات', icon: <Palette className="w-4 h-4" /> },
    { id: 'currency', label: 'الدولة والعملة', icon: <Coins className="w-4 h-4" /> },
    { id: 'storage', label: 'التخزين', icon: <HardDrive className="w-4 h-4" /> },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="theme-surface border rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b theme-border shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl theme-accent-soft flex items-center justify-center">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">الإعدادات والتخصيص</h2>
              <p className="text-[11px] theme-text-muted">
                الخطوط، الثيمات، العملة، والتخزين المحلي على الهاتف
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center theme-text-muted hover:opacity-80 transition-opacity"
            aria-label="إغلاق الإعدادات"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="px-4 pt-3 pb-2 border-b theme-border shrink-0">
          <div className="grid grid-cols-4 gap-1.5 p-1 theme-surface-alt rounded-xl border theme-border">
            {tabs.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex flex-col sm:flex-row items-center justify-center gap-1 py-2 px-2 rounded-lg text-[11px] sm:text-xs font-bold transition-all ${
                    active
                      ? 'theme-accent-bg shadow-xs'
                      : 'theme-text-muted hover:opacity-85'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Area */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-5 flex-1">
          {/* TAB 1: FONTS (حجم الخط + سُمك الخط) */}
          {activeTab === 'fonts' && (
            <div className="space-y-5">
              {/* Font Size Section */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-bold">حجم الخط</h3>
                  <span className="text-[11px] theme-text-muted">
                    صغير · متوسط · كبير · كبير جداً
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {FONT_SIZE_OPTIONS.map((opt, idx) => {
                    const isSelected = activeFontSize === opt.id;
                    const sampleSizeClass =
                      idx === 0
                        ? 'text-xs'
                        : idx === 1
                        ? 'text-sm'
                        : idx === 2
                        ? 'text-base'
                        : 'text-lg';
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => onSelectFontSize(opt.id)}
                        className={`p-3 rounded-xl border-2 text-center transition-all active:scale-95 flex flex-col items-center justify-center gap-1 ${
                          isSelected
                            ? 'theme-accent-soft border-current shadow-xs'
                            : 'theme-surface-alt theme-border hover:opacity-85'
                        }`}
                      >
                        <span className={`${sampleSizeClass} font-bold leading-none`}>
                          أ ب
                        </span>
                        <span className="text-xs font-bold mt-1">{opt.label}</span>
                        <span className="text-[10px] theme-text-muted">{opt.description}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Font Weight / Boldness Section */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-bold">سُمك الخط (عادي / عريض)</h3>
                  <span className="text-[11px] theme-text-muted">
                    يُطبق على كامل التطبيق والأرقام
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {FONT_WEIGHT_OPTIONS.map((opt) => {
                    const isSelected = activeFontWeight === opt.id;
                    const weightStyle: React.CSSProperties = {
                      fontWeight:
                        opt.id === 'extrabold' ? 900 : opt.id === 'bold' ? 700 : 500,
                    };
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => onSelectFontWeight(opt.id)}
                        className={`p-3 rounded-xl border-2 text-center transition-all active:scale-95 flex flex-col items-center gap-1 ${
                          isSelected
                            ? 'theme-accent-soft border-current shadow-xs'
                            : 'theme-surface-alt theme-border hover:opacity-85'
                        }`}
                      >
                        <span className="text-sm" style={weightStyle}>
                          {opt.label}
                        </span>
                        <span className="text-[10px] theme-text-muted leading-tight">
                          {opt.description}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Live Typography Preview */}
              <div className="p-3.5 rounded-xl border theme-border theme-surface-alt">
                <div className="text-[11px] theme-text-muted mb-1.5">
                  معاينة مباشرة لشكل الخط في السجل:
                </div>
                <div className="flex items-center justify-between gap-2 theme-surface border theme-border rounded-xl p-3">
                  <div>
                    <div className="text-sm font-extrabold">علي محمد حسن</div>
                    <div className="text-xs theme-text-muted mt-0.5">
                      مسدد 4 من 10 أشهر
                    </div>
                  </div>
                  <div className="text-left">
                    <div className="text-[10px] theme-text-muted">المبلغ الصافي</div>
                    <div className="text-base font-extrabold font-mono text-rose-600 dark:text-rose-400 tabular-nums">
                      {formatMoney(150000, settings.currencySymbol)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: THEMES */}
          {activeTab === 'themes' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {APP_THEMES.map((theme) => {
                const isSelected = settings.theme === theme.id;

                return (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => onSelectTheme(theme.id)}
                    className={`relative text-right p-3.5 rounded-2xl border-2 transition-all active:scale-[0.98] flex flex-col gap-2.5 ${
                      isSelected ? 'shadow-md' : 'hover:opacity-95'
                    }`}
                    style={{
                      backgroundColor: theme.previewSurface,
                      borderColor: isSelected
                        ? theme.previewAccent
                        : theme.vars['--theme-border'],
                      color: theme.vars['--theme-text'],
                    }}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="w-5 h-5 rounded-full border border-black/10 shadow-xs"
                          style={{ backgroundColor: theme.previewBg }}
                        />
                        <span
                          className="w-5 h-5 rounded-full border border-black/10 shadow-xs"
                          style={{ backgroundColor: theme.previewAccent }}
                        />
                      </div>

                      {isSelected && (
                        <span
                          className="w-6 h-6 rounded-full flex items-center justify-center text-white shadow-xs"
                          style={{ backgroundColor: theme.previewAccent }}
                        >
                          <Check className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </div>

                    <div>
                      <div className="text-sm font-extrabold">{theme.name}</div>
                      <div
                        className="text-[11px] mt-0.5"
                        style={{ color: theme.vars['--theme-text-muted'] }}
                      >
                        {theme.subtitle}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* TAB 3: COUNTRY, CURRENCY & WRITTEN AMOUNT MODE */}
          {activeTab === 'currency' && (
            <div className="space-y-4">
              {/* Amount Reading Scale Mode */}
              <div className="p-3.5 rounded-xl border theme-border theme-surface-alt space-y-2.5">
                <div className="text-xs font-bold">نظام قراءة وكتابة المبلغ (التفقيط):</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => onSelectAmountUnitMode('thousands')}
                    className={`p-2.5 rounded-xl border-2 text-right transition-all ${
                      activeUnitMode === 'thousands'
                        ? 'theme-accent-soft border-current shadow-xs'
                        : 'theme-surface theme-border hover:opacity-85'
                    }`}
                  >
                    <div className="text-xs font-extrabold">بالآلاف (كل 1000 = مليون)</div>
                    <div className="text-[10px] theme-text-muted mt-0.5">
                      مثال: 1000 ← {formatAmountInWords(1000, settings.currencySymbol, 'thousands')}
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => onSelectAmountUnitMode('direct')}
                    className={`p-2.5 rounded-xl border-2 text-right transition-all ${
                      activeUnitMode === 'direct'
                        ? 'theme-accent-soft border-current shadow-xs'
                        : 'theme-surface theme-border hover:opacity-85'
                    }`}
                  >
                    <div className="text-xs font-extrabold">مباشر (الرقم كما هو)</div>
                    <div className="text-[10px] theme-text-muted mt-0.5">
                      مثال: 1000 ← {formatAmountInWords(1000, settings.currencySymbol, 'direct')}
                    </div>
                  </button>
                </div>
              </div>

              <div>
                <p className="text-xs font-bold mb-2">اختر الدولة والعملة:</p>
                <div className="grid grid-cols-2 gap-2">
                  {COUNTRIES_CURRENCIES.map((c) => {
                    const isSelected = settings.currencySymbol === c.symbol;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => onSelectCurrency(c.symbol)}
                        className={`p-2.5 rounded-xl border-2 text-right transition-all active:scale-95 flex items-center justify-between gap-2 ${
                          isSelected
                            ? 'theme-accent-soft border-current font-bold shadow-xs'
                            : 'theme-border theme-surface-alt hover:opacity-85'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-extrabold truncate">{c.country}</div>
                          <div className="text-[10px] theme-text-muted truncate">{c.singular}</div>
                        </div>
                        <span className="text-sm font-extrabold font-mono shrink-0">{c.symbol}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: OFFLINE STORAGE & BACKUP */}
          {activeTab === 'storage' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl border theme-border theme-surface-alt flex items-start gap-3">
                <WifiOff className="w-5 h-5 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
                <div className="text-xs leading-relaxed">
                  <div className="font-bold mb-0.5">عمل كامل بدون إنترنت 100%</div>
                  <p className="theme-text-muted">
                    جميع الأسماء والأقساط والواصل والملاحظات محفوظة مباشرة داخل ذاكرة الهاتف المزدوجة (DOM Storage + IndexedDB) دون أي اتصال خارجي.
                  </p>
                </div>
              </div>

              {statusMsg && (
                <div
                  className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 border ${
                    statusMsg.type === 'ok'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                      : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300'
                  }`}
                >
                  {statusMsg.type === 'ok' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                  )}
                  <span>{statusMsg.text}</span>
                </div>
              )}

              <div className="p-4 rounded-xl border theme-border flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs font-bold flex items-center gap-1.5">
                    <Download className="w-4 h-4 text-emerald-600" />
                    <span>حفظ نسخة على الهاتف</span>
                  </div>
                  <p className="text-[11px] theme-text-muted mt-0.5">
                    تنزيل ملف نسخة احتياطية بجميع المديونين ({debtors.length})
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleExport}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold theme-accent-bg shrink-0 active:scale-95 transition-transform"
                >
                  حفظ ملف
                </button>
              </div>

              <div className="p-4 rounded-xl border theme-border flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs font-bold flex items-center gap-1.5">
                    <Upload className="w-4 h-4 text-blue-600" />
                    <span>استرجاع نسخة من الهاتف</span>
                  </div>
                  <p className="text-[11px] theme-text-muted mt-0.5">
                    اختيار ملف نسخة احتياطية (.json) محفوظ سابقاً
                  </p>
                </div>
                <label className="px-3.5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shrink-0 cursor-pointer active:scale-95 transition-transform">
                  <span>اختيار ملف</span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json,application/json"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="text-[11px] theme-text-muted text-center pt-1">
                عدد السجلات المحفوظة حالياً: {debtors.length} / {MAX_DEBTORS}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t theme-border flex items-center justify-between gap-2 shrink-0">
          <span className="text-[11px] theme-text-muted">
            تُحفظ التعديلات تلقائياً على الهاتف
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold theme-accent-bg transition-colors active:scale-95"
          >
            تم
          </button>
        </div>
      </div>
    </div>
  );
};
