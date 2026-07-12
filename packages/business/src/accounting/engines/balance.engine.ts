import type { AccountType, NormalBalance } from '@goldos/database';

import {
  money,
  moneyAdd,
  moneySub,
  roundMoney,
  moneyToNumber,
} from '../../sales/engines/money.engine.js';

export function computeAccountBalance(params: {
  normalBalance: NormalBalance;
  debitTotal: string | number;
  creditTotal: string | number;
}): number {
  const debit = money(params.debitTotal);
  const credit = money(params.creditTotal);

  const balance =
    params.normalBalance === 'DEBIT' ? moneySub(debit, credit) : moneySub(credit, debit);

  return moneyToNumber(roundMoney(balance));
}

export function applyLineToBalance(params: {
  normalBalance: NormalBalance;
  currentDebit: string | number;
  currentCredit: string | number;
  lineDebit: string | number;
  lineCredit: string | number;
}): { debitTotal: number; creditTotal: number; balance: number } {
  const debitTotal = moneyAdd(params.currentDebit, params.lineDebit);
  const creditTotal = moneyAdd(params.currentCredit, params.lineCredit);

  return {
    debitTotal: moneyToNumber(roundMoney(debitTotal)),
    creditTotal: moneyToNumber(roundMoney(creditTotal)),
    balance: computeAccountBalance({
      normalBalance: params.normalBalance,
      debitTotal: moneyToNumber(roundMoney(debitTotal)),
      creditTotal: moneyToNumber(roundMoney(creditTotal)),
    }),
  };
}

export function isDebitAccount(accountType: AccountType): boolean {
  return accountType === 'ASSET' || accountType === 'EXPENSE' || accountType === 'COGS';
}

export function defaultNormalBalance(accountType: AccountType): NormalBalance {
  return isDebitAccount(accountType) ? 'DEBIT' : 'CREDIT';
}
