import React, { useState, useEffect } from 'react';
import { Debtor, AmountUnitMode } from '../types/ledger';
import { generateDefaultTenMonths, MAX_DEBTORS } from '../utils/storage';
import { formatAmountInWords } from '../utils/tafqeet';
import { X, UserPlus, Check, Phone, AlertTriangle } from 'lucide-react';

interface AddDebtorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currencySymbol: string;
  amountUnitMode?: AmountUnitMode;
  onSave: (debtorData: Omit<Debtor, 'id' | 'createdAt' | 'updatedAt'>) => void;
  initialDebtor?: Debtor | null;
  isAtCapacity?: boolean;
  currentCount?: number;
}

export const AddDebtorModal: React.FC<AddDebtorModalProps> = ({
  isOpen,
  onClose,
  currencySymbol,
  amountUnitMode = 'thousands',
  onSave,
  initialDebtor,
  isAtCapacity = false,
  currentCount = 0,
}) => {
  const currentYear = new Date().getFullYear().toString();
  const todayStr = new Date().toISOString().slice(0, 10);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [startDate, setStartDate] = useState(todayStr);
  const [year, setYear] = useState(currentYear);
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setName(initialDebtor?.name || '');
      setPhone(initialDebtor?.phone || '');
      setTotalAmount(initialDebtor ? String(initialDebtor.totalAmount) : '');
      setStartDate(initialDebtor?.startDate || new Date().toISOString().slice(0, 10));
      setYear(initialDebtor?.year || new Date().getFullYear().toString());
      setNotes(initialDebtor?.notes || '');
      setErrorMsg(null);
    }
  }, [isOpen, initialDebtor]);

  if (!isOpen) return null;

  const blockedByCapacity = !initialDebtor && isAtCapacity;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (blockedByCapacity) {
      setErrorMsg(`تم الوصول للحد الأقصى للسجل (${MAX_DEBTORS} زبون). يرجى حذف سجل لإضافة زبون جديد.`);
      return;
    }
    if (!name.trim()) {
      setErrorMsg('يرجى إدخال اسم المديون');
      return;
    }
    const parsedAmount = parseFloat(totalAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMsg('يرجى إدخال المبلغ الكامل بشكل صحيح');
      return;
    }

    if (initialDebtor) {
      // Editing existing debtor: preserve paid amounts and update target amounts proportionally if total changed
      const oldTotal = initialDebtor.totalAmount;
      let newMonths = initialDebtor.months;

      if (parsedAmount !== oldTotal) {
        // Re-scale target amounts for 10 months
        newMonths = generateDefaultTenMonths(parsedAmount, startDate);
      }

      const totalPaid = newMonths.reduce((s, m) => s + (m.paidAmount || 0), 0);
      const netAmount = Math.max(0, parsedAmount - totalPaid);

      onSave({
        name: name.trim(),
        phone: phone.trim(),
        totalAmount: parsedAmount,
        netAmount,
        totalPaid,
        startDate,
        year: year.trim() || currentYear,
        notes: notes.trim(),
        months: newMonths,
      });
    } else {
      // New debtor: generate fresh 10 months
      const months = generateDefaultTenMonths(parsedAmount, startDate);
      onSave({
        name: name.trim(),
        phone: phone.trim(),
        totalAmount: parsedAmount,
        netAmount: parsedAmount,
        totalPaid: 0,
        startDate,
        year: year.trim() || currentYear,
        notes: notes.trim(),
        months,
      });
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
              <UserPlus className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              {initialDebtor ? 'تعديل بيانات المديون' : `إضافة زبون جديد (${currentCount + 1} / ${MAX_DEBTORS})`}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-5 space-y-4">
          {blockedByCapacity && (
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs font-bold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>تم الوصول للحد الأقصى ({MAX_DEBTORS} زبون). يرجى حذف سجل قديم لإضافة زبون جديد.</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
          
          {/* Debtor Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              اسم المديون *
            </label>
            <input
              type="text"
              required
              placeholder="اكتب اسم المديون..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-11 px-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 focus:border-emerald-500 rounded-xl text-sm font-bold focus:outline-none"
              autoFocus
            />
          </div>

          {/* Full Debt Amount */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              المبلغ الكامل ({currencySymbol}) *
            </label>
            <div className="relative">
              <input
                type="number"
                required
                min="1"
                step="any"
                placeholder="0"
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
                className="w-full h-11 px-3.5 pl-12 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 focus:border-emerald-500 rounded-xl text-base font-mono font-bold focus:outline-none tabular-nums"
              />
              <span className="absolute left-3 top-3 text-xs font-bold text-slate-400">
                {currencySymbol}
              </span>
            </div>
            {(() => {
              const num = parseFloat(totalAmount);
              if (!isNaN(num) && num > 0) {
                return (
                  <div className="mt-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                    كتابةً: {formatAmountInWords(num, currencySymbol, amountUnitMode)}
                  </div>
                );
              }
              return null;
            })()}
            <p className="text-[11px] text-slate-400 mt-1">
              سيتم توزيع المبلغ تلقائياً على 10 أشهر بأقساط متساوية.
            </p>
          </div>

          {/* Phone */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              رقم الهاتف / الواتساب
            </label>
            <div className="relative">
              <input
                type="tel"
                placeholder="07xxxxxxxx"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full h-10 px-3.5 pl-10 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 focus:border-emerald-500 rounded-xl text-xs font-mono focus:outline-none"
              />
              <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
            </div>
          </div>

          {/* Date & Year */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                تاريخ بدء الدين
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                السنة
              </label>
              <input
                type="text"
                placeholder="2026"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono font-bold focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              الملاحظات وتفاصيل الدين
            </label>
            <textarea
              rows={3}
              placeholder="تفاصيل البضاعة، شروط السداد، الكفيل أو أي ملاحظات أخرى..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={blockedByCapacity}
              className={`flex items-center gap-1.5 px-5 py-2.5 text-xs font-bold rounded-xl transition-all ${
                blockedByCapacity
                  ? 'bg-slate-300 dark:bg-slate-700 text-slate-500 cursor-not-allowed'
                  : 'text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/20 active:scale-95'
              }`}
            >
              <Check className="w-4 h-4" />
              <span>{initialDebtor ? 'حفظ التعديلات' : 'إنشاء السجل (10 أشهر)'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
