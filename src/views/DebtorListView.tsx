import React, { useState, useMemo, useEffect } from 'react';
import { Debtor, AmountUnitMode } from '../types/ledger';
import { formatMoney, formatDateAr, MAX_DEBTORS } from '../utils/storage';
import { formatAmountInWords } from '../utils/tafqeet';
import { 
  Search, 
  UserPlus, 
  ChevronLeft, 
  FileText,
  Trash2,
  Users,
  AlertCircle
} from 'lucide-react';

interface DebtorListViewProps {
  debtors: Debtor[];
  currencySymbol: string;
  amountUnitMode?: AmountUnitMode;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onSelectDebtor: (debtor: Debtor) => void;
  onOpenAddDebtor: () => void;
  onRequestDeleteDebtor: (debtor: Debtor) => void;
}

type StatusFilter = 'all' | 'active' | 'paid';

const PAGE_SIZE = 50;

export const DebtorListView: React.FC<DebtorListViewProps> = ({
  debtors,
  currencySymbol,
  amountUnitMode = 'thousands',
  searchQuery,
  onSearchChange,
  onSelectDebtor,
  onOpenAddDebtor,
  onRequestDeleteDebtor,
}) => {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [visibleCount, setVisibleCount] = useState<number>(PAGE_SIZE);

  // Reset pagination when search query or filter changes
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [searchQuery, statusFilter]);

  const isAtCapacity = debtors.length >= MAX_DEBTORS;
  const capacityPercent = Math.min(100, Math.round((debtors.length / MAX_DEBTORS) * 100));

  // Filter debtors by name or phone + status tab
  const filteredDebtors = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return debtors.filter((d) => {
      if (statusFilter === 'active' && d.netAmount <= 0) return false;
      if (statusFilter === 'paid' && d.netAmount > 0) return false;
      if (!q) return true;
      return d.name.toLowerCase().includes(q) || d.phone.includes(q);
    });
  }, [debtors, searchQuery, statusFilter]);

  // Visible slice for ultra-smooth scrolling even at 1000 customers
  const visibleDebtors = useMemo(
    () => filteredDebtors.slice(0, visibleCount),
    [filteredDebtors, visibleCount]
  );

  // Calculate counts & collection progress
  const { activeDebtorsCount, paidDebtorsCount, collectedPercent } = useMemo(() => {
    let full = 0;
    let paid = 0;
    let activeCount = 0;
    for (let i = 0; i < debtors.length; i++) {
      const d = debtors[i];
      full += d.totalAmount;
      paid += d.totalPaid;
      if (d.netAmount > 0) activeCount++;
    }
    const percent = full > 0 ? Math.min(100, Math.round((paid / full) * 100)) : 0;
    return {
      activeDebtorsCount: activeCount,
      paidDebtorsCount: debtors.length - activeCount,
      collectedPercent: percent,
    };
  }, [debtors]);

  return (
    <div className="max-w-4xl mx-auto space-y-4 pb-16">
      
      {/* Compact Capacity & Collection Strip */}
      <div className="theme-surface border rounded-2xl px-4 py-3 shadow-xs transition-colors">
        <div className="flex items-center justify-between gap-2 text-xs theme-text-muted mb-1.5">
          <span className="font-semibold flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" />
            <span>
              الزبائن: <strong className="font-mono text-inherit">{debtors.length}</strong> / {MAX_DEBTORS}
            </span>
          </span>
          <div className="flex items-center gap-2 text-[11px] font-mono">
            <span>نشط: {activeDebtorsCount}</span>
            <span>·</span>
            <span>التحصيل: {collectedPercent}%</span>
          </div>
        </div>
        <div className="w-full h-1.5 rounded-full theme-surface-alt overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              isAtCapacity ? 'bg-rose-500' : capacityPercent > 85 ? 'bg-amber-500' : 'bg-emerald-500'
            }`}
            style={{ width: `${capacityPercent}%` }}
          />
        </div>
      </div>

      {/* Top Search Bar & Add Button ("وفوق زر بحث بل اسم") */}
      <div className="theme-surface border p-3.5 rounded-2xl shadow-xs transition-colors space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          
          {/* Search Input by Name */}
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="بحث باسم الزبون أو رقم الهاتف..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full h-11 pl-10 pr-10 theme-surface-alt border theme-border focus:border-emerald-500 rounded-xl text-sm font-bold placeholder:text-slate-400 focus:outline-none transition-colors"
            />
            <Search className="w-4 h-4 theme-text-muted absolute top-3.5 right-3.5 pointer-events-none" />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="absolute top-3 left-3 text-xs theme-text-muted hover:opacity-80 px-1.5 py-0.5 rounded"
              >
                ✕
              </button>
            )}
          </div>

          {/* Add New Debtor Button */}
          <button
            type="button"
            onClick={onOpenAddDebtor}
            disabled={isAtCapacity}
            className={`flex items-center justify-center gap-2 h-11 px-5 rounded-xl text-xs font-bold shadow-md transition-all shrink-0 ${
              isAtCapacity
                ? 'bg-slate-300 dark:bg-slate-800 text-slate-500 cursor-not-allowed shadow-none'
                : 'theme-accent-bg active:scale-95'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>{isAtCapacity ? `وصل الحد الأقصى (${MAX_DEBTORS})` : 'إضافة مديون جديد'}</span>
          </button>
        </div>

        {/* Status Segmented Filter (useful with up to 1000 customers) */}
        {debtors.length > 0 && (
          <div className="grid grid-cols-3 gap-1.5 p-1 theme-surface-alt rounded-xl border theme-border text-xs font-bold">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`py-1.5 px-2 rounded-lg transition-all ${
                statusFilter === 'all' ? 'theme-surface shadow-xs' : 'theme-text-muted hover:opacity-80'
              }`}
            >
              الكل ({debtors.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('active')}
              className={`py-1.5 px-2 rounded-lg transition-all ${
                statusFilter === 'active' ? 'theme-surface shadow-xs text-rose-600 dark:text-rose-400' : 'theme-text-muted hover:opacity-80'
              }`}
            >
              متبقي ({activeDebtorsCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('paid')}
              className={`py-1.5 px-2 rounded-lg transition-all ${
                statusFilter === 'paid' ? 'theme-surface shadow-xs text-emerald-600 dark:text-emerald-400' : 'theme-text-muted hover:opacity-80'
              }`}
            >
              خالص ({paidDebtorsCount})
            </button>
          </div>
        )}

        {isAtCapacity && (
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs font-semibold">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>وصل السجل إلى الحد الأقصى ({MAX_DEBTORS} زبون). يمكنك تعديل الزبائن الحاليين أو حذف سجل منتهٍ لإضافة زبون جديد.</span>
          </div>
        )}
      </div>

      {/* List of Debtors ("تضهر اسماء المديونين") */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-bold theme-text-muted">
            قائمة المديونين ({filteredDebtors.length})
          </h2>
          <span className="text-[11px] theme-text-muted">
            اضغط على الاسم لفتح ورقة السجل
          </span>
        </div>

        {filteredDebtors.length === 0 ? (
          <div className="text-center py-16 theme-surface rounded-2xl border p-6">
            <FileText className="w-12 h-12 mx-auto mb-3 theme-text-muted opacity-40" />
            <h3 className="text-sm font-bold">
              {searchQuery ? 'لا يوجد مديون بهذا الاسم' : statusFilter !== 'all' ? 'لا توجد سجلات ضمن هذا التصنيف' : 'لا يوجد مديونين مسجلين'}
            </h3>
            <p className="text-xs theme-text-muted mt-1 mb-4">
              {searchQuery
                ? 'جرب البحث باسم آخر'
                : statusFilter !== 'all'
                ? 'اختر "الكل" لعرض جميع الزبائن'
                : `يمكنك استقبال وتسجيل حتى ${MAX_DEBTORS} زبون بأقساط 10 أشهر`}
            </p>
            {!searchQuery && statusFilter === 'all' && !isAtCapacity && (
              <button
                type="button"
                onClick={onOpenAddDebtor}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold theme-accent-bg rounded-xl shadow-sm active:scale-95 transition-transform"
              >
                <UserPlus className="w-4 h-4" />
                <span>إضافة مديون جديد</span>
              </button>
            )}
          </div>
        ) : (
          <>
            {visibleDebtors.map((debtor) => {
              const paidCount = debtor.months.filter((m) => m.status === 'paid').length;
              const isFullyPaid = debtor.netAmount === 0;

              return (
                <div
                  key={debtor.id}
                  onClick={() => onSelectDebtor(debtor)}
                  className="theme-surface border rounded-2xl p-4 shadow-xs hover:opacity-95 transition-all cursor-pointer group active:scale-[0.99]"
                >
                  <div className="flex items-center justify-between gap-3">
                    
                    {/* Left info: Name & Date & Months Progress */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-extrabold transition-colors truncate">
                          {debtor.name}
                        </h3>
                        {isFullyPaid ? (
                          <span className="text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-full shrink-0">
                            خالص ومسدد ✓
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-full shrink-0">
                            مسدد {paidCount} من 10 أشهر
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-xs theme-text-muted mt-1 font-mono">
                        {debtor.phone && (
                          <span>الهاتف: {debtor.phone}</span>
                        )}
                        {debtor.startDate && (
                          <>
                            {debtor.phone && <span aria-hidden="true">·</span>}
                            <span className="font-sans">
                              التاريخ: {formatDateAr(debtor.startDate)} ({debtor.year})
                            </span>
                          </>
                        )}
                      </div>

                      {/* 10 Months Step Bar Indicator */}
                      <div className="flex items-center gap-1 mt-2.5">
                        {debtor.months.map((m) => (
                          <div
                            key={m.monthIndex}
                            title={`${m.monthLabel}: ${m.status === 'paid' ? 'مسدد' : m.status === 'partial' ? 'جزئي' : 'متبقي'}`}
                            className={`h-2 flex-1 rounded-full transition-colors ${
                              m.status === 'paid'
                                ? 'bg-emerald-500'
                                : m.status === 'partial'
                                ? 'bg-amber-400'
                                : 'bg-slate-200 dark:bg-slate-700'
                            }`}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Right: Amounts (المبلغ الكامل، الواصل، الصافي) & Delete Action */}
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-left rtl:text-right">
                        <span className="text-[11px] theme-text-muted block">المبلغ الصافي:</span>
                        <span className={`text-base sm:text-lg font-extrabold font-mono tabular-nums block ${
                          isFullyPaid ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                        }`}>
                          {formatMoney(debtor.netAmount, currencySymbol)}
                        </span>
                        <span className="text-[10px] font-bold theme-text-muted block mt-0.5 max-w-[170px] sm:max-w-[230px] leading-tight">
                          {formatAmountInWords(debtor.netAmount, currencySymbol, amountUnitMode)}
                        </span>
                        <div className="text-[10px] theme-text-muted font-mono mt-0.5">
                          <span>الواصل: <strong className="text-emerald-700 dark:text-emerald-400 font-bold">{formatMoney(debtor.totalPaid, '')}</strong></span>
                          <span className="mx-1">·</span>
                          <span>الكامل: {formatMoney(debtor.totalAmount, '')}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRequestDeleteDebtor(debtor);
                        }}
                        title={`حذف ${debtor.name}`}
                        aria-label={`حذف ${debtor.name}`}
                        className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors active:scale-95"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      <div className="hidden sm:flex items-center theme-text-muted transition-colors">
                        <ChevronLeft className="w-5 h-5 rtl:rotate-0 rotate-180" />
                      </div>
                    </div>

                  </div>
                </div>
              );
            })}

            {/* Load More Button for Large Lists (up to 1000 debtors) */}
            {visibleDebtors.length < filteredDebtors.length && (
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
                  className="w-full sm:w-auto px-5 py-2.5 theme-surface border theme-border rounded-xl text-xs font-bold hover:opacity-85 transition-all active:scale-95"
                >
                  عرض {Math.min(PAGE_SIZE, filteredDebtors.length - visibleDebtors.length)} زبون إضافي ({visibleDebtors.length} من {filteredDebtors.length})
                </button>
                <button
                  type="button"
                  onClick={() => setVisibleCount(filteredDebtors.length)}
                  className="w-full sm:w-auto px-4 py-2.5 theme-surface-alt border theme-border rounded-xl text-xs font-semibold theme-text-muted hover:opacity-85 transition-all"
                >
                  عرض الكل
                </button>
              </div>
            )}
          </>
        )}
      </div>

    </div>
  );
};
