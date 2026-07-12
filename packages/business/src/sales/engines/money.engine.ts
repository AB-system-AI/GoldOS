import { Prisma } from '@goldos/database';

const MONEY_SCALE = 4;
const Decimal = Prisma.Decimal;
type MoneyDecimal = InstanceType<typeof Decimal>;

export function money(value: string | number | MoneyDecimal): MoneyDecimal {
  return new Decimal(value);
}

export function moneyAdd(
  a: string | number | MoneyDecimal,
  b: string | number | MoneyDecimal,
): MoneyDecimal {
  return money(a).add(money(b));
}

export function moneySub(
  a: string | number | MoneyDecimal,
  b: string | number | MoneyDecimal,
): MoneyDecimal {
  return money(a).sub(money(b));
}

export function moneyMul(
  a: string | number | MoneyDecimal,
  b: string | number | MoneyDecimal,
): MoneyDecimal {
  return money(a).mul(money(b));
}

export function moneyDiv(
  a: string | number | MoneyDecimal,
  b: string | number | MoneyDecimal,
): MoneyDecimal {
  return money(a).div(money(b));
}

export function moneyMin(
  a: string | number | MoneyDecimal,
  b: string | number | MoneyDecimal,
): MoneyDecimal {
  const left = money(a);
  const right = money(b);
  return left.lessThan(right) ? left : right;
}

export function moneyMax(
  a: string | number | MoneyDecimal,
  b: string | number | MoneyDecimal,
): MoneyDecimal {
  const left = money(a);
  const right = money(b);
  return left.greaterThan(right) ? left : right;
}

export function roundMoney(value: string | number | MoneyDecimal): MoneyDecimal {
  return money(value).toDecimalPlaces(MONEY_SCALE, Decimal.ROUND_HALF_UP);
}

export function moneyToString(value: MoneyDecimal): string {
  return roundMoney(value).toFixed(MONEY_SCALE);
}

export function moneyToNumber(value: MoneyDecimal): number {
  return roundMoney(value).toNumber();
}

export function sumMoney(values: (string | number | MoneyDecimal)[]): MoneyDecimal {
  return values.reduce<MoneyDecimal>((sum, value) => sum.add(money(value)), money(0));
}
