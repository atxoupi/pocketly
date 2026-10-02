"use client";

import { useEffect, useState } from "react";
import { AccountForm } from "@/components/accounts/AccountForm";
import { AccountList } from "@/components/accounts/AccountList";
import { TransferForm } from "@/components/accounts/TransferForm";

type Account = { id: string; name: string; type: string; balanceCents: number };

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let ignore = false;
    fetch("/api/accounts")
      .then((res) => res.json())
      .then((data) => {
        if (!ignore) setAccounts(data);
      });
    return () => {
      ignore = true;
    };
  }, [version]);

  const refresh = () => setVersion((v) => v + 1);

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold text-text-primary">Cuentas</h2>
      <AccountForm onCreated={refresh} />
      <TransferForm accounts={accounts} onDone={refresh} />
      <AccountList accounts={accounts} onChanged={refresh} />
    </div>
  );
}
