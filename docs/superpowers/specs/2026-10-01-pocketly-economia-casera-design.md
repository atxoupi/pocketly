# Pocketly — App de control de economía doméstica

**Fecha:** 2026-10-01
**Estado:** Aprobado por el usuario, pendiente de implementación

## Resumen

Webapp personal para controlar ingresos, gastos, remanente mensual, meta de ahorro, cuentas (principal, ahorro, etc.) y préstamos con su plan de amortización. Interfaz "profesional y limpia", estilo **Dark Finance** (fondo oscuro, acentos azul/verde neón). Toda la app requiere login; la landing es la página de login/registro.

## Decisiones de alcance (de la fase de brainstorming)

- **Multiusuario privado**: cada cuenta ve solo sus propios datos. Sin hogares compartidos.
- **Moneda**: Euro (€) fijo, formato español (`1.234,56 €`). Sin multi-divisa.
- **Meta de ahorro**: % objetivo configurable por el usuario, usado como indicador informativo sobre el remanente mensual (ingresos − gastos). Es independiente del saldo real de las cuentas: no fuerza ninguna transferencia automática, solo te dice si "deberías" poder ahorrar ese %.
- **Cuentas**: el usuario puede crear varias cuentas con nombre y tipo libre (ej. "Principal", "Ahorro", "Efectivo"), cada una con un saldo inicial. Cada transacción de ingreso/gasto se asocia a una cuenta y afecta su saldo. Las transferencias entre cuentas son un movimiento aparte que mueve saldo de una cuenta a otra sin contar como ingreso/gasto en el remanente ni en las gráficas de gastos.
- **Amortización**: sistema francés (cuota fija) únicamente. No se soportan otros sistemas en esta versión.
- **Préstamos ↔ gastos**: al marcar una cuota como pagada se genera automáticamente una transacción de gasto en categoría "Préstamos", cargada contra la cuenta de pago configurada en el préstamo, y vinculada a esa cuota.
- **Recordatorios**: banner/sección de "próximos vencimientos" visible en el dashboard. Sin notificaciones por email/push.
- **Categorías**: set predefinido + el usuario puede crear/editar/eliminar las suyas.
- **Transacciones**: soportan recurrencia (ej. nómina mensual, alquiler) que genera automáticamente las futuras instancias.

## Arquitectura y stack

- **Framework**: Next.js (App Router) + TypeScript, proyecto full-stack único.
- **Base de datos**: PostgreSQL.
- **ORM**: Prisma.
- **Autenticación**: Auth.js (NextAuth), proveedor de credenciales (email + contraseña), hash con bcrypt, sesiones JWT.
- **Gráficas**: Recharts.
- **Estilos**: Tailwind CSS, tema Dark Finance.
- **Rutas**: `/` es la landing pública de login/registro (layout de tarjeta centrada). Todo lo demás vive bajo `/dashboard/*`, protegido por middleware de sesión. Navegación por barra superior (Resumen, Transacciones, Préstamos, Ajustes).

Dependencias nuevas a introducir (confirmar antes de instalar, según las reglas del proyecto): `next-auth`, `@prisma/client` + `prisma`, `bcrypt`, `recharts`, `tailwindcss`.

## Modelo de datos

```
User
  id, email (unique), passwordHash, savingsGoalPercent, createdAt

Category
  id, userId (nullable → null = predefinida, global), name, type (income|expense), color

Account
  id, userId, name, type (ej. "checking", "savings", "cash" — texto libre/enum simple), initialBalance, createdAt
  (el saldo actual no se guarda como campo: se calcula como initialBalance + ingresos − gastos ± transferencias)

Transaction
  id, userId, accountId, categoryId, amount, date, type (income|expense), note
  isRecurring, recurrenceRule (ej. "monthly", "weekly")
  generatedFromLoanInstallmentId (nullable, FK a LoanInstallment)

Transfer
  id, userId, fromAccountId, toAccountId, amount, date, note

Loan
  id, userId, name, principal, annualInterestRate, startDate, termMonths, paymentAccountId (FK a Account)
  (sistema francés fijo; sin campo de "sistema" porque solo hay uno soportado)

LoanInstallment
  id, loanId, installmentNumber, dueDate, principalPortion, interestPortion, totalAmount
  status (pending|paid), paidTransactionId (nullable, FK a Transaction)
```

Reglas de integridad:
- Todas las queries de `Transaction`, `Category` personalizada, `Account`, `Transfer`, `Loan` y `LoanInstallment` se filtran siempre por el `userId` de la sesión activa.
- `LoanInstallment.paidTransactionId` y `Transaction.generatedFromLoanInstallmentId` son inversos de la misma relación 1:1 — se escriben en la misma operación transaccional al marcar una cuota como pagada.
- `Transfer.fromAccountId` y `toAccountId` deben pertenecer al mismo `userId` que la transferencia; no se permiten transferencias entre cuentas de usuarios distintos.
- El saldo de una cuenta en un momento dado = `initialBalance + Σ ingresos(accountId) − Σ gastos(accountId) + Σ transferencias entrantes − Σ transferencias salientes`, siempre calculado, nunca un contador que se pueda desincronizar.

## Funcionalidades

### 1. Autenticación
- Registro con email + contraseña (validación básica: email válido, contraseña mínima).
- Login con email + contraseña.
- Todas las rutas de `/dashboard/*` requieren sesión válida; redirección a `/` si no autenticado.

### 2. Cuentas y transferencias
- CRUD de cuentas: nombre, tipo (libre, ej. "Principal", "Ahorro", "Efectivo"), saldo inicial.
- Cada cuenta muestra su saldo actual, calculado (no almacenado) a partir de sus transacciones y transferencias.
- Transferencias entre cuentas propias: cuenta origen, cuenta destino, monto, fecha, nota opcional. No generan ninguna `Transaction` ni afectan el remanente/gráficas de gastos — son un movimiento puramente entre cuentas.
- Caso de uso principal: mantener algo de saldo en "Principal" y hacer crecer "Ahorro" mes a mes mediante transferencias manuales.

### 3. Transacciones (ingresos y gastos)
- CRUD completo: crear, listar (con filtros por fecha/categoría/tipo/cuenta), editar, eliminar.
- Cada transacción se asocia obligatoriamente a una cuenta (de dónde sale el gasto o a dónde entra el ingreso).
- Categorías predefinidas creadas por defecto para cada usuario nuevo (ej. Nómina, Alimentación, Transporte, Vivienda, Ocio, Salud, Préstamos, Otros) + CRUD de categorías propias.
- Transacciones recurrentes: al marcar `isRecurring` con una regla, se generan automáticamente las instancias futuras correspondientes (job al cargar el dashboard o cron simple, a definir en el plan de implementación).

### 4. Remanente y meta de ahorro
- Cálculo mensual: `remanente = Σ ingresos del mes − Σ gastos del mes` (todas las cuentas juntas; las transferencias no entran en esta suma).
- Comparación contra `savingsGoalPercent` del usuario: `% ahorro real = remanente / ingresos del mes`.
- Indicador visual (cumplido / no cumplido / superado) en el dashboard. Es un indicador informativo, independiente de cuánto hayas transferido realmente a la cuenta de Ahorro.

### 5. Préstamos y amortización
- Alta de préstamo: nombre, principal, tasa de interés anual, fecha de inicio, plazo en meses, cuenta de pago (de qué cuenta saldrán las cuotas).
- Al guardar, se calcula y persiste la tabla de amortización completa (sistema francés: cuota fija, proporción interés/capital variable).
- Vista de detalle del préstamo con la tabla completa de cuotas (fecha, capital, interés, total, estado).
- Acción "marcar como pagada" por cuota → crea transacción de gasto vinculada, categoría "Préstamos", cargada contra la cuenta de pago del préstamo.
- Banner "próximos vencimientos" en el dashboard: cuotas pendientes con fecha de vencimiento dentro de los próximos 7 días.

### 6. Dashboard / Resumen
- Barra de navegación superior: Resumen, Cuentas, Transacciones, Préstamos, Ajustes.
- Tarjetas de stats: remanente del mes, % ahorro actual vs objetivo, saldo total y por cuenta, próximos vencimientos (resumen).
- Gráficas (Recharts):
  - Evolución de saldo por cuenta (línea, últimos 12 meses) — especialmente útil para ver crecer la cuenta de Ahorro.
  - Evolución de remanente mensual (línea, últimos 12 meses).
  - Gastos por categoría del mes (barras o donut).
  - Ingresos vs gastos (barras comparativas, últimos 12 meses).
  - Progreso de amortización por préstamo (línea de capital pendiente a lo largo del tiempo).

### 7. Ajustes
- Editar % de ahorro objetivo.
- Gestionar categorías propias.
- Gestionar cuentas (crear, renombrar, archivar).
- Cambiar contraseña.

## Diseño visual (validado con mockups)

- **Estilo**: Dark Finance — fondo `#0f172a`, superficies `#1e293b`, acento primario azul `#38bdf8`, acento positivo verde `#4ade80`.
- **Landing**: tarjeta de login/registro centrada sobre fondo oscuro de pantalla completa.
- **Dashboard**: barra de navegación superior horizontal (no sidebar), contenido a ancho completo debajo — prioriza buen comportamiento en pantallas estrechas.

## Seguridad

- Contraseñas con hash bcrypt, nunca en texto plano ni en logs.
- Todas las queries a datos financieros filtradas por `userId` de la sesión — ninguna ruta debe permitir acceso a datos de otro usuario por manipulación de IDs en la URL/body.
- Sesiones JWT de Auth.js, cookies `httpOnly`.
- Validación de inputs en servidor (no confiar solo en validación de cliente) para montos, fechas y porcentajes.

## Testing

- **Unitarios** (máxima prioridad, lógica con más riesgo de error):
  - Cálculo de tabla de amortización sistema francés (cuota fija, split capital/interés, cuadre final a cero).
  - Cálculo de remanente y % de ahorro real vs objetivo.
  - Generación de instancias de transacciones recurrentes.
  - Cálculo de saldo de cuenta (inicial + ingresos − gastos ± transferencias) en distintos escenarios.
- **Integración**:
  - Flujo de registro/login y protección de rutas de `/dashboard/*`.
  - CRUD de transacciones, categorías y cuentas, respetando aislamiento por `userId`.
  - Crear una transferencia entre dos cuentas propias → verificar que ambos saldos se actualizan y que no aparece como ingreso/gasto.
  - Marcar cuota de préstamo como pagada → verificar que se crea la transacción vinculada correctamente contra la cuenta de pago del préstamo.

## Fuera de alcance (v1)

- Multi-divisa.
- Hogares/cuentas compartidas entre varios usuarios.
- Notificaciones por email o push.
- Sistemas de amortización distintos al francés.
- Transferencias automáticas/programadas hacia la cuenta de Ahorro (todas son manuales en v1).
- Login social (Google, etc.).

## Próximos pasos

Pasar este spec a un plan de implementación detallado (skill `writing-plans`), fasado sugerido:
1. Scaffolding del proyecto (Next.js, Prisma, Postgres, Tailwind, Auth.js) + landing de login/registro.
2. Modelo de datos + CRUD de cuentas, transferencias, transacciones y categorías + cálculo de saldo/remanente/ahorro.
3. Préstamos: alta, cálculo de amortización francesa, vista de tabla, marcar cuota pagada (contra cuenta de pago).
4. Dashboard: stats, banner de vencimientos, gráficas con Recharts (incluye evolución de saldo por cuenta).
5. Ajustes y pulido visual final.
