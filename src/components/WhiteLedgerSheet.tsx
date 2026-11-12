import React, { useState } from 'react';
import { Debtor, MonthInstallment, AmountUnitMode } from '../types/ledger';
import { formatMoney, formatDateAr, getWhatsAppShareText, getDebtorStatementText } from '../utils/storage';
import { formatAmountInWords } from '../utils/tafqeet';
import { 
  ArrowRight, 
  Printer, 
  Share2, 
  Copy,
  Coins, 
  Scale, 
  Calendar, 
  FileText, 
  CheckCircle2, 
  Clock, 
  Phone, 
  Trash2, 
  Edit3, 
  Check, 
  RotateCcw, 
  PenTool,
  X
} from 'lucide-react';

interface WhiteLedgerSheetProps {
  debtor: Debtor;
  currencySymbol: string;
  amountUnitMode?: AmountUnitMode;
  onBack: () => void;
  onUpdateDebtor: (updatedDebtor: Debtor) => void;
  onDeleteDebtor: (id: string) => void;
  onEditDebtor: (debtor: Debtor) => void;
}

export const WhiteLedgerSheet: React.FC<WhiteLedgerSheetProps> = ({
  debtor,
  currencySymbol,
  amountUnitMode = 'thousands',
  onBack,
  onUpdateDebtor,
  onDeleteDebtor,
  onEditDebtor,
}) => {
  // Inline manual editing of a specific month's "الواصل"
  const [editingMonthIndex, setEditingMonthIndex] = useState<number | null>(null);
  const [manualPaidInput, setManualPaidInput] = useState<string>('');
  const [manualNoteInput, setManualNoteInput] = useState<string>('');

  // Top General Manual "تسجيل واصل بيدك" Modal State
  const [isManualPaymentModalOpen, setIsManualPaymentModalOpen] = useState(false);
  const [generalPaidAmount, setGeneralPaidAmount] = useState<string>('');
  const [selectedTargetMonth, setSelectedTargetMonth] = useState<string>('auto'); // 'auto' or '1'..'10'
  const [generalPaymentDate, setGeneralPaymentDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [generalPaymentNotes, setGeneralPaymentNotes] = useState<string>('استلمت بيدي نقداً');

  const [copied, setCopied] = useState(false);

  // Print function
  const handlePrint = () => {
    window.print();
  };

  // Offline copy text to clipboard
  const handleCopyStatement = async () => {
    const text = getDebtorStatementText(debtor, currencySymbol, amountUnitMode);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // WhatsApp share
  const handleShareWhatsApp = () => {
    const url = getWhatsAppShareText(debtor, currencySymbol, amountUnitMode);
    window.open(url, '_blank');
  };

  // Helper to recalculate debtor's net and total paid from months
  const syncDebtorFromMonths = (newMonths: MonthInstallment[]) => {
    const totalPaid = newMonths.reduce((sum, m) => sum + (m.paidAmount || 0), 0);
    const netAmount = Math.max(0, debtor.totalAmount - totalPaid);

    const updated: Debtor = {
      ...debtor,
      months: newMonths,
      totalPaid,
      netAmount,
      updatedAt: new Date().toISOString(),
    };

    onUpdateDebtor(updated);
  };

  // Save manual payment for a specific month (تسجيل الواصل بيدك لهذا الشهر)
  const handleSaveMonthManualPayment = (monthIndex: number) => {
    const parsedAmount = parseFloat(manualPaidInput);
    if (isNaN(parsedAmount) || parsedAmount < 0) {
      alert('يرجى إدخال مبلغ واصل صحيح');
      return;
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    const newMonths = debtor.months.map((m) => {
      if (m.monthIndex === monthIndex) {
        const isFull = parsedAmount >= m.targetAmount;
        const isZero = parsedAmount === 0;
        return {
          ...m,
          paidAmount: parsedAmount,
          status: isFull ? ('paid' as const) : isZero ? ('unpaid' as const) : ('partial' as const),
          paidDate: !isZero ? todayStr : undefined,
          notes: manualNoteInput.trim() || (parsedAmount > 0 ? 'استلمت بيدي' : ''),
        };
      }
      return m;
    });

    syncDebtorFromMonths(newMonths);
    setEditingMonthIndex(null);
    setManualPaidInput('');
    setManualNoteInput('');
  };

  // 1-Click Pay Full Month Installment
  const handlePayFullMonth = (monthIndex: number) => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const newMonths = debtor.months.map((m) => {
      if (m.monthIndex === monthIndex) {
        return {
          ...m,
          paidAmount: m.targetAmount,
          status: 'paid' as const,
          paidDate: todayStr,
          notes: m.notes || 'واصل بالكامل',
        };
      }
      return m;
    });

    syncDebtorFromMonths(newMonths);
  };

  // Reset/Undo month payment
  const handleResetMonth = (monthIndex: number) => {
    const newMonths = debtor.months.map((m) => {
      if (m.monthIndex === monthIndex) {
        return {
          ...m,
          paidAmount: 0,
          status: 'unpaid' as const,
          paidDate: undefined,
          notes: '',
        };
      }
      return m;
    });

    syncDebtorFromMonths(newMonths);
  };

  // Handle General Manual Payment Modal Submit (تسجيل دفعة واصلة بيدك)
  const handleGeneralPaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(generalPaidAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      alert('يرجى إدخال المبلغ الواصل بيدك بشكل صحيح');
      return;
    }

    let remainingToAllocate = parsedAmount;
    let newMonths = [...debtor.months];

    if (selectedTargetMonth === 'auto') {
      // Allocate sequentially to unpaid or partially paid months
      newMonths = newMonths.map((m) => {
        if (remainingToAllocate <= 0) return m;

        const currentPaid = m.paidAmount || 0;
        const needed = Math.max(0, m.targetAmount - currentPaid);

        if (needed > 0) {
          const allocate = Math.min(needed, remainingToAllocate);
          remainingToAllocate -= allocate;
          const newPaid = currentPaid + allocate;
          const isFull = newPaid >= m.targetAmount;

          return {
            ...m,
            paidAmount: newPaid,
            status: isFull ? ('paid' as const) : ('partial' as const),
            paidDate: generalPaymentDate,
            notes: generalPaymentNotes.trim() || 'واصل بيدي',
          };
        }
        return m;
      });
    } else {
      // Allocate to specific chosen month index
      const targetIdx = parseInt(selectedTargetMonth, 10);
      newMonths = newMonths.map((m) => {
        if (m.monthIndex === targetIdx) {
          const newPaid = (m.paidAmount || 0) + parsedAmount;
          const isFull = newPaid >= m.targetAmount;
          return {
            ...m,
            paidAmount: newPaid,
            status: isFull ? ('paid' as const) : ('partial' as const),
            paidDate: generalPaymentDate,
            notes: generalPaymentNotes.trim() || 'واصل بيدي',
          };
        }
        return m;
      });
    }

    syncDebtorFromMonths(newMonths);
    setIsManualPaymentModalOpen(false);
    setGeneralPaidAmount('');
    setGeneralPaymentNotes('استلمت بيدي نقداً');
  };

  const paidMonthsCount = debtor.months.filter((m) => m.status === 'paid').length;

  return (
    <div className="max-w-4xl mx-auto pb-16 animate-in fade-in duration-200">
      
      {/* Top Action Bar (Hidden on print) */}
      <div className="no-print flex flex-wrap items-center justify-between gap-2.5 mb-4 theme-surface border p-3 rounded-2xl shadow-xs">
        
        {/* Back Button */}
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold theme-surface-alt border theme-border rounded-xl transition-colors active:scale-95"
        >
          <ArrowRight className="w-4 h-4" />
          <span>رجوع لقائمة المديونين</span>
        </button>

        {/* Central Manual Payment CTA Button */}
        <button
          onClick={() => setIsManualPaymentModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 theme-accent-bg rounded-xl text-xs font-bold shadow-md active:scale-95 transition-all"
        >
          <PenTool className="w-4 h-4" />
          <span>تسجيل الواصل بيدك ✍️</span>
        </button>

        {/* Tools (Call, Copy Offline, WhatsApp, Print, Edit, Delete) */}
        <div className="flex items-center gap-1.5">
          {debtor.phone && (
            <a
              href={`tel:${debtor.phone}`}
              title="اتصال"
              className="p-2 theme-surface-alt border theme-border rounded-xl text-xs transition-colors"
            >
              <Phone className="w-4 h-4 text-blue-500" />
            </a>
          )}

          <button
            onClick={handleCopyStatement}
            title="نسخ الكشف (يعمل بدون إنترنت)"
            className="flex items-center gap-1 px-3 py-2 theme-surface-alt border theme-border rounded-xl text-xs font-bold transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{copied ? 'تم النسخ' : 'نسخ'}</span>
          </button>

          <button
            onClick={handleShareWhatsApp}
            title="مشاركة الكشف عبر واتساب"
            className="flex items-center gap-1 px-3 py-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 rounded-xl text-xs font-bold transition-colors"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">واتساب</span>
          </button>

          <button
            onClick={handlePrint}
            title="طباعة الورقة / PDF"
            className="flex items-center gap-1 px-3 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-xl text-xs font-bold transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">طباعة</span>
          </button>

          <button
            onClick={() => onEditDebtor(debtor)}
            title="تعديل بيانات السجل"
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            <Edit3 className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => onDeleteDebtor(debtor.id)}
            title="حذف السجل"
            className="flex items-center gap-1 px-2.5 py-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl text-xs font-bold transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            <span className="hidden sm:inline">حذف</span>
          </button>
        </div>
      </div>

      {/* THE WHITE LEDGER SHEET (ورقة بيضاء أشبه بسجل ديوان) */}
      <div className="printable-area bg-white text-slate-900 rounded-2xl shadow-xl border-2 border-slate-300 p-5 sm:p-8 relative overflow-hidden font-sans">
        
        {/* Subtle Paper Header & Title */}
        <div className="border-b-4 border-double border-slate-800 pb-4 mb-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <div className="inline-block bg-slate-900 text-white text-[11px] font-bold px-3 py-1 rounded-md mb-1.5 tracking-wide">
                سجل ديوان الحسابات والديون
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                <span>{debtor.name}</span>
                {debtor.netAmount === 0 && (
                  <span className="text-xs bg-emerald-100 text-emerald-800 border border-emerald-300 px-2.5 py-0.5 rounded-full font-bold">
                    خالص ومسدد بالكامل ✓
                  </span>
                )}
              </h1>
              {debtor.phone && (
                <p className="text-xs font-mono text-slate-600 mt-1 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>رقم الهاتف: {debtor.phone}</span>
                </p>
              )}
            </div>

            {/* Stamp Box / Badge */}
            <div className="text-left rtl:text-right border-2 border-dashed border-slate-400 p-2.5 rounded-xl bg-slate-50 text-xs">
              <span className="text-[10px] text-slate-500 block font-semibold">حالة الأقساط الشهرية:</span>
              <span className="font-extrabold text-sm font-mono text-emerald-700 block">
                مسدد {paidMonthsCount} من أصل 10 أشهر
              </span>
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                {paidMonthsCount === 10 ? 'اكتملت جميع الدفعات' : `باقي ${10 - paidMonthsCount} أشهر مستحقة`}
              </span>
            </div>
          </div>
        </div>

        {/* 5 ICONS HEADER ROW ("أيقونات فوق مكتوب بيهه: المبلغ الصافي، المبلغ الكامل، التاريخ والسنة، الملاحظات") */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 mb-6">
          
          {/* 1. المبلغ الكامل (Full Amount) */}
          <div className="bg-slate-50 border border-slate-300 rounded-xl p-3 flex items-start gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center shrink-0">
              <Coins className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span className="text-[11px] font-bold text-slate-500 block">
                المبلغ الكامل
              </span>
              <span className="text-base font-extrabold font-mono text-slate-900 tabular-nums block truncate">
                {formatMoney(debtor.totalAmount, currencySymbol)}
              </span>
              <span className="text-[10px] font-bold text-slate-600 block leading-tight mt-0.5">
                {formatAmountInWords(debtor.totalAmount, currencySymbol, amountUnitMode)}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">إجمالي أصل الدين</span>
            </div>
          </div>

          {/* 2. المبلغ الواصل (المستلم بيدك) */}
          <div className="bg-emerald-50/70 border border-emerald-300 rounded-xl p-3 flex items-start gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span className="text-[11px] font-bold text-emerald-800 block">
                المبلغ الواصل
              </span>
              <span className="text-base font-extrabold font-mono text-emerald-700 tabular-nums block truncate">
                {formatMoney(debtor.totalPaid, currencySymbol)}
              </span>
              <span className="text-[10px] font-bold text-emerald-700 block leading-tight mt-0.5">
                {formatAmountInWords(debtor.totalPaid, currencySymbol, amountUnitMode)}
              </span>
              <span className="text-[10px] text-emerald-600 block mt-0.5">المستلم بيدك حتى الآن</span>
            </div>
          </div>

          {/* 3. المبلغ الصافي (المتبقي بذمته) */}
          <div className={`border rounded-xl p-3 flex items-start gap-2.5 ${
            debtor.netAmount > 0 ? 'bg-rose-50/70 border-rose-300' : 'bg-slate-50 border-slate-300'
          }`}>
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
              debtor.netAmount > 0 ? 'bg-rose-100 text-rose-700' : 'bg-slate-200 text-slate-600'
            }`}>
              <Scale className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span className="text-[11px] font-bold text-slate-600 block">
                المبلغ الصافي
              </span>
              <span className={`text-base font-extrabold font-mono tabular-nums block truncate ${
                debtor.netAmount > 0 ? 'text-rose-700' : 'text-slate-800'
              }`}>
                {formatMoney(debtor.netAmount, currencySymbol)}
              </span>
              <span className="text-[10px] font-bold text-slate-700 block leading-tight mt-0.5">
                {formatAmountInWords(debtor.netAmount, currencySymbol, amountUnitMode)}
              </span>
              <span className="text-[10px] text-slate-500 block mt-0.5">
                {debtor.netAmount > 0 ? 'الباقي بذمته' : 'خالص بالكامل'}
              </span>
            </div>
          </div>

          {/* 4. التاريخ والسنة */}
          <div className="bg-slate-50 border border-slate-300 rounded-xl p-3 flex items-start gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span className="text-[11px] font-bold text-slate-500 block">
                التاريخ والسنة
              </span>
              <span className="text-xs sm:text-sm font-extrabold text-slate-800 block truncate">
                {debtor.startDate ? formatDateAr(debtor.startDate) : '—'}
              </span>
              <span className="text-[10px] font-mono text-slate-400 block">السنة: {debtor.year}</span>
            </div>
          </div>

        </div>

        {/* 5. الملاحظات (Notes Card) */}
        {debtor.notes && (
          <div className="bg-amber-50/50 border border-amber-200 rounded-xl p-3.5 mb-6 flex items-start gap-2 text-xs">
            <FileText className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-amber-900 block mb-0.5">الملاحظات:</span>
              <p className="text-slate-700 leading-relaxed">{debtor.notes}</p>
            </div>
          </div>
        )}

        {/* SECTION: 10 MONTHS GRADUALLY ("والاشهر تدريجيا لحد10 اشهر") */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b-2 border-slate-300 gap-2">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Clock className="w-5 h-5 text-emerald-600" />
                <span>جدول الأقساط الشهرية (تدريجياً لحد 10 أشهر)</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                يمكنك تسجيل أي مبلغ واصل بيدك مباشرة لكل شهر
              </p>
            </div>

            {/* Quick button to record received payment */}
            <button
              onClick={() => setIsManualPaymentModalOpen(true)}
              className="no-print self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs"
            >
              <PenTool className="w-3.5 h-3.5" />
              <span>تسجيل واصل بيدك</span>
            </button>
          </div>

          {/* 10 Months Rows */}
          <div className="space-y-2.5">
            {debtor.months.map((m) => {
              const isPaid = m.status === 'paid';
              const isPartial = m.status === 'partial';
              const isEditing = editingMonthIndex === m.monthIndex;
              const remainingMonth = Math.max(0, m.targetAmount - m.paidAmount);

              return (
                <div
                  key={m.monthIndex}
                  className={`border-2 rounded-xl p-3 transition-colors ${
                    isPaid
                      ? 'bg-emerald-50/40 border-emerald-300'
                      : isPartial
                      ? 'bg-amber-50/40 border-amber-300'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    
                    {/* Month Name and Due Date */}
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                        isPaid
                          ? 'bg-emerald-600 text-white'
                          : isPartial
                          ? 'bg-amber-500 text-white'
                          : 'bg-slate-200 text-slate-700'
                      }`}>
                        {m.monthIndex}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-sm text-slate-900">
                            {m.monthLabel}
                          </span>
                          {isPaid && (
                            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <Check className="w-3 h-3" />
                              <span>واصل بالكامل</span>
                            </span>
                          )}
                          {isPartial && (
                            <span className="text-[11px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                              واصل جزئياً ({formatMoney(m.paidAmount, currencySymbol)})
                            </span>
                          )}
                          {!isPaid && !isPartial && (
                            <span className="text-[11px] font-medium text-slate-400">
                              غير مسدد
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-0.5 font-mono">
                          {m.dueDate && (
                            <span>تاريخ الاستحقاق: {formatDateAr(m.dueDate)}</span>
                          )}
                          {m.paidDate && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="text-emerald-700 font-semibold">
                                تاريخ الاستلام: {formatDateAr(m.paidDate)}
                              </span>
                            </>
                          )}
                          {m.notes && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="italic text-slate-600 font-sans">{m.notes}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Financial Figures & Actions */}
                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                      
                      {/* Detailed Amounts Display (المطلوب - الواصل - الباقي) */}
                      <div className="text-left rtl:text-right text-xs">
                        <div className="flex items-baseline gap-2">
                          <span className="text-slate-400 text-[11px]">المطلوب:</span>
                          <span className="font-extrabold font-mono tabular-nums text-slate-900">
                            {formatMoney(m.targetAmount, currencySymbol)}
                          </span>
                        </div>

                        <div className="flex items-baseline gap-2 mt-0.5">
                          <span className="text-slate-400 text-[11px]">الواصل:</span>
                          <span className={`font-extrabold font-mono tabular-nums ${
                            m.paidAmount > 0 ? 'text-emerald-700 font-bold' : 'text-slate-400'
                          }`}>
                            {formatMoney(m.paidAmount, currencySymbol)}
                          </span>
                          {remainingMonth > 0 && m.paidAmount > 0 && (
                            <span className="text-rose-600 text-[10px] font-mono">
                              (باقي: {formatMoney(remainingMonth, currencySymbol)})
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Interactive Manual Buttons (Hidden on print) */}
                      <div className="no-print flex items-center gap-1.5">
                        
                        {/* Direct Manual Entry Button */}
                        <button
                          onClick={() => {
                            setEditingMonthIndex(m.monthIndex);
                            setManualPaidInput(m.paidAmount ? String(m.paidAmount) : '');
                            setManualNoteInput(m.notes || 'استلمت بيدي نقداً');
                          }}
                          className={`px-2.5 py-1.5 text-xs font-bold rounded-lg border flex items-center gap-1 transition-all ${
                            isPaid
                              ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                              : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300'
                          }`}
                          title="اكتب المبلغ الواصل بيدك لهذا الشهر"
                        >
                          <PenTool className="w-3.5 h-3.5" />
                          <span>تسجيل الواصل ✍️</span>
                        </button>

                        {/* Quick 1-Click Full Payment Button */}
                        {!isPaid && (
                          <button
                            onClick={() => handlePayFullMonth(m.monthIndex)}
                            className="px-2.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs flex items-center gap-1 active:scale-95 transition-all"
                            title="سداد كامل المبلغ المطلوب للشهر"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>سداد كامل</span>
                          </button>
                        )}

                        {/* Reset / Undo */}
                        {(isPaid || isPartial) && (
                          <button
                            onClick={() => handleResetMonth(m.monthIndex)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="تصفير / إلغاء الواصل لهذا الشهر"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                    </div>

                  </div>

                  {/* Inline Direct Input Form (اكتب الواصل بيدك) */}
                  {isEditing && (
                    <div className="no-print mt-3 pt-3 border-t border-slate-200 bg-emerald-50/60 p-3.5 rounded-xl space-y-2.5 border border-emerald-200">
                      <div className="flex items-center justify-between text-xs font-bold text-emerald-950">
                        <span className="flex items-center gap-1.5">
                          <PenTool className="w-4 h-4 text-emerald-700" />
                          <span>تسجيل الواصل بيدك لـ ({m.monthLabel})</span>
                        </span>
                        <span className="font-mono text-slate-600">
                          المطلوب للشهر: {formatMoney(m.targetAmount, currencySymbol)}
                        </span>
                      </div>

                      {/* Quick presets for common amounts */}
                      <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                        <span className="text-slate-500 font-semibold">مبالغ سريعة:</span>
                        <button
                          type="button"
                          onClick={() => setManualPaidInput(String(m.targetAmount))}
                          className="px-2 py-0.5 bg-white border border-slate-200 rounded-md font-bold text-emerald-700 hover:bg-emerald-100"
                        >
                          كامل القسط ({formatMoney(m.targetAmount, '')})
                        </button>
                        <button
                          type="button"
                          onClick={() => setManualPaidInput(String(Math.round(m.targetAmount / 2)))}
                          className="px-2 py-0.5 bg-white border border-slate-200 rounded-md font-medium text-slate-700 hover:bg-slate-100"
                        >
                          نصف القسط
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            المبلغ الواصل (المستلم بيدك) *
                          </label>
                          <input
                            type="number"
                            step="any"
                            min="0"
                            placeholder="اكتب المبلغ بيدك..."
                            value={manualPaidInput}
                            onChange={(e) => setManualPaidInput(e.target.value)}
                            className="w-full h-10 px-3 bg-white border border-emerald-400 rounded-lg text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            autoFocus
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            ملاحظة حول الواصل
                          </label>
                          <input
                            type="text"
                            placeholder="مثال: استلمت بيدي نقداً، دفعة أولى..."
                            value={manualNoteInput}
                            onChange={(e) => setManualNoteInput(e.target.value)}
                            className="w-full h-10 px-3 bg-white border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setEditingMonthIndex(null)}
                          className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                        >
                          إلغاء
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveMonthManualPayment(m.monthIndex)}
                          className="px-5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm active:scale-95 transition-all flex items-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>تثبيت الواصل بيدك</span>
                        </button>
                      </div>
                    </div>
                  )}

                </div>
              );
            })}
          </div>

        </div>

        {/* Footer of the White Ledger Sheet (Signatures & Official Seal) */}
        <div className="mt-8 pt-6 border-t-2 border-slate-800 text-xs text-slate-600">
          <div className="grid grid-cols-2 gap-8 text-center pt-2">
            <div>
              <p className="font-bold mb-8">توقيع المديون / المستلم</p>
              <div className="border-b border-dashed border-slate-400 w-36 mx-auto"></div>
            </div>
            <div>
              <p className="font-bold mb-8">ختم وتوقيع صاحب السجل</p>
              <div className="border-b border-dashed border-slate-400 w-36 mx-auto"></div>
            </div>
          </div>
          <p className="text-[10px] text-slate-400 text-center mt-6">
            سجل ديوان الحسابات والأقساط الشهرية · تم التوثيق إلكترونياً
          </p>
        </div>

      </div>

      {/* TOP MODAL: تسـجيل واصـل بيـدك (MANUAL PAYMENT DIALOG) */}
      {isManualPaymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-emerald-50/50 dark:bg-emerald-950/20">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
                  <PenTool className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    تسجيل واصل بيدك
                  </h3>
                  <p className="text-xs text-slate-500">
                    المديون: <span className="font-bold text-slate-800 dark:text-slate-200">{debtor.name}</span>
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsManualPaymentModalOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleGeneralPaymentSubmit} className="p-5 space-y-4 overflow-y-auto">
              
              {/* Debt Balances Quick Reminder */}
              <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-xs">
                <div>
                  <span className="text-slate-500 block">المبلغ الكامل:</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                    {formatMoney(debtor.totalAmount, currencySymbol)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">الصافي المتبقي:</span>
                  <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                    {formatMoney(debtor.netAmount, currencySymbol)}
                  </span>
                </div>
              </div>

              {/* Amount Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  المبلغ الواصل (المستلم بيدك) ({currencySymbol}) *
                </label>
                <input
                  type="number"
                  step="any"
                  min="1"
                  required
                  placeholder="اكتب المبلغ المستلم بيدك..."
                  value={generalPaidAmount}
                  onChange={(e) => setGeneralPaidAmount(e.target.value)}
                  className="w-full h-12 px-4 bg-slate-50 dark:bg-slate-800 border-2 border-emerald-500 rounded-xl text-lg font-mono font-bold text-slate-900 dark:text-slate-100 focus:outline-none tabular-nums"
                  autoFocus
                />
                {(() => {
                  const num = parseFloat(generalPaidAmount);
                  if (!isNaN(num) && num > 0) {
                    return (
                      <div className="mt-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                        كتابةً: {formatAmountInWords(num, currencySymbol, amountUnitMode)}
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>

              {/* Month Destination Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  توجيه الواصل إلى أي شهر؟
                </label>
                <select
                  value={selectedTargetMonth}
                  onChange={(e) => setSelectedTargetMonth(e.target.value)}
                  className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-none focus:border-emerald-500"
                >
                  <option value="auto">
                    توزيع تلقائي على الأشهر غير المسددة بالترتيب
                  </option>
                  {debtor.months.map((m) => (
                    <option key={m.monthIndex} value={String(m.monthIndex)}>
                      {m.monthLabel} (المطلوب: {formatMoney(m.targetAmount, currencySymbol)} - الواصل: {formatMoney(m.paidAmount, currencySymbol)})
                    </option>
                  ))}
                </select>
              </div>

              {/* Date */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  تاريخ استلام المبلغ
                </label>
                <input
                  type="date"
                  value={generalPaymentDate}
                  onChange={(e) => setGeneralPaymentDate(e.target.value)}
                  className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  ملاحظات الدفعة
                </label>
                <input
                  type="text"
                  placeholder="مثال: استلمت بيدي نقداً في المحل، دفعة قسط..."
                  value={generalPaymentNotes}
                  onChange={(e) => setGeneralPaymentNotes(e.target.value)}
                  className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsManualPaymentModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md shadow-emerald-600/20 active:scale-95 transition-all"
                >
                  <Check className="w-4 h-4" />
                  <span>تثبيت الواصل بيدك</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};
