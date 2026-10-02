"use client";

import { useEffect, useState } from "react";
import { LoanForm } from "@/components/loans/LoanForm";
import { LoanList } from "@/components/loans/LoanList";

type Loan = { id: string; name: string; principalCents: number; annualInterestRatePercent: number; termMonths: number };

export default function LoansPage() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let ignore = false;
    fetch("/api/loans")
      .then((res) => res.json())
      .then((data) => {
        if (!ignore) setLoans(data);
      });
    return () => {
      ignore = true;
    };
  }, [version]);

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold text-text-primary">Préstamos</h2>
      <LoanForm onCreated={() => setVersion((v) => v + 1)} />
      <LoanList loans={loans} />
    </div>
  );
}
