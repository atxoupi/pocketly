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

export function calculateTermForFixedPayment(
  remainingPrincipalCents: number,
  annualInterestRatePercent: number,
  fixedPaymentCents: number
): number {
  const monthlyRate = annualInterestRatePercent / 100 / 12;

  if (monthlyRate === 0) {
    return Math.ceil(remainingPrincipalCents / fixedPaymentCents);
  }

  const interestOnlyPaymentCents = remainingPrincipalCents * monthlyRate;
  if (fixedPaymentCents <= interestOnlyPaymentCents) {
    throw new Error("La cuota no cubre ni el interés mensual: el préstamo nunca se pagaría");
  }

  const n = -Math.log(1 - interestOnlyPaymentCents / fixedPaymentCents) / Math.log(1 + monthlyRate);
  return Math.ceil(n);
}
