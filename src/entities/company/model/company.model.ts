export const COMPANY_LEVELS = ['none', 'lead', 'manager', 'director', 'cto'] as const;

export type CompanyLevel = (typeof COMPANY_LEVELS)[number];

export interface Company {
  cash: number;
  unlocked: boolean;
  level: CompanyLevel;
}
