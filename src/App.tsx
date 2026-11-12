import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Debtor,
  AppSettings,
  ThemeId,
  FontSizeOption,
  FontWeightOption,
  AmountUnitMode,
} from './types/ledger';
import {
  loadDebtors,
  saveDebtors,
  loadSettings,
  saveSettings,
  syncPhoneStorageOnBoot,
  flushPhoneStorage,
  formatMoney,
  MAX_DEBTORS,
} from './utils/storage';
import { applyThemeToDocument, applyTypographyToDocument } from './utils/themes';
import { formatAmountInWords } from './utils/tafqeet';

import { DebtorListView } from './views/DebtorListView';
import { WhiteLedgerSheet } from './components/WhiteLedgerSheet';
import { AddDebtorModal } from './components/AddDebtorModal';
import { SettingsModal } from './components/SettingsModal';
import { BookOpen, Settings, Trash2, AlertTriangle, X } from 'lucide-react';

export default function App() {
  const [settings, setSettings] = useState<AppSettings>(loadSettings);
  const [debtors, setDebtors] = useState<Debtor[]>(loadDebtors);
  const [searchQuery, setSearchQuery] = useState('');

  // Top fixed summary totals (displayed on main list, hidden when inside a debtor sheet)
  const { totalFull, totalNet, totalPaid } = useMemo(() => {
    let full = 0;
    let net = 0;
    let paid = 0;
    for (let i = 0; i < debtors.length; i++) {
      full += debtors[i].totalAmount;
      net += debtors[i].netAmount;
      paid += debtors[i].totalPaid;
    }
    return { totalFull: full, totalNet: net, totalPaid: paid };
  }, [debtors]);

  // Refs to always hold latest state for exit/background flush
  const debtorsRef = useRef<Debtor[]>(debtors);
  const settingsRef = useRef<AppSettings>(settings);

  useEffect(() => {
    debtorsRef.current = debtors;
  }, [debtors]);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  // Selected debtor for the White Ledger Sheet
  const [selectedDebtor, setSelectedDebtor] = useState<Debtor | null>(null);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingDebtor, setEditingDebtor] = useState<Debtor | null>(null);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [debtorPendingDelete, setDebtorPendingDelete] = useState<Debtor | null>(null);

  // Apply active theme & typography whenever settings change
  useEffect(() => {
    applyThemeToDocument(settings.theme);
  }, [settings.theme]);

  useEffect(() => {
    applyTypographyToDocument(settings.fontSize, settings.fontWeight);
  }, [settings.fontSize, settings.fontWeight]);

  // Hydrate & mirror multi-layer phone storage on boot, and flush on exit/background/close
  useEffect(() => {
    let mounted = true;
    void syncPhoneStorageOnBoot().then(({ debtors: recoveredDebtors, settings: recoveredSettings }) => {
      if (!mounted) return;
      if (recoveredDebtors) {
        setDebtors(recoveredDebtors);
      }
      if (recoveredSettings) {
        setSettings(recoveredSettings);
      }
    });

    const handleFlush = () => {
      flushPhoneStorage(debtorsRef.current, settingsRef.current);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        handleFlush();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handleFlush);
    window.addEventListener('beforeunload', handleFlush);

    return () => {
      mounted = false;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handleFlush);
      window.removeEventListener('beforeunload', handleFlush);
    };
  }, []);

  // Phone back button & keyboard Escape key handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (debtorPendingDelete) setDebtorPendingDelete(null);
        else if (isAddModalOpen) setIsAddModalOpen(false);
        else if (isSettingsModalOpen) setIsSettingsModalOpen(false);
        else if (selectedDebtor) setSelectedDebtor(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [debtorPendingDelete, isAddModalOpen, isSettingsModalOpen, selectedDebtor]);

  // Save updated debtor (e.g. after paying an installment)
  const handleUpdateDebtor = (updatedDebtor: Debtor) => {
    const updatedList = debtors.map((d) => (d.id === updatedDebtor.id ? updatedDebtor : d));
    setDebtors(updatedList);
    saveDebtors(updatedList);
    if (selectedDebtor?.id === updatedDebtor.id) {
      setSelectedDebtor(updatedDebtor);
    }
  };

  // Delete debtor
  const handleDeleteDebtor = (debtorId: string) => {
    const updatedList = debtors.filter((d) => d.id !== debtorId);
    setDebtors(updatedList);
    saveDebtors(updatedList);
    if (selectedDebtor?.id === debtorId) {
      setSelectedDebtor(null);
    }
  };

  const handleConfirmDeleteDebtor = () => {
    if (!debtorPendingDelete) return;
    handleDeleteDebtor(debtorPendingDelete.id);
    setDebtorPendingDelete(null);
  };

  // Save new or edited debtor from modal
  const handleSaveDebtorFromModal = (debtorData: Omit<Debtor, 'id' | 'createdAt' | 'updatedAt'>) => {
    const nowIso = new Date().toISOString();

    if (editingDebtor) {
      const updated: Debtor = {
        ...editingDebtor,
        ...debtorData,
        updatedAt: nowIso,
      };
      const updatedList = debtors.map((d) => (d.id === editingDebtor.id ? updated : d));
      setDebtors(updatedList);
      saveDebtors(updatedList);
      if (selectedDebtor?.id === editingDebtor.id) {
        setSelectedDebtor(updated);
      }
      setEditingDebtor(null);
    } else {
      if (debtors.length >= MAX_DEBTORS) {
        return;
      }
      const newDebtor: Debtor = {
        ...debtorData,
        id: `debtor-${Date.now()}`,
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      const updatedList = [newDebtor, ...debtors];
      setDebtors(updatedList);
      saveDebtors(updatedList);
      setSelectedDebtor(newDebtor);
    }
  };

  // Change currency
  const handleSelectCurrency = (symbol: string) => {
    const updated = { ...settings, currencySymbol: symbol };
    setSettings(updated);
    saveSettings(updated);
  };

  // Change theme
  const handleSelectTheme = (themeId: ThemeId) => {
    const updated = { ...settings, theme: themeId };
    setSettings(updated);
    saveSettings(updated);
  };

  // Change font size
  const handleSelectFontSize = (fontSize: FontSizeOption) => {
    const updated = { ...settings, fontSize };
    setSettings(updated);
    saveSettings(updated);
  };

  // Change font weight (normal / bold / extrabold)
  const handleSelectFontWeight = (fontWeight: FontWeightOption) => {
    const updated = { ...settings, fontWeight };
    setSettings(updated);
    saveSettings(updated);
  };

  // Change amount scale mode (thousands: 1000 = مليون | direct: 1000 = ألف)
  const handleSelectAmountUnitMode = (amountUnitMode: AmountUnitMode) => {
    const updated = { ...settings, amountUnitMode };
    setSettings(updated);
    saveSettings(updated);
  };

  const activeUnitMode: AmountUnitMode = settings.amountUnitMode || 'thousands';

  // Restore offline backup from phone file
  const handleRestoreBackup = (restoredDebtors: Debtor[], restoredSettings?: AppSettings) => {
    setDebtors(restoredDebtors);
    saveDebtors(restoredDebtors);
    if (restoredSettings) {
      setSettings(restoredSettings);
      saveSettings(restoredSettings);
    }
    setSelectedDebtor(null);
  };

  return (
    <div className="min-h-screen theme-bg flex flex-col font-sans transition-colors">
      
      {/* Top Application Bar */}
      <header className="sticky top-0 z-30 theme-surface border-b no-print transition-colors backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-2">
          
          {/* Logo & Title */}
          <div
            onClick={() => setSelectedDebtor(null)}
            className="flex items-center gap-2.5 cursor-pointer min-w-0"
          >
            <div className="w-9 h-9 rounded-xl theme-accent-bg flex items-center justify-center shadow-xs shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-extrabold tracking-tight leading-none truncate">
                سجلNexa
              </h1>
              <p className="text-[11px] theme-text-muted mt-0.5 truncate">
                تخزين محلي على الهاتف · بدون إنترنت
              </p>
            </div>
          </div>

          {/* Single Settings Trigger Button (contains Fonts, Themes, Currency, Offline Storage) */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setIsSettingsModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 theme-accent-soft border theme-border rounded-xl text-xs font-bold transition-all active:scale-95"
              title="الإعدادات والتخصيص"
            >
              <Settings className="w-4 h-4" />
              <span>الإعدادات</span>
            </button>
          </div>

        </div>

        {/* Sticky Top Summary Bar: الرصيد الكلي + الديون الحالية + الديون الواصلة (hides when opening a debtor) */}
        {!selectedDebtor && (
          <div className="border-t theme-border">
            <div className="max-w-4xl mx-auto px-3 sm:px-4 py-2 grid grid-cols-3 gap-2">
              <div className="theme-surface-alt border theme-border rounded-xl px-2 py-1.5 sm:px-3 sm:py-2 text-center min-w-0">
                <span className="text-[10px] sm:text-xs font-bold theme-text-muted block truncate">
                  الرصيد الكلي
                </span>
                <span className="text-xs sm:text-sm font-extrabold font-mono tabular-nums block truncate mt-0.5">
                  {formatMoney(totalFull, settings.currencySymbol)}
                </span>
                <span className="text-[9px] sm:text-[10px] font-bold theme-text-muted block leading-tight mt-0.5 line-clamp-2">
                  {formatAmountInWords(totalFull, settings.currencySymbol, activeUnitMode)}
                </span>
              </div>

              <div className="bg-rose-50/80 dark:bg-rose-950/35 border border-rose-200/70 dark:border-rose-900/50 rounded-xl px-2 py-1.5 sm:px-3 sm:py-2 text-center min-w-0">
                <span className="text-[10px] sm:text-xs font-bold text-rose-700 dark:text-rose-300 block truncate">
                  الديون الحالية
                </span>
                <span className="text-xs sm:text-sm font-extrabold font-mono tabular-nums text-rose-700 dark:text-rose-400 block truncate mt-0.5">
                  {formatMoney(totalNet, settings.currencySymbol)}
                </span>
                <span className="text-[9px] sm:text-[10px] font-bold text-rose-700/80 dark:text-rose-300/80 block leading-tight mt-0.5 line-clamp-2">
                  {formatAmountInWords(totalNet, settings.currencySymbol, activeUnitMode)}
                </span>
              </div>

              <div className="bg-emerald-50/80 dark:bg-emerald-950/35 border border-emerald-200/70 dark:border-emerald-900/50 rounded-xl px-2 py-1.5 sm:px-3 sm:py-2 text-center min-w-0">
                <span className="text-[10px] sm:text-xs font-bold text-emerald-700 dark:text-emerald-300 block truncate">
                  الديون الواصلة
                </span>
                <span className="text-xs sm:text-sm font-extrabold font-mono tabular-nums text-emerald-700 dark:text-emerald-400 block truncate mt-0.5">
                  {formatMoney(totalPaid, settings.currencySymbol)}
                </span>
                <span className="text-[9px] sm:text-[10px] font-bold text-emerald-700/80 dark:text-emerald-300/80 block leading-tight mt-0.5 line-clamp-2">
                  {formatAmountInWords(totalPaid, settings.currencySymbol, activeUnitMode)}
                </span>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Main View Router */}
      <main className="flex-1 px-3 sm:px-4 pt-4">
        {selectedDebtor ? (
          /* THE WHITE LEDGER SHEET */
          <WhiteLedgerSheet
            debtor={selectedDebtor}
            currencySymbol={settings.currencySymbol}
            amountUnitMode={activeUnitMode}
            onBack={() => setSelectedDebtor(null)}
            onUpdateDebtor={handleUpdateDebtor}
            onDeleteDebtor={(id) => {
              const target = debtors.find((d) => d.id === id) || selectedDebtor;
              if (target) setDebtorPendingDelete(target);
            }}
            onEditDebtor={(d) => {
              setEditingDebtor(d);
              setIsAddModalOpen(true);
            }}
          />
        ) : (
          /* MAIN SCREEN: SEARCH & NAMES OF DEBTORS */
          <DebtorListView
            debtors={debtors}
            currencySymbol={settings.currencySymbol}
            amountUnitMode={activeUnitMode}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onSelectDebtor={(d) => {
              setSelectedDebtor(d);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onOpenAddDebtor={() => {
              setEditingDebtor(null);
              setIsAddModalOpen(true);
            }}
            onRequestDeleteDebtor={(d) => setDebtorPendingDelete(d)}
          />
        )}
      </main>

      {/* Add / Edit Debtor Modal */}
      <AddDebtorModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingDebtor(null);
        }}
        currencySymbol={settings.currencySymbol}
        amountUnitMode={activeUnitMode}
        onSave={handleSaveDebtorFromModal}
        initialDebtor={editingDebtor}
        isAtCapacity={debtors.length >= MAX_DEBTORS}
        currentCount={debtors.length}
      />

      {/* Unified Settings Modal (Fonts, Themes, Currency, Storage) */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        settings={settings}
        debtors={debtors}
        onSelectTheme={handleSelectTheme}
        onSelectCurrency={handleSelectCurrency}
        onSelectFontSize={handleSelectFontSize}
        onSelectFontWeight={handleSelectFontWeight}
        onSelectAmountUnitMode={handleSelectAmountUnitMode}
        onRestoreBackup={handleRestoreBackup}
      />

      {/* Delete Debtor Confirmation Modal */}
      {debtorPendingDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setDebtorPendingDelete(null)}
        >
          <div
            className="theme-surface border rounded-2xl p-5 w-full max-w-sm shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold">حذف المديون</h3>
                  <p className="text-xs theme-text-muted">تأكيد إزالة السجل من الهاتف</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDebtorPendingDelete(null)}
                className="p-1.5 rounded-lg theme-text-muted hover:opacity-80"
                aria-label="إغلاق"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="theme-surface-alt border theme-border rounded-xl p-3.5 mb-4 space-y-1.5">
              <div className="text-sm font-extrabold">{debtorPendingDelete.name}</div>
              <div className="flex items-center justify-between text-xs theme-text-muted">
                <span>المبلغ الكامل:</span>
                <span className="font-mono font-bold tabular-nums">
                  {formatMoney(debtorPendingDelete.totalAmount, settings.currencySymbol)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="theme-text-muted">المبلغ الصافي (الباقي):</span>
                <span className="font-mono font-bold tabular-nums text-rose-600 dark:text-rose-400">
                  {formatMoney(debtorPendingDelete.netAmount, settings.currencySymbol)}
                </span>
              </div>
            </div>

            <p className="text-xs theme-text-muted leading-relaxed mb-4">
              هل أنت متأكد من حذف هذا المديون؟ سيتم حذف ورقة الديوان وجميع بيانات الأقساط والدفعات المسجلة على هاتفك نهائياً ولا يمكن التراجع عن ذلك.
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleConfirmDeleteDebtor}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-all active:scale-95"
              >
                <Trash2 className="w-4 h-4" />
                <span>تأكيد الحذف نهائياً</span>
              </button>
              <button
                type="button"
                onClick={() => setDebtorPendingDelete(null)}
                className="py-2.5 px-4 theme-surface-alt border theme-border text-xs sm:text-sm font-bold rounded-xl hover:opacity-80 transition-all"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
