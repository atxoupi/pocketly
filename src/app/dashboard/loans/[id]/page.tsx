"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { InstallmentTable, type Installment } from "@/components/loans/InstallmentTable";

type LoanDetail = {
  id: string;
  name: string;
  principalCents: number;
  installments: Installment[];
};

export default function LoanDetailPage() {
  const params = useParams<{ id: string }>();
  const [loan, setLoan] = useState<LoanDetail | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let ignore = false;
    fetch(`/api/loans/${params.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (!ignore) setLoan(data);
      });
    return () => {
      ignore = true;
    };
  }, [params.id, version]);

  async function handlePay(installmentId: string) {
    await fetch(`/api/loans/${params.id}/installments/${installmentId}/pay`, { method: "POST" });
    setVersion((v) => v + 1);
  }

  if (!loan) return <p className="text-text-secondary">Cargando...</p>;

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold text-text-primary">{loan.name}</h2>
      <InstallmentTable installments={loan.installments} onPay={handlePay} />
    </div>
  );
}
