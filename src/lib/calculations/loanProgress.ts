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
