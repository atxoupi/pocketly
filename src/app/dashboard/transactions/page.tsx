"use client";

import { useEffect, useState } from "react";
import { TransactionForm } from "@/components/transactions/TransactionForm";
import { TransactionList } from "@/components/transactions/TransactionList";

type Transaction = {
  id: string;
  accountName: string;
  amountCents: number;
  date: string;
  type: string;
  note: string | null;
  generatedFromLoanInstallmentId: string | null;
};

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let ignore = false;
    fetch("/api/transactions")
      .then((res) => res.json())
      .then((data) => {
        if (!ignore) setTransactions(data);
      });
    return () => {
      ignore = true;
    };
  }, [version]);

  const refresh = () => setVersion((v) => v + 1);

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold text-text-primary">Transacciones</h2>
      <TransactionForm onCreated={refresh} />
      <TransactionList transactions={transactions} onDeleted={refresh} />
    </div>
  );
}
