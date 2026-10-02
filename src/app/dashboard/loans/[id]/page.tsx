"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { InstallmentTable, type Installment } from "@/components/loans/InstallmentTable";
import { EarlyRepaymentForm } from "@/components/loans/EarlyRepaymentForm";

type LoanDetail = {
  id: string;
  name: string;
  principalCents: number;
  installments: Installment[];
};

export default function LoanDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
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

  async function handleDelete() {
    if (!window.confirm(`¿Borrar el préstamo "${loan?.name}"? Esta acción no se puede deshacer.`)) return;
    await fetch(`/api/loans/${params.id}`, { method: "DELETE" });
    router.push("/dashboard/loans");
  }

  if (!loan) return <p className="text-text-secondary">Cargando...</p>;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-text-primary">{loan.name}</h2>
        <button onClick={handleDelete} className="rounded border border-negative px-3 py-1 text-sm text-negative">
          Borrar préstamo
        </button>
      </div>
      <EarlyRepaymentForm loanId={loan.id} onDone={() => setVersion((v) => v + 1)} />
      <InstallmentTable installments={loan.installments} onPay={handlePay} />
    </div>
  );
}
