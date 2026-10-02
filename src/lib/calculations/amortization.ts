export interface AmortizationInstallment {
  installmentNumber: number;
  principalCents: number;
  interestCents: number;
  totalCents: number;
}

export function calculateFrenchAmortization(
  principalCents: number,
  annualInterestRatePercent: number,
  termMonths: number
): AmortizationInstallment[] {
  const monthlyRate = annualInterestRatePercent / 100 / 12;

  const paymentCents =
    monthlyRate === 0
      ? Math.round(principalCents / termMonths)
      : Math.round((principalCents * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -termMonths)));

  const installments: AmortizationInstallment[] = [];
  let remainingPrincipalCents = principalCents;

  for (let installmentNumber = 1; installmentNumber <= termMonths; installmentNumber++) {
    const interestCents = Math.round(remainingPrincipalCents * monthlyRate);
    const isLast = installmentNumber === termMonths;

    const principalForInstallment = isLast ? remainingPrincipalCents : paymentCents - interestCents;
    const totalCents = isLast ? principalForInstallment + interestCents : paymentCents;

    remainingPrincipalCents -= principalForInstallment;

    installments.push({
      installmentNumber,
      principalCents: principalForInstallment,
      interestCents,
      totalCents,
    });
  }

  return installments;
}
