import {
  money,
  moneyAdd,
  moneySub,
  roundMoney,
  moneyToNumber,
} from '../../sales/engines/money.engine.js';

export interface JournalLineInput {
  accountId: string;
  debit?: string | number;
  credit?: string | number;
  description?: string | null;
  customerId?: string | null;
  supplierId?: string | null;
}

export interface JournalValidationResult {
  valid: boolean;
  totalDebit: number;
  totalCredit: number;
  difference: number;
  errors: string[];
}

export function validateJournalBalance(lines: JournalLineInput[]): JournalValidationResult {
  const errors: string[] = [];

  if (lines.length < 2) {
    errors.push('Journal must have at least two lines');
  }

  let totalDebit = money(0);
  let totalCredit = money(0);

  for (const [index, line] of lines.entries()) {
    const debit = money(line.debit ?? 0);
    const credit = money(line.credit ?? 0);

    if (debit.lessThan(0) || credit.lessThan(0)) {
      errors.push(`Line ${String(index + 1)}: amounts cannot be negative`);
    }

    if (debit.greaterThan(0) && credit.greaterThan(0)) {
      errors.push(`Line ${String(index + 1)}: cannot have both debit and credit`);
    }

    if (debit.isZero() && credit.isZero()) {
      errors.push(`Line ${String(index + 1)}: must have either debit or credit`);
    }

    totalDebit = moneyAdd(totalDebit, debit);
    totalCredit = moneyAdd(totalCredit, credit);
  }

  const difference = moneySub(totalDebit, totalCredit);
  if (!difference.isZero()) {
    errors.push(
      `Journal is unbalanced: debit ${String(moneyToNumber(totalDebit))} != credit ${String(moneyToNumber(totalCredit))}`,
    );
  }

  return {
    valid: errors.length === 0,
    totalDebit: moneyToNumber(roundMoney(totalDebit)),
    totalCredit: moneyToNumber(roundMoney(totalCredit)),
    difference: moneyToNumber(roundMoney(difference)),
    errors,
  };
}

export function buildReversalLines(
  lines: { accountId: string; debit: number; credit: number; description?: string | null }[],
): JournalLineInput[] {
  return lines.map((line) => ({
    accountId: line.accountId,
    debit: line.credit,
    credit: line.debit,
    description: line.description ? `Reversal: ${line.description}` : 'Reversal',
  }));
}

export function assertBalancedJournal(lines: JournalLineInput[]): void {
  const result = validateJournalBalance(lines);
  if (!result.valid) {
    throw new Error(result.errors.join('; '));
  }
}
