import { AmountUnitMode } from '../types/ledger';

export interface CountryCurrency {
  id: string;
  country: string;
  symbol: string;
  singular: string;
  dual: string;
  plural: string;
  isFeminine?: boolean;
}

export const COUNTRIES_CURRENCIES: CountryCurrency[] = [
  {
    id: 'IQ',
    country: 'العراق',
    symbol: 'د.ع',
    singular: 'دينار عراقي',
    dual: 'ديناران عراقيان',
    plural: 'دنانير عراقية',
  },
  {
    id: 'SA',
    country: 'السعودية',
    symbol: 'ر.س',
    singular: 'ريال سعودي',
    dual: 'ريالان سعوديان',
    plural: 'ريالات سعودية',
  },
  {
    id: 'EG',
    country: 'مصر',
    symbol: 'ج.م',
    singular: 'جنيه مصري',
    dual: 'جنيهان مصريان',
    plural: 'جنيهات مصرية',
  },
  {
    id: 'US',
    country: 'أمريكا / دولي',
    symbol: '$',
    singular: 'دولار أمريكي',
    dual: 'دولاران أمريكيان',
    plural: 'دولارات أمريكية',
  },
  {
    id: 'AE',
    country: 'الإمارات',
    symbol: 'د.إ',
    singular: 'درهم إماراتي',
    dual: 'درهمان إماراتيان',
    plural: 'دراهم إماراتية',
  },
  {
    id: 'KW',
    country: 'الكويت',
    symbol: 'د.ك',
    singular: 'دينار كويتي',
    dual: 'ديناران كويتيان',
    plural: 'دنانير كويتية',
  },
  {
    id: 'JO',
    country: 'الأردن',
    symbol: 'د.أ',
    singular: 'دينار أردني',
    dual: 'ديناران أردنيان',
    plural: 'دنانير أردنية',
  },
  {
    id: 'QA',
    country: 'قطر',
    symbol: 'ر.ق',
    singular: 'ريال قطري',
    dual: 'ريالان قطريان',
    plural: 'ريالات قطرية',
  },
  {
    id: 'LB',
    country: 'لبنان',
    symbol: 'ل.ل',
    singular: 'ليرة لبنانية',
    dual: 'ليرتان لبنانيتان',
    plural: 'ليرات لبنانية',
    isFeminine: true,
  },
  {
    id: 'SY',
    country: 'سوريا',
    symbol: 'ل.س',
    singular: 'ليرة سورية',
    dual: 'ليرتان سوريتان',
    plural: 'ليرات سورية',
    isFeminine: true,
  },
  {
    id: 'BH',
    country: 'البحرين',
    symbol: 'د.ب',
    singular: 'دينار بحريني',
    dual: 'ديناران بحرينيان',
    plural: 'دنانير بحرينية',
  },
  {
    id: 'OM',
    country: 'عُمان',
    symbol: 'ر.ع',
    singular: 'ريال عماني',
    dual: 'ريالان عمانيان',
    plural: 'ريالات عمانية',
  },
  {
    id: 'YE',
    country: 'اليمن',
    symbol: 'ر.ي',
    singular: 'ريال يمني',
    dual: 'ريالان يمنيان',
    plural: 'ريالات يمنية',
  },
  {
    id: 'MA',
    country: 'المغرب',
    symbol: 'د.م',
    singular: 'درهم مغربي',
    dual: 'درهمان مغربيان',
    plural: 'دراهم مغربية',
  },
];

export function getCountryCurrency(symbol?: string): CountryCurrency {
  return (
    COUNTRIES_CURRENCIES.find((c) => c.symbol === symbol) ||
    COUNTRIES_CURRENCIES[0]
  );
}

const ONES_MASC = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة'];
const ONES_FEM = ['', 'واحدة', 'اثنتان', 'ثلاث', 'أربع', 'خمس', 'ست', 'سبع', 'ثماني', 'تسع'];
const TEENS_MASC = [
  'عشرة',
  'أحد عشر',
  'اثنا عشر',
  'ثلاثة عشر',
  'أربعة عشر',
  'خمسة عشر',
  'ستة عشر',
  'سبعة عشر',
  'ثمانية عشر',
  'تسعة عشر',
];
const TEENS_FEM = [
  'عشر',
  'إحدى عشرة',
  'اثنتا عشرة',
  'ثلاث عشرة',
  'أربع عشرة',
  'خمس عشرة',
  'ست عشرة',
  'سبع عشرة',
  'ثماني عشرة',
  'تسع عشرة',
];
const TENS = ['', 'عشرة', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
const HUNDREDS = ['', 'مئة', 'مئتان', 'ثلاثمئة', 'أربعمئة', 'خمسمئة', 'ستمئة', 'سبعمئة', 'ثمانمئة', 'تسمئة'];

function convertBelow1000(n: number, feminine: boolean = false): string {
  if (n <= 0) return '';
  const parts: string[] = [];

  const h = Math.floor(n / 100);
  const rem = n % 100;

  if (h > 0) {
    parts.push(HUNDREDS[h]);
  }

  if (rem > 0) {
    const ones = feminine ? ONES_FEM : ONES_MASC;
    const teens = feminine ? TEENS_FEM : TEENS_MASC;

    if (rem < 10) {
      parts.push(ones[rem]);
    } else if (rem < 20) {
      parts.push(teens[rem - 10]);
    } else {
      const unit = rem % 10;
      const ten = Math.floor(rem / 10);
      if (unit > 0) {
        parts.push(`${ones[unit]} و${TENS[ten]}`);
      } else {
        parts.push(TENS[ten]);
      }
    }
  }

  return parts.join(' و');
}

export function integerToArabicWords(num: number, feminineUnit: boolean = false): string {
  const n = Math.floor(Math.abs(num));
  if (n === 0) return 'صفر';

  const groups: number[] = [];
  let temp = n;
  while (temp > 0) {
    groups.push(temp % 1000);
    temp = Math.floor(temp / 1000);
  }

  const scales = [
    { singular: '', dual: '', dualAlone: '', plural: '' },
    { singular: 'ألف', dual: 'ألفان', dualAlone: 'ألفا', plural: 'آلاف' },
    { singular: 'مليون', dual: 'مليونان', dualAlone: 'مليونا', plural: 'ملايين' },
    { singular: 'مليار', dual: 'ملياران', dualAlone: 'مليارا', plural: 'مليارات' },
    { singular: 'تريليون', dual: 'تريليونان', dualAlone: 'تريليونا', plural: 'تريليونات' },
  ];

  const parts: string[] = [];

  for (let i = groups.length - 1; i >= 0; i--) {
    const g = groups[i];
    if (g === 0) continue;

    if (i === 0) {
      parts.push(convertBelow1000(g, feminineUnit));
    } else {
      const scale = scales[i] || scales[scales.length - 1];
      const hasLowerNonZero = groups.slice(0, i).some((x) => x > 0);

      if (g === 1) {
        parts.push(scale.singular);
      } else if (g === 2) {
        parts.push(hasLowerNonZero ? scale.dual : scale.dualAlone);
      } else if (g >= 3 && g <= 10) {
        parts.push(`${convertBelow1000(g, false)} ${scale.plural}`);
      } else {
        parts.push(`${convertBelow1000(g, false)} ${scale.singular}`);
      }
    }
  }

  return parts.join(' و');
}

/**
 * Converts a numeric ledger amount into Arabic words according to selected country/currency
 * and unit mode ('thousands': 1000 => مليون | 'direct': 1000 => ألف).
 */
export function formatAmountInWords(
  rawAmount: number,
  currencySymbol: string = 'د.ع',
  unitMode: AmountUnitMode = 'thousands'
): string {
  if (!Number.isFinite(rawAmount)) return '';
  const country = getCountryCurrency(currencySymbol);
  const multiplier = unitMode === 'thousands' ? 1000 : 1;
  const effective = Math.round(Math.abs(rawAmount) * multiplier);
  const prefix = rawAmount < 0 ? 'سالب ' : '';

  if (effective === 0) {
    return `صفر ${country.singular}`;
  }

  if (effective === 1) {
    return `${prefix}${country.singular} ${country.isFeminine ? 'واحدة' : 'واحد'}`;
  }

  if (effective === 2) {
    return `${prefix}${country.dual}`;
  }

  const words = integerToArabicWords(effective, Boolean(country.isFeminine));
  const unit = effective >= 3 && effective <= 10 ? country.plural : country.singular;

  return `${prefix}${words} ${unit}`.trim();
}
