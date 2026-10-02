export interface RemainingPrincipalPoint {
  installmentNumber: number;
  remainingPrincipalCents: number;
}

export function getRemainingPrincipalSeries(
  installments: { installmentNumber: number; principalCents: number }[]
): RemainingPrincipalPoint[] {
  const totalPrincipalCents = installments.reduce((sum, i) => sum + i.principalCents, 0);

  let paidSoFarCents = 0;
  return installments.map((installment) => {
    paidSoFarCents += installment.principalCents;
    return {
      installmentNumber: installment.installmentNumber,
      remainingPrincipalCents: totalPrincipalCents - paidSoFarCents,
    };
  });
}

export interface LoanWithInstallmentsForChart {
  id: string;
  installments: { installmentNumber: number; principalCents: number; dueDate: string }[];
}

export function buildMonthlyRemainingPrincipalRows(
  loans: LoanWithInstallmentsForChart[],
  currentMonth: string
): { months: string[]; rows: Record<string, number | string>[] } {
  const rowsByMonth = new Map<string, Record<string, number>>();

  for (const loan of loans) {
    const series = getRemainingPrincipalSeries(loan.installments);
    loan.installments.forEach((installment, idx) => {
      const monthKey = installment.dueDate.slice(0, 7);
      const row = rowsByMonth.get(monthKey) ?? {};
      row[loan.id] = series[idx].remainingPrincipalCents / 100;
      rowsByMonth.set(monthKey, row);
    });
  }

  const months = Array.from(rowsByMonth.keys());
  if (!months.includes(currentMonth)) months.push(currentMonth);
  months.sort();

  const rows = months.map((month) => ({ month, ...rowsByMonth.get(month) }));

  return { months, rows };
}
