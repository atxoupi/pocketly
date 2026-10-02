import { SavingsGoalForm } from "@/components/settings/SavingsGoalForm";
import { ChangePasswordForm } from "@/components/settings/ChangePasswordForm";
import { CategoryManager } from "@/components/settings/CategoryManager";

export default function SettingsPage() {
  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold text-text-primary">Ajustes</h2>
      <section className="mb-6">
        <h3 className="mb-2 text-sm font-semibold text-text-secondary">Meta de ahorro</h3>
        <SavingsGoalForm />
      </section>
      <section className="mb-6">
        <h3 className="mb-2 text-sm font-semibold text-text-secondary">Contraseña</h3>
        <ChangePasswordForm />
      </section>
      <section className="mb-6">
        <h3 className="mb-2 text-sm font-semibold text-text-secondary">Categorías</h3>
        <CategoryManager />
      </section>
    </div>
  );
}
