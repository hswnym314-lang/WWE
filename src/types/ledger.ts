export interface MonthInstallment {
  monthIndex: number; // 1 to 10
  monthLabel: string; // "الشهر الأول", "الشهر الثاني", etc.
  dueDate: string; // YYYY-MM-DD
  targetAmount: number; // المبلغ المطلوب للشهر
  paidAmount: number; // المبلغ المسدد
  status: 'unpaid' | 'partial' | 'paid';
  paidDate?: string; // تاريخ السداد
  notes?: string; // ملاحظة هذا الشهر
}

export interface Debtor {
  id: string;
  name: string;
  phone: string;
  totalAmount: number; // المبلغ الكامل
  netAmount: number; // المبلغ الصافي (المتبقي بعد خصم المدفوع)
  totalPaid: number; // المبلغ المسدد حتى الآن
  startDate: string; // التاريخ (اليوم والشهر)
  year: string; // السنة
  notes: string; // الملاحظات
  months: MonthInstallment[]; // تدريجياً لحد 10 أشهر
  createdAt: string;
  updatedAt: string;
}

export type ThemeId =
  | 'light'
  | 'dark'
  | 'diwan'
  | 'royal'
  | 'forest'
  | 'burgundy';

export type FontSizeOption = 'small' | 'medium' | 'large' | 'xlarge';

export type FontWeightOption = 'normal' | 'bold' | 'extrabold';

export type AmountUnitMode = 'thousands' | 'direct';

export interface AppSettings {
  storeName: string;
  currencySymbol: string;
  phone?: string;
  theme: ThemeId;
  fontSize?: FontSizeOption;
  fontWeight?: FontWeightOption;
  amountUnitMode?: AmountUnitMode;
}
