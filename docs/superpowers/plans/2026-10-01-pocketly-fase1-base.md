# Pocketly — Fase 1: Base (auth, cuentas, transacciones, remanente) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir la base funcional de Pocketly: proyecto Next.js con autenticación, cuentas con saldo, transacciones (ingresos/gastos) con categorías y recurrencia, transferencias entre cuentas, y el cálculo de remanente/meta de ahorro. Al final de esta fase la app es usable de principio a fin para el día a día (sin préstamos ni gráficas, que llegan en fases 2 y 3).

**Architecture:** Next.js (App Router) + TypeScript full-stack, PostgreSQL vía Prisma, autenticación con NextAuth (credenciales + JWT), Tailwind CSS con tema "Dark Finance". Toda cantidad monetaria se almacena como entero en céntimos para evitar errores de redondeo.

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS, Prisma + PostgreSQL, NextAuth v4, bcrypt, zod, Vitest.

## Global Constraints

- **No commitear automáticamente.** Ninguna tarea ejecuta `git add`/`git commit`. Cada tarea termina añadiendo una fila a la tabla de "Commits sugeridos" al final de este documento; el usuario los ejecuta manualmente cuando quiera. (Regla global del usuario: nunca commitear sin que lo pida explícitamente.)
- **Dependencias nuevas pendientes de confirmación explícita antes de `npm install`:** `vitest` (test runner), `zod` (validación de esquemas), `@types/bcrypt`. Ya validadas en el spec: `next`, `react`, `typescript`, `tailwindcss`, `next-auth`, `prisma`, `@prisma/client`, `bcrypt`, `recharts` (recharts se usa a partir de la Fase 3). Antes de instalar las "pendientes de confirmación", el ejecutor debe parar y preguntar al usuario.
- **Dinero siempre en céntimos (enteros)**, nunca float. Campos `*Cents`. Formateo a `1.234,56 €` solo en la capa de presentación.
- **Aislamiento por usuario:** toda query a datos financieros filtra por `userId` de la sesión activa (vía `getCurrentUserId()`, ver Tarea 4).
- **TDD:** toda función de cálculo y toda ruta API lleva su test escrito antes de la implementación (test falla → implementación mínima → test pasa).
- **Estilo visual Dark Finance:** fondo `#0f172a`, superficies `#1e293b`, texto secundario `#94a3b8`, acento primario `#38bdf8`, positivo `#4ade80`, negativo `#f87171`. Moneda fija: Euro, formato español (`es-ES`).
- **Gestor de paquetes:** npm.

---

## Decisiones de implementación no explícitas en el spec (tomadas en esta fase de planificación)

- Las cantidades monetarias se modelan como `Int` en céntimos (`amountCents`, `initialBalanceCents`, etc.) en vez de `Decimal`/`Float`, para evitar errores de redondeo sin añadir una dependencia nueva de aritmética decimal.
- Para identificar las transacciones generadas por una recurrente, se añade `recurringSourceId` (auto-relación) a `Transaction`: la transacción original (`isRecurring=true`, `recurringSourceId=null`) es la plantilla; las instancias generadas automáticamente apuntan a ella vía `recurringSourceId`.
- No se usa `date-fns` ni otra librería de fechas: la recurrencia (mensual/semanal) se calcula con aritmética nativa de `Date`, suficiente para este caso.
- Las rutas API protegidas obtienen el usuario autenticado a través de `getCurrentUserId()` (una fina envoltura sobre `getServerSession`), para que los tests puedan mockear la sesión sin pasar por el flujo completo de NextAuth.

## Modelo de datos de esta fase (Prisma)

Se crea el esquema completo (incluye `Loan`/`LoanInstallment`, que se usarán en la Fase 2, para no migrar dos veces).

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id                 String   @id @default(cuid())
  email              String   @unique
  passwordHash       String
  savingsGoalPercent Float    @default(20)
  createdAt          DateTime @default(now())

  categories   Category[]
  accounts     Account[]
  transactions Transaction[]
  transfers    Transfer[]
  loans        Loan[]
}

model Category {
  id     String  @id @default(cuid())
  userId String?
  user   User?   @relation(fields: [userId], references: [id], onDelete: Cascade)
  name   String
  type   String // "income" | "expense"
  color  String

  transactions Transaction[]

  @@index([userId])
}

model Account {
  id                  String   @id @default(cuid())
  userId              String
  user                User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  name                String
  type                String // texto libre: "checking" | "savings" | "cash" | ...
  initialBalanceCents Int
  createdAt           DateTime @default(now())

  transactions  Transaction[]
  transfersFrom Transfer[]    @relation("TransferFrom")
  transfersTo   Transfer[]    @relation("TransferTo")
  loans         Loan[]

  @@index([userId])
}

model Transaction {
  id            String   @id @default(cuid())
  userId        String
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  accountId     String
  account       Account  @relation(fields: [accountId], references: [id], onDelete: Cascade)
  categoryId    String
  category      Category @relation(fields: [categoryId], references: [id])
  amountCents   Int
  date          DateTime
  type          String // "income" | "expense"
  note          String?

  isRecurring      Boolean       @default(false)
  recurrenceRule   String? // "monthly" | "weekly", solo en la plantilla
  recurringSourceId String?
  recurringSource   Transaction?  @relation("RecurrenceSeries", fields: [recurringSourceId], references: [id])
  recurringInstances Transaction[] @relation("RecurrenceSeries")

  generatedFromLoanInstallmentId String?          @unique
  generatedFromLoanInstallment   LoanInstallment? @relation("InstallmentPayment", fields: [generatedFromLoanInstallmentId], references: [id])

  @@index([userId])
  @@index([accountId])
  @@index([recurringSourceId])
}

model Transfer {
  id            String   @id @default(cuid())
  userId        String
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  fromAccountId String
  fromAccount   Account  @relation("TransferFrom", fields: [fromAccountId], references: [id])
  toAccountId   String
  toAccount     Account  @relation("TransferTo", fields: [toAccountId], references: [id])
  amountCents   Int
  date          DateTime
  note          String?

  @@index([userId])
}

model Loan {
  id                        String   @id @default(cuid())
  userId                    String
  user                      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  name                      String
  principalCents            Int
  annualInterestRatePercent Float
  startDate                 DateTime
  termMonths                Int
  paymentAccountId          String
  paymentAccount            Account  @relation(fields: [paymentAccountId], references: [id])

  installments LoanInstallment[]

  @@index([userId])
}

model LoanInstallment {
  id                String   @id @default(cuid())
  loanId            String
  loan              Loan     @relation(fields: [loanId], references: [id], onDelete: Cascade)
  installmentNumber Int
  dueDate           DateTime
  principalCents    Int
  interestCents     Int
  totalCents        Int
  status            String   @default("pending") // "pending" | "paid"

  paidTransaction Transaction? @relation("InstallmentPayment")

  @@index([loanId])
}
```

---

### Task 1: Scaffolding del proyecto + tema Dark Finance

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.js`, `tailwind.config.ts`, `postcss.config.js`, `src/app/layout.tsx`, `src/app/globals.css`, `src/app/page.tsx`, `.env.example`, `.gitignore`

**Interfaces:**
- Produces: proyecto Next.js arrancable con `npm run dev`; clases de color Tailwind `bg-surface`, `text-accent`, etc. disponibles para todas las tareas siguientes.

- [ ] **Step 1: Crear el proyecto Next.js**

Ejecutar dentro de `/home/andres/Code/pocketly` (directorio ya existente y vacío):

```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
```

Si la herramienta pregunta por inicializar git, puede dejarse como venga por defecto — no es un commit de trabajo nuestro, es la plantilla inicial.

- [ ] **Step 2: Verificar que arranca**

```bash
npm run dev
```

Expected: servidor en `http://localhost:3000` sirviendo la página de bienvenida por defecto de Next.js. Parar el servidor tras verificar (Ctrl+C).

- [ ] **Step 3: Configurar el tema Dark Finance en Tailwind**

Editar `tailwind.config.ts`:

```ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        background: "#0f172a",
        surface: "#1e293b",
        "surface-muted": "#334155",
        "text-primary": "#e2e8f0",
        "text-secondary": "#94a3b8",
        accent: "#38bdf8",
        positive: "#4ade80",
        negative: "#f87171",
      },
    },
  },
  plugins: [],
};
export default config;
```

- [ ] **Step 4: Aplicar el fondo global**

Editar `src/app/globals.css`, añadir al final (después de las directivas `@tailwind`):

```css
body {
  background-color: #0f172a;
  color: #e2e8f0;
}
```

- [ ] **Step 5: Página raíz provisional**

Reemplazar el contenido de `src/app/page.tsx` por un placeholder que se sustituirá en la Tarea 6:

```tsx
export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background">
      <h1 className="text-xl font-semibold text-accent">Pocketly</h1>
    </main>
  );
}
```

- [ ] **Step 6: Verificación manual**

```bash
npm run dev
```

Abrir `http://localhost:3000` y confirmar fondo oscuro `#0f172a` y texto "Pocketly" en azul. Parar el servidor.

- [ ] **Step 7: Registrar commit sugerido**

No ejecutar `git add`/`git commit`. Añadir la fila correspondiente a la Tarea 1 en la tabla "Commits sugeridos" al final de este documento.

---

### Task 2: Vitest + PostgreSQL (dev y test) + variables de entorno

**Files:**
- Create: `vitest.config.ts`, `tests/setup.ts`, `.env` (no versionado), `.env.example` (modificar)
- Modify: `package.json` (scripts `test`, `test:watch`)

**Interfaces:**
- Produces: comando `npm test` que corre Vitest contra una base de datos Postgres de test; alias `@/` resuelto también en tests.

- [ ] **Step 1: Confirmar con el usuario antes de instalar**

Antes de este paso, pedir confirmación explícita para instalar `vitest` (ver Global Constraints). Una vez confirmado:

```bash
npm install -D vitest
```

- [ ] **Step 2: Preparar dos bases de datos PostgreSQL**

El usuario necesita una instancia PostgreSQL accesible (local o remota) con dos bases: una de desarrollo (`pocketly_dev`) y una de test (`pocketly_test`). Si usa Docker, puede crear ambas con:

```bash
docker run --name pocketly-postgres -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:16
docker exec -it pocketly-postgres psql -U postgres -c "CREATE DATABASE pocketly_dev;"
docker exec -it pocketly-postgres psql -U postgres -c "CREATE DATABASE pocketly_test;"
```

- [ ] **Step 3: Variables de entorno**

Crear `.env` (no se versiona, ya está en `.gitignore` por defecto de `create-next-app`):

```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/pocketly_dev"
TEST_DATABASE_URL="postgresql://postgres:postgres@localhost:5432/pocketly_test"
NEXTAUTH_SECRET="generar-con-openssl-rand-base64-32"
NEXTAUTH_URL="http://localhost:3000"
```

Actualizar `.env.example` con las mismas claves sin valores reales:

```
DATABASE_URL=
TEST_DATABASE_URL=
NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000
```

- [ ] **Step 4: Configurar Vitest**

Crear `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./tests/setup.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

- [ ] **Step 5: Script de setup de tests**

Crear `tests/setup.ts` (el contenido real que limpia tablas se completa en la Tarea 3, una vez exista el cliente Prisma; por ahora solo valida que se está usando la base de test):

```ts
import { beforeAll } from "vitest";

beforeAll(() => {
  if (!process.env.DATABASE_URL?.includes("test")) {
    throw new Error(
      "Los tests deben ejecutarse contra la base de datos de test (DATABASE_URL debe contener 'test')."
    );
  }
});
```

- [ ] **Step 6: Scripts de npm**

Editar `package.json`, dentro de `"scripts"`:

```json
"test": "DATABASE_URL=\"$TEST_DATABASE_URL\" vitest run",
"test:watch": "DATABASE_URL=\"$TEST_DATABASE_URL\" vitest"
```

- [ ] **Step 7: Verificación manual**

```bash
npm test
```

Expected: Vitest arranca y reporta "No test files found" (aún no hay tests) sin lanzar el error de `tests/setup.ts`, confirmando que `TEST_DATABASE_URL` se está inyectando como `DATABASE_URL`.

- [ ] **Step 8: Registrar commit sugerido**

Añadir fila de la Tarea 2 a la tabla de commits sugeridos (no incluir `.env`, solo `.env.example`).

---

### Task 3: Esquema Prisma + migraciones + cliente + test de humo

**Files:**
- Create: `prisma/schema.prisma`, `src/lib/prisma.ts`, `tests/setup.ts` (modificar), `tests/lib/prisma.test.ts`

**Interfaces:**
- Produces: `prisma` (cliente singleton) importable desde `@/lib/prisma`, usado por todas las tareas siguientes que toquen la base de datos.

- [ ] **Step 1: Confirmar e instalar Prisma**

Prisma y `@prisma/client` ya están aprobados en el spec:

```bash
npm install -D prisma
npm install @prisma/client
npx prisma init --datasource-provider postgresql
```

(`prisma init` crea `prisma/schema.prisma` y puede regenerar `.env` — conservar las variables ya definidas en la Tarea 2, fusionando si hace falta.)

- [ ] **Step 2: Escribir el esquema completo**

Sobrescribir `prisma/schema.prisma` con el contenido mostrado en la sección "Modelo de datos de esta fase" más arriba (modelos `User`, `Category`, `Account`, `Transaction`, `Transfer`, `Loan`, `LoanInstallment`).

- [ ] **Step 3: Migrar la base de desarrollo**

```bash
npx prisma migrate dev --name init
```

Expected: migración aplicada sin errores contra `pocketly_dev`, cliente Prisma generado.

- [ ] **Step 4: Sincronizar la base de test**

```bash
DATABASE_URL="$TEST_DATABASE_URL" npx prisma migrate deploy
```

Expected: mismas tablas creadas en `pocketly_test`.

- [ ] **Step 5: Cliente Prisma singleton**

Crear `src/lib/prisma.ts`:

```ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
```

- [ ] **Step 6: Completar `tests/setup.ts` con limpieza entre tests**

Reemplazar el contenido de `tests/setup.ts`:

```ts
import { afterAll, afterEach, beforeAll } from "vitest";
import { prisma } from "@/lib/prisma";

beforeAll(() => {
  if (!process.env.DATABASE_URL?.includes("test")) {
    throw new Error(
      "Los tests deben ejecutarse contra la base de datos de test (DATABASE_URL debe contener 'test')."
    );
  }
});

afterEach(async () => {
  await prisma.$transaction([
    prisma.transaction.deleteMany(),
    prisma.transfer.deleteMany(),
    prisma.loanInstallment.deleteMany(),
    prisma.loan.deleteMany(),
    prisma.account.deleteMany(),
    prisma.category.deleteMany(),
    prisma.user.deleteMany(),
  ]);
});

afterAll(async () => {
  await prisma.$disconnect();
});
```

- [ ] **Step 7: Escribir el test de humo (debe fallar primero si se comenta el `beforeAll`, pero aquí simplemente se escribe y se corre)**

Crear `tests/lib/prisma.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";

describe("prisma client", () => {
  it("conecta y puede crear/leer/borrar un usuario", async () => {
    const user = await prisma.user.create({
      data: { email: "smoke@example.com", passwordHash: "x" },
    });
    const found = await prisma.user.findUnique({ where: { id: user.id } });
    expect(found?.email).toBe("smoke@example.com");
  });
});
```

- [ ] **Step 8: Ejecutar y verificar que pasa**

```bash
npm test
```

Expected: 1 test, PASS. Si falla por conexión, revisar `TEST_DATABASE_URL` y que la base de test tenga las migraciones aplicadas (Step 4).

- [ ] **Step 9: Registrar commit sugerido**

Añadir fila de la Tarea 3 a la tabla de commits sugeridos.

---

### Task 4: Hash de contraseñas + verificación de credenciales + sesión helper

**Files:**
- Create: `src/lib/auth/password.ts`, `tests/lib/auth/password.test.ts`
- Create: `src/lib/auth/verifyCredentials.ts`, `tests/lib/auth/verifyCredentials.test.ts`
- Create: `src/lib/auth/session.ts` (se completa en la Tarea 5, aquí solo el tipo de retorno)

**Interfaces:**
- Consumes: `prisma` de `@/lib/prisma` (Tarea 3).
- Produces: `hashPassword(password: string): Promise<string>`, `comparePassword(password: string, hash: string): Promise<boolean>`, `verifyCredentials(email: string, password: string): Promise<{ id: string; email: string } | null>` — usados por la Tarea 5 (NextAuth).

- [ ] **Step 1: Confirmar e instalar bcrypt**

```bash
npm install bcrypt
npm install -D @types/bcrypt
```

(Ambos ya validados/pendientes de confirmación según Global Constraints — confirmar `@types/bcrypt` antes de instalar.)

- [ ] **Step 2: Test que falla — hash y comparación**

Crear `tests/lib/auth/password.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { comparePassword, hashPassword } from "@/lib/auth/password";

describe("password utils", () => {
  it("hashea y verifica correctamente una contraseña correcta", async () => {
    const hash = await hashPassword("password123");
    expect(await comparePassword("password123", hash)).toBe(true);
  });

  it("rechaza una contraseña incorrecta", async () => {
    const hash = await hashPassword("password123");
    expect(await comparePassword("otra-cosa", hash)).toBe(false);
  });
});
```

- [ ] **Step 3: Ejecutar y verificar que falla**

```bash
npm test -- password.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/auth/password'`.

- [ ] **Step 4: Implementación mínima**

Crear `src/lib/auth/password.ts`:

```ts
import bcrypt from "bcrypt";

const SALT_ROUNDS = 10;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
```

- [ ] **Step 5: Ejecutar y verificar que pasa**

```bash
npm test -- password.test.ts
```

Expected: PASS (2 tests).

- [ ] **Step 6: Test que falla — verifyCredentials**

Crear `tests/lib/auth/verifyCredentials.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/password";
import { verifyCredentials } from "@/lib/auth/verifyCredentials";

describe("verifyCredentials", () => {
  it("devuelve el usuario si el email y la contraseña son correctos", async () => {
    const passwordHash = await hashPassword("password123");
    const user = await prisma.user.create({
      data: { email: "login@example.com", passwordHash },
    });
    const result = await verifyCredentials("login@example.com", "password123");
    expect(result).toEqual({ id: user.id, email: user.email });
  });

  it("devuelve null si la contraseña es incorrecta", async () => {
    const passwordHash = await hashPassword("password123");
    await prisma.user.create({ data: { email: "login2@example.com", passwordHash } });
    const result = await verifyCredentials("login2@example.com", "mala-contraseña");
    expect(result).toBeNull();
  });

  it("devuelve null si el email no existe", async () => {
    const result = await verifyCredentials("no-existe@example.com", "password123");
    expect(result).toBeNull();
  });
});
```

- [ ] **Step 7: Ejecutar y verificar que falla**

```bash
npm test -- verifyCredentials.test.ts
```

Expected: FAIL — módulo no encontrado.

- [ ] **Step 8: Implementación mínima**

Crear `src/lib/auth/verifyCredentials.ts`:

```ts
import { prisma } from "@/lib/prisma";
import { comparePassword } from "./password";

export async function verifyCredentials(
  email: string,
  password: string
): Promise<{ id: string; email: string } | null> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return null;
  const valid = await comparePassword(password, user.passwordHash);
  if (!valid) return null;
  return { id: user.id, email: user.email };
}
```

- [ ] **Step 9: Ejecutar y verificar que pasa**

```bash
npm test -- verifyCredentials.test.ts
```

Expected: PASS (3 tests).

- [ ] **Step 10: Registrar commit sugerido**

Añadir fila de la Tarea 4 a la tabla de commits sugeridos.

---

### Task 5: NextAuth (credenciales + JWT) + middleware de protección + helper de sesión

**Files:**
- Create: `src/lib/auth/options.ts`, `src/app/api/auth/[...nextauth]/route.ts`, `src/lib/auth/session.ts`
- Create: `src/middleware.ts`, `tests/middleware.test.ts`
- Modify: `src/types/next-auth.d.ts` (ampliar tipos de sesión)

**Interfaces:**
- Consumes: `verifyCredentials` (Tarea 4).
- Produces: `getCurrentUserId(): Promise<string | null>` desde `@/lib/auth/session` — usado por **todas** las rutas API protegidas de tareas siguientes.

- [ ] **Step 1: Confirmar e instalar next-auth**

```bash
npm install next-auth
```

(Ya validado en el spec.)

- [ ] **Step 2: Ampliar los tipos de sesión**

Crear `src/types/next-auth.d.ts`:

```ts
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & { id: string };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
  }
}
```

- [ ] **Step 3: Configurar NextAuth**

Crear `src/lib/auth/options.ts`:

```ts
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { verifyCredentials } from "./verifyCredentials";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: { signIn: "/" },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        return verifyCredentials(credentials.email, credentials.password);
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.userId = user.id;
      return token;
    },
    async session({ session, token }) {
      if (token.userId) session.user.id = token.userId;
      return session;
    },
  },
};
```

- [ ] **Step 4: Ruta de NextAuth**

Crear `src/app/api/auth/[...nextauth]/route.ts`:

```ts
import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth/options";

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
```

- [ ] **Step 5: Helper de sesión para rutas API**

Crear `src/lib/auth/session.ts`:

```ts
import { getServerSession } from "next-auth";
import { authOptions } from "./options";

export async function getCurrentUserId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  return session?.user?.id ?? null;
}
```

- [ ] **Step 6: Test que falla — middleware**

Crear `tests/middleware.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("next-auth/jwt", () => ({
  getToken: vi.fn(),
}));

import { getToken } from "next-auth/jwt";
import { middleware } from "@/middleware";

function makeRequest(path: string) {
  return new NextRequest(new URL(path, "http://localhost:3000"));
}

describe("middleware", () => {
  it("redirige a / si no hay token", async () => {
    (getToken as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const res = await middleware(makeRequest("/dashboard"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost:3000/");
  });

  it("deja pasar si hay token", async () => {
    (getToken as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ userId: "u1" });
    const res = await middleware(makeRequest("/dashboard"));
    expect(res.status).toBe(200);
  });
});
```

- [ ] **Step 7: Ejecutar y verificar que falla**

```bash
npm test -- middleware.test.ts
```

Expected: FAIL — `Cannot find module '@/middleware'`.

- [ ] **Step 8: Implementación mínima**

Crear `src/middleware.ts`:

```ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  if (!token) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
```

- [ ] **Step 9: Ejecutar y verificar que pasa**

```bash
npm test -- middleware.test.ts
```

Expected: PASS (2 tests).

- [ ] **Step 10: Registrar commit sugerido**

Añadir fila de la Tarea 5 a la tabla de commits sugeridos.

---

### Task 6: Categorías predefinidas + API de registro + CRUD de categorías

**Files:**
- Create: `src/lib/defaultCategories.ts`
- Create: `src/lib/validations/auth.ts`, `src/lib/validations/category.ts`
- Create: `src/app/api/register/route.ts`, `tests/api/register.test.ts`
- Create: `src/app/api/categories/route.ts`, `src/app/api/categories/[id]/route.ts`, `tests/api/categories.test.ts`

**Interfaces:**
- Consumes: `hashPassword` (Tarea 4), `getCurrentUserId` (Tarea 5), `prisma` (Tarea 3).
- Produces: `POST /api/register`, `GET/POST /api/categories`, `PATCH/DELETE /api/categories/[id]` — usados por la UI de la Tarea 7 y por todas las tareas de transacciones.

- [ ] **Step 1: Confirmar e instalar zod**

```bash
npm install zod
```

(Pendiente de confirmación, ver Global Constraints.)

- [ ] **Step 2: Categorías predefinidas**

Crear `src/lib/defaultCategories.ts`:

```ts
export const DEFAULT_CATEGORIES = [
  { name: "Nómina", type: "income", color: "#4ade80" },
  { name: "Otros ingresos", type: "income", color: "#38bdf8" },
  { name: "Alimentación", type: "expense", color: "#f87171" },
  { name: "Transporte", type: "expense", color: "#fb923c" },
  { name: "Vivienda", type: "expense", color: "#a78bfa" },
  { name: "Ocio", type: "expense", color: "#f472b6" },
  { name: "Salud", type: "expense", color: "#22d3ee" },
  { name: "Préstamos", type: "expense", color: "#facc15" },
  { name: "Otros gastos", type: "expense", color: "#94a3b8" },
] as const;
```

- [ ] **Step 3: Esquema de validación de registro**

Crear `src/lib/validations/auth.ts`:

```ts
import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
});
```

- [ ] **Step 4: Test que falla — API de registro**

Crear `tests/api/register.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/register/route";
import { prisma } from "@/lib/prisma";

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/register", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("POST /api/register", () => {
  it("crea un usuario con categorías predefinidas", async () => {
    const res = await POST(makeRequest({ email: "ana@example.com", password: "password123" }));
    expect(res.status).toBe(201);
    const user = await prisma.user.findUnique({ where: { email: "ana@example.com" } });
    expect(user).not.toBeNull();
    const categories = await prisma.category.findMany({ where: { userId: user!.id } });
    expect(categories.length).toBe(9);
  });

  it("rechaza un email duplicado", async () => {
    await POST(makeRequest({ email: "dup@example.com", password: "password123" }));
    const res = await POST(makeRequest({ email: "dup@example.com", password: "password123" }));
    expect(res.status).toBe(409);
  });

  it("rechaza un payload inválido", async () => {
    const res = await POST(makeRequest({ email: "no-es-email", password: "123" }));
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 5: Ejecutar y verificar que falla**

```bash
npm test -- register.test.ts
```

Expected: FAIL — módulo no encontrado.

- [ ] **Step 6: Implementación mínima**

Crear `src/app/api/register/route.ts`:

```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/password";
import { registerSchema } from "@/lib/validations/auth";
import { DEFAULT_CATEGORIES } from "@/lib/defaultCategories";

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "El email ya está registrado" }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      categories: { create: DEFAULT_CATEGORIES.map((c) => ({ ...c })) },
    },
  });

  return NextResponse.json({ id: user.id, email: user.email }, { status: 201 });
}
```

- [ ] **Step 7: Ejecutar y verificar que pasa**

```bash
npm test -- register.test.ts
```

Expected: PASS (3 tests).

- [ ] **Step 8: Esquema de validación de categorías**

Crear `src/lib/validations/category.ts`:

```ts
import { z } from "zod";

export const categorySchema = z.object({
  name: z.string().min(1),
  type: z.enum(["income", "expense"]),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
});
```

- [ ] **Step 9: Test que falla — CRUD de categorías**

Crear `tests/api/categories.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/auth/session", () => ({ getCurrentUserId: vi.fn() }));
import { getCurrentUserId } from "@/lib/auth/session";
import { GET, POST } from "@/app/api/categories/route";
import { DELETE, PATCH } from "@/app/api/categories/[id]/route";

function mockUser(userId: string | null) {
  (getCurrentUserId as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(userId);
}

function makeRequest(body?: unknown) {
  return new Request("http://localhost/api/categories", {
    method: "POST",
    body: body ? JSON.stringify(body) : undefined,
    headers: { "Content-Type": "application/json" },
  });
}

describe("categorías API", () => {
  it("GET devuelve predefinidas + propias", async () => {
    const user = await prisma.user.create({ data: { email: "cat@example.com", passwordHash: "x" } });
    await prisma.category.create({ data: { name: "Predefinida", type: "expense", color: "#000000" } });
    mockUser(user.id);
    const res = await GET();
    const data = await res.json();
    expect(data.length).toBeGreaterThanOrEqual(1);
  });

  it("POST crea una categoría propia", async () => {
    const user = await prisma.user.create({ data: { email: "cat2@example.com", passwordHash: "x" } });
    mockUser(user.id);
    const res = await POST(
      makeRequest({ name: "Mascotas", type: "expense", color: "#ff00ff" })
    );
    expect(res.status).toBe(201);
    const created = await prisma.category.findFirst({ where: { name: "Mascotas" } });
    expect(created?.userId).toBe(user.id);
  });

  it("no permite borrar una categoría predefinida", async () => {
    const user = await prisma.user.create({ data: { email: "cat3@example.com", passwordHash: "x" } });
    const predefined = await prisma.category.create({
      data: { name: "Predef2", type: "expense", color: "#000000" },
    });
    mockUser(user.id);
    const res = await DELETE(new Request("http://localhost"), { params: { id: predefined.id } });
    expect(res.status).toBe(404);
  });

  it("no permite editar una categoría de otro usuario", async () => {
    const owner = await prisma.user.create({ data: { email: "owner@example.com", passwordHash: "x" } });
    const other = await prisma.user.create({ data: { email: "other@example.com", passwordHash: "x" } });
    const category = await prisma.category.create({
      data: { userId: owner.id, name: "Privada", type: "expense", color: "#111111" },
    });
    mockUser(other.id);
    const res = await PATCH(makeRequest({ name: "Hackeada" }), { params: { id: category.id } });
    expect(res.status).toBe(404);
  });
});
```

- [ ] **Step 10: Ejecutar y verificar que falla**

```bash
npm test -- categories.test.ts
```

Expected: FAIL — módulos no encontrados.

- [ ] **Step 11: Implementación mínima — colección**

Crear `src/app/api/categories/route.ts`:

```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth/session";
import { categorySchema } from "@/lib/validations/category";

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const categories = await prisma.category.findMany({
    where: { OR: [{ userId }, { userId: null }] },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(categories);
}

export async function POST(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const body = await request.json();
  const parsed = categorySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const category = await prisma.category.create({ data: { ...parsed.data, userId } });
  return NextResponse.json(category, { status: 201 });
}
```

- [ ] **Step 12: Implementación mínima — recurso individual**

Crear `src/app/api/categories/[id]/route.ts`:

```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth/session";
import { categorySchema } from "@/lib/validations/category";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const existing = await prisma.category.findUnique({ where: { id: params.id } });
  if (!existing || existing.userId !== userId) {
    return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  }
  const body = await request.json();
  const parsed = categorySchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const category = await prisma.category.update({ where: { id: params.id }, data: parsed.data });
  return NextResponse.json(category);
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const existing = await prisma.category.findUnique({ where: { id: params.id } });
  if (!existing || existing.userId !== userId) {
    return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  }
  await prisma.category.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 13: Ejecutar y verificar que pasa**

```bash
npm test -- categories.test.ts
```

Expected: PASS (4 tests).

- [ ] **Step 14: Registrar commit sugerido**

Añadir fila de la Tarea 6 a la tabla de commits sugeridos.

---

### Task 7: Landing page (login/registro) — tarjeta centrada

**Files:**
- Create: `src/app/page.tsx` (sobrescribe el placeholder de la Tarea 1)
- Create: `src/components/auth/LoginForm.tsx`, `src/components/auth/RegisterForm.tsx`
- Create: `src/app/providers.tsx` (SessionProvider de NextAuth)
- Modify: `src/app/layout.tsx` (envolver con `Providers`)

**Interfaces:**
- Consumes: `signIn` de `next-auth/react`, `POST /api/register` (Tarea 6).
- Produces: página `/` funcional de login/registro, redirige a `/dashboard` tras login correcto.

- [ ] **Step 1: Proveedor de sesión**

Crear `src/app/providers.tsx`:

```tsx
"use client";

import { SessionProvider } from "next-auth/react";
import type { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
```

Modificar `src/app/layout.tsx` para envolver `children` con `<Providers>`.

- [ ] **Step 2: Formulario de login**

Crear `src/components/auth/LoginForm.tsx`:

```tsx
"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const result = await signIn("credentials", { email, password, redirect: false });
    if (result?.error) {
      setError("Email o contraseña incorrectos");
      return;
    }
    router.push("/dashboard");
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="rounded bg-background border border-surface-muted px-3 py-2 text-text-primary"
        required
      />
      <input
        type="password"
        placeholder="Contraseña"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="rounded bg-background border border-surface-muted px-3 py-2 text-text-primary"
        required
      />
      {error && <p className="text-sm text-negative">{error}</p>}
      <button type="submit" className="rounded bg-accent px-3 py-2 font-medium text-background">
        Entrar
      </button>
    </form>
  );
}
```

- [ ] **Step 3: Formulario de registro**

Crear `src/components/auth/RegisterForm.tsx`:

```tsx
"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function RegisterForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error?.formErrors?.[0] ?? "No se pudo registrar");
      return;
    }
    await signIn("credentials", { email, password, redirect: false });
    router.push("/dashboard");
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="rounded bg-background border border-surface-muted px-3 py-2 text-text-primary"
        required
      />
      <input
        type="password"
        placeholder="Contraseña (mín. 8 caracteres)"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="rounded bg-background border border-surface-muted px-3 py-2 text-text-primary"
        required
      />
      {error && <p className="text-sm text-negative">{error}</p>}
      <button type="submit" className="rounded bg-accent px-3 py-2 font-medium text-background">
        Crear cuenta
      </button>
    </form>
  );
}
```

- [ ] **Step 4: Página de landing con tabs login/registro**

Reemplazar `src/app/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import { LoginForm } from "@/components/auth/LoginForm";
import { RegisterForm } from "@/components/auth/RegisterForm";

export default function Home() {
  const [tab, setTab] = useState<"login" | "register">("login");

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-lg border border-surface-muted bg-surface p-6">
        <h1 className="mb-6 text-center text-lg font-semibold text-accent">POCKETLY</h1>
        <div className="mb-4 flex gap-2 text-sm">
          <button
            onClick={() => setTab("login")}
            className={tab === "login" ? "text-accent" : "text-text-secondary"}
          >
            Iniciar sesión
          </button>
          <span className="text-text-secondary">/</span>
          <button
            onClick={() => setTab("register")}
            className={tab === "register" ? "text-accent" : "text-text-secondary"}
          >
            Crear cuenta
          </button>
        </div>
        {tab === "login" ? <LoginForm /> : <RegisterForm />}
      </div>
    </main>
  );
}
```

- [ ] **Step 5: Verificación manual**

```bash
npm run dev
```

En el navegador: registrar un usuario nuevo con email/contraseña → debe redirigir a `/dashboard` (dará 404 hasta la Tarea 8, es esperado). Volver a `/`, cerrar sesión no existe aún — simplemente verificar en una pestaña nueva que el login con esas credenciales funciona y con una contraseña incorrecta muestra "Email o contraseña incorrectos".

- [ ] **Step 6: Registrar commit sugerido**

Añadir fila de la Tarea 7 a la tabla de commits sugeridos.

---

### Task 8: Dashboard shell (barra superior + layout protegido)

**Files:**
- Create: `src/app/dashboard/layout.tsx`, `src/components/dashboard/TopNav.tsx`, `src/app/dashboard/page.tsx`

**Interfaces:**
- Consumes: middleware de la Tarea 5 (protección de ruta ya activa vía `matcher`).
- Produces: layout de `/dashboard/*` con navegación; páginas de tareas siguientes (`/dashboard/accounts`, `/dashboard/transactions`, ...) se insertan dentro.

- [ ] **Step 1: Barra de navegación**

Crear `src/components/dashboard/TopNav.tsx`:

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

const LINKS = [
  { href: "/dashboard", label: "Resumen" },
  { href: "/dashboard/accounts", label: "Cuentas" },
  { href: "/dashboard/transactions", label: "Transacciones" },
];

export function TopNav() {
  const pathname = usePathname();
  return (
    <nav className="flex items-center justify-between border-b border-surface-muted bg-surface px-4 py-3">
      <div className="flex items-center gap-6">
        <span className="text-sm font-semibold text-accent">POCKETLY</span>
        {LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={pathname === link.href ? "text-sm text-accent" : "text-sm text-text-secondary"}
          >
            {link.label}
          </Link>
        ))}
      </div>
      <button onClick={() => signOut({ callbackUrl: "/" })} className="text-sm text-text-secondary">
        Cerrar sesión
      </button>
    </nav>
  );
}
```

- [ ] **Step 2: Layout del dashboard**

Crear `src/app/dashboard/layout.tsx`:

```tsx
import type { ReactNode } from "react";
import { TopNav } from "@/components/dashboard/TopNav";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
```

- [ ] **Step 3: Página de resumen provisional**

Crear `src/app/dashboard/page.tsx` (se completa con stats/gráficas en la Fase 3):

```tsx
export default function DashboardPage() {
  return <h2 className="text-lg font-semibold text-text-primary">Resumen</h2>;
}
```

- [ ] **Step 4: Verificación manual**

```bash
npm run dev
```

Iniciar sesión desde `/` con un usuario existente → debe llegar a `/dashboard` y mostrar la barra superior con "Resumen" resaltado. Probar "Cerrar sesión" y confirmar que vuelve a `/` y que visitar `/dashboard` directamente sin sesión redirige a `/`.

- [ ] **Step 5: Registrar commit sugerido**

Añadir fila de la Tarea 8 a la tabla de commits sugeridos.

---

### Task 9: Cálculo de saldo de cuenta + CRUD de cuentas

**Files:**
- Create: `src/lib/calculations/accountBalance.ts`, `tests/lib/calculations/accountBalance.test.ts`
- Create: `src/lib/validations/account.ts`
- Create: `src/app/api/accounts/route.ts`, `src/app/api/accounts/[id]/route.ts`, `tests/api/accounts.test.ts`

**Interfaces:**
- Consumes: `prisma`, `getCurrentUserId`.
- Produces: `getAccountBalanceCents(accountId: string): Promise<number>` (usado también en la Tarea 11 — transferencias, y en Fase 3 — dashboard); `GET/POST /api/accounts`, `PATCH/DELETE /api/accounts/[id]` (usados por la Tarea 10 UI y por Fase 2 — préstamos, para elegir cuenta de pago).

- [ ] **Step 1: Test que falla — cálculo de saldo**

Crear `tests/lib/calculations/accountBalance.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { getAccountBalanceCents } from "@/lib/calculations/accountBalance";

async function setupUserWithAccounts() {
  const user = await prisma.user.create({ data: { email: "bal@example.com", passwordHash: "x" } });
  const category = await prisma.category.create({ data: { name: "Nómina", type: "income", color: "#000" } });
  const main = await prisma.account.create({
    data: { userId: user.id, name: "Principal", type: "checking", initialBalanceCents: 10000 },
  });
  const savings = await prisma.account.create({
    data: { userId: user.id, name: "Ahorro", type: "savings", initialBalanceCents: 0 },
  });
  return { user, category, main, savings };
}

describe("getAccountBalanceCents", () => {
  it("parte del saldo inicial si no hay movimientos", async () => {
    const { main } = await setupUserWithAccounts();
    expect(await getAccountBalanceCents(main.id)).toBe(10000);
  });

  it("suma ingresos y resta gastos de esa cuenta", async () => {
    const { user, category, main } = await setupUserWithAccounts();
    await prisma.transaction.create({
      data: { userId: user.id, accountId: main.id, categoryId: category.id, amountCents: 5000, date: new Date(), type: "income" },
    });
    await prisma.transaction.create({
      data: { userId: user.id, accountId: main.id, categoryId: category.id, amountCents: 2000, date: new Date(), type: "expense" },
    });
    expect(await getAccountBalanceCents(main.id)).toBe(10000 + 5000 - 2000);
  });

  it("aplica transferencias entrantes y salientes", async () => {
    const { user, main, savings } = await setupUserWithAccounts();
    await prisma.transfer.create({
      data: { userId: user.id, fromAccountId: main.id, toAccountId: savings.id, amountCents: 3000, date: new Date() },
    });
    expect(await getAccountBalanceCents(main.id)).toBe(10000 - 3000);
    expect(await getAccountBalanceCents(savings.id)).toBe(0 + 3000);
  });
});
```

- [ ] **Step 2: Ejecutar y verificar que falla**

```bash
npm test -- accountBalance.test.ts
```

Expected: FAIL — módulo no encontrado.

- [ ] **Step 3: Implementación mínima**

Crear `src/lib/calculations/accountBalance.ts`:

```ts
import { prisma } from "@/lib/prisma";

export async function getAccountBalanceCents(accountId: string): Promise<number> {
  const account = await prisma.account.findUniqueOrThrow({ where: { id: accountId } });
  const [incomeSum, expenseSum, transfersIn, transfersOut] = await Promise.all([
    prisma.transaction.aggregate({ where: { accountId, type: "income" }, _sum: { amountCents: true } }),
    prisma.transaction.aggregate({ where: { accountId, type: "expense" }, _sum: { amountCents: true } }),
    prisma.transfer.aggregate({ where: { toAccountId: accountId }, _sum: { amountCents: true } }),
    prisma.transfer.aggregate({ where: { fromAccountId: accountId }, _sum: { amountCents: true } }),
  ]);
  return (
    account.initialBalanceCents +
    (incomeSum._sum.amountCents ?? 0) -
    (expenseSum._sum.amountCents ?? 0) +
    (transfersIn._sum.amountCents ?? 0) -
    (transfersOut._sum.amountCents ?? 0)
  );
}
```

- [ ] **Step 4: Ejecutar y verificar que pasa**

```bash
npm test -- accountBalance.test.ts
```

Expected: PASS (3 tests).

- [ ] **Step 5: Esquema de validación de cuentas**

Crear `src/lib/validations/account.ts`:

```ts
import { z } from "zod";

export const accountSchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
  initialBalanceCents: z.number().int(),
});
```

- [ ] **Step 6: Test que falla — API de cuentas**

Crear `tests/api/accounts.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/auth/session", () => ({ getCurrentUserId: vi.fn() }));
import { getCurrentUserId } from "@/lib/auth/session";
import { GET, POST } from "@/app/api/accounts/route";
import { DELETE } from "@/app/api/accounts/[id]/route";

function mockUser(userId: string) {
  (getCurrentUserId as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(userId);
}

describe("cuentas API", () => {
  it("POST crea una cuenta y GET la devuelve con su saldo", async () => {
    const user = await prisma.user.create({ data: { email: "acc@example.com", passwordHash: "x" } });
    mockUser(user.id);
    const createRes = await POST(
      new Request("http://localhost/api/accounts", {
        method: "POST",
        body: JSON.stringify({ name: "Ahorro", type: "savings", initialBalanceCents: 50000 }),
        headers: { "Content-Type": "application/json" },
      })
    );
    expect(createRes.status).toBe(201);

    const listRes = await GET();
    const accounts = await listRes.json();
    expect(accounts).toHaveLength(1);
    expect(accounts[0].balanceCents).toBe(50000);
  });

  it("no permite borrar una cuenta con transacciones", async () => {
    const user = await prisma.user.create({ data: { email: "acc2@example.com", passwordHash: "x" } });
    const category = await prisma.category.create({ data: { name: "Nómina", type: "income", color: "#000" } });
    const account = await prisma.account.create({
      data: { userId: user.id, name: "Principal", type: "checking", initialBalanceCents: 0 },
    });
    await prisma.transaction.create({
      data: { userId: user.id, accountId: account.id, categoryId: category.id, amountCents: 1000, date: new Date(), type: "income" },
    });
    mockUser(user.id);
    const res = await DELETE(new Request("http://localhost"), { params: { id: account.id } });
    expect(res.status).toBe(409);
  });
});
```

- [ ] **Step 7: Ejecutar y verificar que falla**

```bash
npm test -- accounts.test.ts
```

Expected: FAIL — módulos no encontrados.

- [ ] **Step 8: Implementación mínima — colección**

Crear `src/app/api/accounts/route.ts`:

```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth/session";
import { accountSchema } from "@/lib/validations/account";
import { getAccountBalanceCents } from "@/lib/calculations/accountBalance";

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const accounts = await prisma.account.findMany({ where: { userId }, orderBy: { createdAt: "asc" } });
  const withBalances = await Promise.all(
    accounts.map(async (account) => ({
      ...account,
      balanceCents: await getAccountBalanceCents(account.id),
    }))
  );
  return NextResponse.json(withBalances);
}

export async function POST(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const body = await request.json();
  const parsed = accountSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const account = await prisma.account.create({ data: { ...parsed.data, userId } });
  return NextResponse.json(account, { status: 201 });
}
```

- [ ] **Step 9: Implementación mínima — recurso individual**

Crear `src/app/api/accounts/[id]/route.ts`:

```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth/session";
import { accountSchema } from "@/lib/validations/account";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const existing = await prisma.account.findUnique({ where: { id: params.id } });
  if (!existing || existing.userId !== userId) {
    return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  }
  const body = await request.json();
  const parsed = accountSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const account = await prisma.account.update({ where: { id: params.id }, data: parsed.data });
  return NextResponse.json(account);
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const existing = await prisma.account.findUnique({ where: { id: params.id } });
  if (!existing || existing.userId !== userId) {
    return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  }
  const [transactionCount, transferCount] = await Promise.all([
    prisma.transaction.count({ where: { accountId: params.id } }),
    prisma.transfer.count({ where: { OR: [{ fromAccountId: params.id }, { toAccountId: params.id }] } }),
  ]);
  if (transactionCount > 0 || transferCount > 0) {
    return NextResponse.json({ error: "La cuenta tiene movimientos, no se puede borrar" }, { status: 409 });
  }
  await prisma.account.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 10: Ejecutar y verificar que pasa**

```bash
npm test -- accounts.test.ts
```

Expected: PASS (2 tests).

- [ ] **Step 11: Registrar commit sugerido**

Añadir fila de la Tarea 9 a la tabla de commits sugeridos.

---

### Task 10: UI de Cuentas (listar, crear, saldo)

**Files:**
- Create: `src/lib/format.ts`, `tests/lib/format.test.ts`
- Create: `src/app/dashboard/accounts/page.tsx`, `src/components/accounts/AccountList.tsx`, `src/components/accounts/AccountForm.tsx`

**Interfaces:**
- Consumes: `GET/POST /api/accounts` (Tarea 9).
- Produces: `formatCurrencyCents(cents: number): string` — reutilizado en todas las UIs de dinero de fases siguientes.

- [ ] **Step 1: Test que falla — formateo de moneda**

Crear `tests/lib/format.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { formatCurrencyCents } from "@/lib/format";

describe("formatCurrencyCents", () => {
  it("formatea céntimos como euros en formato español", () => {
    const expected = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(1234.56);
    expect(formatCurrencyCents(123456)).toBe(expected);
  });

  it("formatea cero correctamente", () => {
    const expected = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(0);
    expect(formatCurrencyCents(0)).toBe(expected);
  });
});
```

- [ ] **Step 2: Ejecutar y verificar que falla**

```bash
npm test -- format.test.ts
```

Expected: FAIL — módulo no encontrado.

- [ ] **Step 3: Implementación mínima**

Crear `src/lib/format.ts`:

```ts
export function formatCurrencyCents(cents: number): string {
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(cents / 100);
}
```

- [ ] **Step 4: Ejecutar y verificar que pasa**

```bash
npm test -- format.test.ts
```

Expected: PASS (2 tests).

- [ ] **Step 5: Formulario de creación de cuenta**

Crear `src/components/accounts/AccountForm.tsx`:

```tsx
"use client";

import { useState } from "react";

export function AccountForm({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState("");
  const [type, setType] = useState("checking");
  const [initialBalance, setInitialBalance] = useState("0");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        type,
        initialBalanceCents: Math.round(parseFloat(initialBalance) * 100),
      }),
    });
    setName("");
    setInitialBalance("0");
    onCreated();
  }

  return (
    <form onSubmit={handleSubmit} className="mb-4 flex flex-wrap gap-2 rounded border border-surface-muted bg-surface p-3">
      <input
        placeholder="Nombre (ej. Principal)"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="rounded bg-background border border-surface-muted px-2 py-1 text-text-primary"
        required
      />
      <select
        value={type}
        onChange={(e) => setType(e.target.value)}
        className="rounded bg-background border border-surface-muted px-2 py-1 text-text-primary"
      >
        <option value="checking">Corriente</option>
        <option value="savings">Ahorro</option>
        <option value="cash">Efectivo</option>
      </select>
      <input
        type="number"
        step="0.01"
        placeholder="Saldo inicial"
        value={initialBalance}
        onChange={(e) => setInitialBalance(e.target.value)}
        className="w-32 rounded bg-background border border-surface-muted px-2 py-1 text-text-primary"
      />
      <button type="submit" className="rounded bg-accent px-3 py-1 font-medium text-background">
        Añadir cuenta
      </button>
    </form>
  );
}
```

- [ ] **Step 6: Listado de cuentas**

Crear `src/components/accounts/AccountList.tsx`:

```tsx
import { formatCurrencyCents } from "@/lib/format";

type Account = { id: string; name: string; type: string; balanceCents: number };

export function AccountList({ accounts }: { accounts: Account[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {accounts.map((account) => (
        <div key={account.id} className="rounded border border-surface-muted bg-surface p-4">
          <p className="text-sm text-text-secondary">{account.name}</p>
          <p className={`text-xl font-semibold ${account.balanceCents >= 0 ? "text-positive" : "text-negative"}`}>
            {formatCurrencyCents(account.balanceCents)}
          </p>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 7: Página de cuentas**

Crear `src/app/dashboard/accounts/page.tsx`:

```tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { AccountForm } from "@/components/accounts/AccountForm";
import { AccountList } from "@/components/accounts/AccountList";

type Account = { id: string; name: string; type: string; balanceCents: number };

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);

  const load = useCallback(async () => {
    const res = await fetch("/api/accounts");
    setAccounts(await res.json());
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold text-text-primary">Cuentas</h2>
      <AccountForm onCreated={load} />
      <AccountList accounts={accounts} />
    </div>
  );
}
```

- [ ] **Step 8: Verificación manual**

```bash
npm run dev
```

Con sesión iniciada, ir a `/dashboard/accounts`: crear una cuenta "Principal" con saldo inicial 1000€ y otra "Ahorro" con saldo inicial 0€. Confirmar que ambas aparecen con su saldo formateado correctamente (`1.000,00 €`).

- [ ] **Step 9: Registrar commit sugerido**

Añadir fila de la Tarea 10 a la tabla de commits sugeridos.

---

### Task 11: CRUD de transacciones (con cuenta, categoría y filtros)

**Files:**
- Create: `src/lib/validations/transaction.ts`
- Create: `src/app/api/transactions/route.ts`, `src/app/api/transactions/[id]/route.ts`, `tests/api/transactions.test.ts`

**Interfaces:**
- Consumes: `prisma`, `getCurrentUserId`, modelos `Account`/`Category`.
- Produces: `GET /api/transactions?accountId&categoryId&type&from&to`, `POST /api/transactions`, `PATCH/DELETE /api/transactions/[id]` — usados por la Tarea 12 (UI) y por la Tarea 14 (generación de recurrentes, que crea registros directamente vía Prisma, no vía esta API).

- [ ] **Step 1: Esquema de validación**

Crear `src/lib/validations/transaction.ts`:

```ts
import { z } from "zod";

export const transactionSchema = z.object({
  accountId: z.string().min(1),
  categoryId: z.string().min(1),
  amountCents: z.number().int().positive(),
  date: z.coerce.date(),
  type: z.enum(["income", "expense"]),
  note: z.string().optional(),
  isRecurring: z.boolean().optional().default(false),
  recurrenceRule: z.enum(["monthly", "weekly"]).optional(),
});
```

- [ ] **Step 2: Test que falla — API de transacciones**

Crear `tests/api/transactions.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/auth/session", () => ({ getCurrentUserId: vi.fn() }));
import { getCurrentUserId } from "@/lib/auth/session";
import { GET, POST } from "@/app/api/transactions/route";
import { DELETE } from "@/app/api/transactions/[id]/route";

function mockUser(userId: string) {
  (getCurrentUserId as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(userId);
}

async function setup() {
  const user = await prisma.user.create({ data: { email: "tx@example.com", passwordHash: "x" } });
  const account = await prisma.account.create({
    data: { userId: user.id, name: "Principal", type: "checking", initialBalanceCents: 0 },
  });
  const category = await prisma.category.create({ data: { name: "Nómina", type: "income", color: "#000" } });
  return { user, account, category };
}

describe("transacciones API", () => {
  it("crea una transacción y aparece en el listado filtrado por cuenta", async () => {
    const { user, account, category } = await setup();
    mockUser(user.id);
    const res = await POST(
      new Request("http://localhost/api/transactions", {
        method: "POST",
        body: JSON.stringify({
          accountId: account.id,
          categoryId: category.id,
          amountCents: 150000,
          date: "2026-10-01",
          type: "income",
        }),
        headers: { "Content-Type": "application/json" },
      })
    );
    expect(res.status).toBe(201);

    const listRes = await GET(new Request(`http://localhost/api/transactions?accountId=${account.id}`));
    const list = await listRes.json();
    expect(list).toHaveLength(1);
    expect(list[0].amountCents).toBe(150000);
  });

  it("rechaza crear una transacción con una cuenta de otro usuario", async () => {
    const { account, category } = await setup();
    const other = await prisma.user.create({ data: { email: "tx-other@example.com", passwordHash: "x" } });
    mockUser(other.id);
    const res = await POST(
      new Request("http://localhost/api/transactions", {
        method: "POST",
        body: JSON.stringify({
          accountId: account.id,
          categoryId: category.id,
          amountCents: 1000,
          date: "2026-10-01",
          type: "income",
        }),
        headers: { "Content-Type": "application/json" },
      })
    );
    expect(res.status).toBe(403);
  });

  it("borra una transacción propia", async () => {
    const { user, account, category } = await setup();
    const tx = await prisma.transaction.create({
      data: { userId: user.id, accountId: account.id, categoryId: category.id, amountCents: 100, date: new Date(), type: "expense" },
    });
    mockUser(user.id);
    const res = await DELETE(new Request("http://localhost"), { params: { id: tx.id } });
    expect(res.status).toBe(200);
  });
});
```

- [ ] **Step 3: Ejecutar y verificar que falla**

```bash
npm test -- transactions.test.ts
```

Expected: FAIL — módulos no encontrados.

- [ ] **Step 4: Implementación mínima — colección**

Crear `src/app/api/transactions/route.ts`:

```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth/session";
import { transactionSchema } from "@/lib/validations/transaction";

export async function GET(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const accountId = searchParams.get("accountId") ?? undefined;
  const categoryId = searchParams.get("categoryId") ?? undefined;
  const type = searchParams.get("type") ?? undefined;

  const transactions = await prisma.transaction.findMany({
    where: { userId, accountId, categoryId, type },
    orderBy: { date: "desc" },
  });
  return NextResponse.json(transactions);
}

export async function POST(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const body = await request.json();
  const parsed = transactionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const account = await prisma.account.findUnique({ where: { id: parsed.data.accountId } });
  if (!account || account.userId !== userId) {
    return NextResponse.json({ error: "Cuenta no válida" }, { status: 403 });
  }

  const transaction = await prisma.transaction.create({ data: { ...parsed.data, userId } });
  return NextResponse.json(transaction, { status: 201 });
}
```

- [ ] **Step 5: Implementación mínima — recurso individual**

Crear `src/app/api/transactions/[id]/route.ts`:

```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth/session";
import { transactionSchema } from "@/lib/validations/transaction";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const existing = await prisma.transaction.findUnique({ where: { id: params.id } });
  if (!existing || existing.userId !== userId) {
    return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  }
  const body = await request.json();
  const parsed = transactionSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const transaction = await prisma.transaction.update({ where: { id: params.id }, data: parsed.data });
  return NextResponse.json(transaction);
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const existing = await prisma.transaction.findUnique({ where: { id: params.id } });
  if (!existing || existing.userId !== userId) {
    return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  }
  await prisma.transaction.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 6: Ejecutar y verificar que pasa**

```bash
npm test -- transactions.test.ts
```

Expected: PASS (3 tests).

- [ ] **Step 7: Registrar commit sugerido**

Añadir fila de la Tarea 11 a la tabla de commits sugeridos.

---

### Task 12: UI de Transacciones (listar + crear)

**Files:**
- Create: `src/app/dashboard/transactions/page.tsx`, `src/components/transactions/TransactionForm.tsx`, `src/components/transactions/TransactionList.tsx`

**Interfaces:**
- Consumes: `GET/POST /api/transactions` (Tarea 11), `GET /api/accounts` (Tarea 9), `GET /api/categories` (Tarea 6).

- [ ] **Step 1: Formulario de transacción**

Crear `src/components/transactions/TransactionForm.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";

type Account = { id: string; name: string };
type Category = { id: string; name: string; type: string };

export function TransactionForm({ onCreated }: { onCreated: () => void }) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [type, setType] = useState<"income" | "expense">("expense");
  const [accountId, setAccountId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceRule, setRecurrenceRule] = useState<"monthly" | "weekly">("monthly");

  useEffect(() => {
    fetch("/api/accounts").then((r) => r.json()).then(setAccounts);
    fetch("/api/categories").then((r) => r.json()).then(setCategories);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accountId,
        categoryId,
        amountCents: Math.round(parseFloat(amount) * 100),
        date,
        type,
        note: note || undefined,
        isRecurring,
        recurrenceRule: isRecurring ? recurrenceRule : undefined,
      }),
    });
    setAmount("");
    setNote("");
    onCreated();
  }

  const filteredCategories = categories.filter((c) => c.type === type);

  return (
    <form onSubmit={handleSubmit} className="mb-4 flex flex-wrap items-end gap-2 rounded border border-surface-muted bg-surface p-3">
      <select value={type} onChange={(e) => setType(e.target.value as "income" | "expense")} className="rounded bg-background border border-surface-muted px-2 py-1 text-text-primary">
        <option value="expense">Gasto</option>
        <option value="income">Ingreso</option>
      </select>
      <select value={accountId} onChange={(e) => setAccountId(e.target.value)} required className="rounded bg-background border border-surface-muted px-2 py-1 text-text-primary">
        <option value="">Cuenta...</option>
        {accounts.map((a) => (
          <option key={a.id} value={a.id}>{a.name}</option>
        ))}
      </select>
      <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} required className="rounded bg-background border border-surface-muted px-2 py-1 text-text-primary">
        <option value="">Categoría...</option>
        {filteredCategories.map((c) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>
      <input type="number" step="0.01" placeholder="Importe" value={amount} onChange={(e) => setAmount(e.target.value)} required className="w-28 rounded bg-background border border-surface-muted px-2 py-1 text-text-primary" />
      <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded bg-background border border-surface-muted px-2 py-1 text-text-primary" />
      <input placeholder="Nota (opcional)" value={note} onChange={(e) => setNote(e.target.value)} className="rounded bg-background border border-surface-muted px-2 py-1 text-text-primary" />
      <label className="flex items-center gap-1 text-sm text-text-secondary">
        <input type="checkbox" checked={isRecurring} onChange={(e) => setIsRecurring(e.target.checked)} />
        Recurrente
      </label>
      {isRecurring && (
        <select value={recurrenceRule} onChange={(e) => setRecurrenceRule(e.target.value as "monthly" | "weekly")} className="rounded bg-background border border-surface-muted px-2 py-1 text-text-primary">
          <option value="monthly">Mensual</option>
          <option value="weekly">Semanal</option>
        </select>
      )}
      <button type="submit" className="rounded bg-accent px-3 py-1 font-medium text-background">Añadir</button>
    </form>
  );
}
```

- [ ] **Step 2: Listado de transacciones**

Crear `src/components/transactions/TransactionList.tsx`:

```tsx
import { formatCurrencyCents } from "@/lib/format";

type Transaction = { id: string; amountCents: number; date: string; type: string; note: string | null };

export function TransactionList({ transactions }: { transactions: Transaction[] }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-text-secondary">
          <th className="py-2">Fecha</th>
          <th>Nota</th>
          <th className="text-right">Importe</th>
        </tr>
      </thead>
      <tbody>
        {transactions.map((t) => (
          <tr key={t.id} className="border-t border-surface-muted">
            <td className="py-2 text-text-primary">{new Date(t.date).toLocaleDateString("es-ES")}</td>
            <td className="text-text-primary">{t.note ?? "-"}</td>
            <td className={`text-right ${t.type === "income" ? "text-positive" : "text-negative"}`}>
              {t.type === "income" ? "+" : "-"}
              {formatCurrencyCents(t.amountCents)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

- [ ] **Step 3: Página de transacciones**

Crear `src/app/dashboard/transactions/page.tsx`:

```tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { TransactionForm } from "@/components/transactions/TransactionForm";
import { TransactionList } from "@/components/transactions/TransactionList";

type Transaction = { id: string; amountCents: number; date: string; type: string; note: string | null };

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const load = useCallback(async () => {
    const res = await fetch("/api/transactions");
    setTransactions(await res.json());
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold text-text-primary">Transacciones</h2>
      <TransactionForm onCreated={load} />
      <TransactionList transactions={transactions} />
    </div>
  );
}
```

- [ ] **Step 4: Verificación manual**

```bash
npm run dev
```

En `/dashboard/transactions`, crear un ingreso "Nómina" de 1500€ en la cuenta "Principal" y un gasto "Alimentación" de 200€. Confirmar que aparecen en la tabla con el signo e importe correctos, y que al volver a `/dashboard/accounts` el saldo de "Principal" refleja ambos movimientos.

- [ ] **Step 5: Registrar commit sugerido**

Añadir fila de la Tarea 12 a la tabla de commits sugeridos.

---

### Task 13: Generación de transacciones recurrentes

**Files:**
- Create: `src/lib/calculations/recurrence.ts`, `tests/lib/calculations/recurrence.test.ts`
- Create: `src/lib/calculations/generateRecurringTransactions.ts`, `tests/lib/calculations/generateRecurringTransactions.test.ts`
- Modify: `src/app/dashboard/layout.tsx` (invocar la generación al cargar)

**Interfaces:**
- Consumes: `prisma`.
- Produces: `occurrencesUpTo(lastDate: Date, rule: "monthly"|"weekly", cutoff: Date): Date[]`, `generateDueRecurringTransactions(userId: string, cutoff?: Date): Promise<number>`.

- [ ] **Step 1: Test que falla — cálculo puro de fechas**

Crear `tests/lib/calculations/recurrence.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { occurrencesUpTo } from "@/lib/calculations/recurrence";

describe("occurrencesUpTo", () => {
  it("genera las fechas mensuales pendientes hasta el corte", () => {
    const last = new Date("2026-08-01");
    const cutoff = new Date("2026-10-15");
    const dates = occurrencesUpTo(last, "monthly", cutoff);
    expect(dates.map((d) => d.toISOString().slice(0, 10))).toEqual(["2026-09-01", "2026-10-01"]);
  });

  it("no genera nada si el corte es anterior a la siguiente ocurrencia", () => {
    const last = new Date("2026-10-01");
    const cutoff = new Date("2026-10-15");
    const dates = occurrencesUpTo(last, "monthly", cutoff);
    expect(dates).toEqual([]);
  });

  it("genera ocurrencias semanales", () => {
    const last = new Date("2026-10-01");
    const cutoff = new Date("2026-10-16");
    const dates = occurrencesUpTo(last, "weekly", cutoff);
    expect(dates.map((d) => d.toISOString().slice(0, 10))).toEqual(["2026-10-08", "2026-10-15"]);
  });
});
```

- [ ] **Step 2: Ejecutar y verificar que falla**

```bash
npm test -- recurrence.test.ts
```

Expected: FAIL — módulo no encontrado.

- [ ] **Step 3: Implementación mínima**

Crear `src/lib/calculations/recurrence.ts`:

```ts
export type RecurrenceRule = "monthly" | "weekly";

export function nextOccurrence(date: Date, rule: RecurrenceRule): Date {
  const next = new Date(date);
  if (rule === "monthly") {
    next.setMonth(next.getMonth() + 1);
  } else {
    next.setDate(next.getDate() + 7);
  }
  return next;
}

export function occurrencesUpTo(lastDate: Date, rule: RecurrenceRule, cutoff: Date): Date[] {
  const result: Date[] = [];
  let current = nextOccurrence(lastDate, rule);
  while (current.getTime() <= cutoff.getTime()) {
    result.push(new Date(current));
    current = nextOccurrence(current, rule);
  }
  return result;
}
```

- [ ] **Step 4: Ejecutar y verificar que pasa**

```bash
npm test -- recurrence.test.ts
```

Expected: PASS (3 tests).

- [ ] **Step 5: Test que falla — orquestador contra la base de datos**

Crear `tests/lib/calculations/generateRecurringTransactions.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { generateDueRecurringTransactions } from "@/lib/calculations/generateRecurringTransactions";

describe("generateDueRecurringTransactions", () => {
  it("genera las instancias mensuales que faltan y no duplica al repetir", async () => {
    const user = await prisma.user.create({ data: { email: "rec@example.com", passwordHash: "x" } });
    const account = await prisma.account.create({
      data: { userId: user.id, name: "Principal", type: "checking", initialBalanceCents: 0 },
    });
    const category = await prisma.category.create({ data: { name: "Nómina", type: "income", color: "#000" } });
    await prisma.transaction.create({
      data: {
        userId: user.id,
        accountId: account.id,
        categoryId: category.id,
        amountCents: 150000,
        date: new Date("2026-08-01"),
        type: "income",
        isRecurring: true,
        recurrenceRule: "monthly",
      },
    });

    const created = await generateDueRecurringTransactions(user.id, new Date("2026-10-15"));
    expect(created).toBe(2);

    const all = await prisma.transaction.findMany({ where: { userId: user.id } });
    expect(all).toHaveLength(3); // original + 2 generadas

    const createdAgain = await generateDueRecurringTransactions(user.id, new Date("2026-10-15"));
    expect(createdAgain).toBe(0);
  });
});
```

- [ ] **Step 6: Ejecutar y verificar que falla**

```bash
npm test -- generateRecurringTransactions.test.ts
```

Expected: FAIL — módulo no encontrado.

- [ ] **Step 7: Implementación mínima**

Crear `src/lib/calculations/generateRecurringTransactions.ts`:

```ts
import { prisma } from "@/lib/prisma";
import { occurrencesUpTo, type RecurrenceRule } from "./recurrence";

export async function generateDueRecurringTransactions(userId: string, cutoff: Date = new Date()): Promise<number> {
  const templates = await prisma.transaction.findMany({
    where: { userId, isRecurring: true, recurringSourceId: null, recurrenceRule: { not: null } },
  });

  let created = 0;
  for (const template of templates) {
    const lastInstance = await prisma.transaction.findFirst({
      where: { OR: [{ id: template.id }, { recurringSourceId: template.id }] },
      orderBy: { date: "desc" },
    });
    const lastDate = lastInstance?.date ?? template.date;
    const rule = template.recurrenceRule as RecurrenceRule;
    const dates = occurrencesUpTo(lastDate, rule, cutoff);

    for (const date of dates) {
      await prisma.transaction.create({
        data: {
          userId: template.userId,
          accountId: template.accountId,
          categoryId: template.categoryId,
          amountCents: template.amountCents,
          date,
          type: template.type,
          note: template.note,
          isRecurring: true,
          recurrenceRule: template.recurrenceRule,
          recurringSourceId: template.id,
        },
      });
      created += 1;
    }
  }
  return created;
}
```

- [ ] **Step 8: Ejecutar y verificar que pasa**

```bash
npm test -- generateRecurringTransactions.test.ts
```

Expected: PASS (1 test).

- [ ] **Step 9: Conectar la generación al cargar el dashboard**

Modificar `src/app/dashboard/layout.tsx` para convertirlo en Server Component que ejecuta la generación antes de renderizar:

```tsx
import type { ReactNode } from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { generateDueRecurringTransactions } from "@/lib/calculations/generateRecurringTransactions";
import { TopNav } from "@/components/dashboard/TopNav";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    await generateDueRecurringTransactions(session.user.id);
  }

  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
```

- [ ] **Step 10: Verificación manual**

```bash
npm run dev
```

Crear una transacción recurrente mensual con fecha de hace 2 meses, recargar `/dashboard` y comprobar en `/dashboard/transactions` que han aparecido las instancias generadas automáticamente, y que recargar otra vez no las duplica.

- [ ] **Step 11: Registrar commit sugerido**

Añadir fila de la Tarea 13 a la tabla de commits sugeridos.

---

### Task 14: Transferencias entre cuentas (API + UI)

**Files:**
- Create: `src/lib/validations/transfer.ts`
- Create: `src/app/api/transfers/route.ts`, `tests/api/transfers.test.ts`
- Create: `src/components/accounts/TransferForm.tsx`
- Modify: `src/app/dashboard/accounts/page.tsx` (añadir el formulario de transferencia)

**Interfaces:**
- Consumes: `prisma`, `getCurrentUserId`, `getAccountBalanceCents` (Tarea 9).
- Produces: `POST /api/transfers`.

- [ ] **Step 1: Esquema de validación**

Crear `src/lib/validations/transfer.ts`:

```ts
import { z } from "zod";

export const transferSchema = z
  .object({
    fromAccountId: z.string().min(1),
    toAccountId: z.string().min(1),
    amountCents: z.number().int().positive(),
    date: z.coerce.date(),
    note: z.string().optional(),
  })
  .refine((data) => data.fromAccountId !== data.toAccountId, {
    message: "La cuenta de origen y destino deben ser distintas",
    path: ["toAccountId"],
  });
```

- [ ] **Step 2: Test que falla — API de transferencias**

Crear `tests/api/transfers.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { getAccountBalanceCents } from "@/lib/calculations/accountBalance";

vi.mock("@/lib/auth/session", () => ({ getCurrentUserId: vi.fn() }));
import { getCurrentUserId } from "@/lib/auth/session";
import { POST } from "@/app/api/transfers/route";

function mockUser(userId: string) {
  (getCurrentUserId as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(userId);
}

describe("POST /api/transfers", () => {
  it("mueve saldo de una cuenta a otra sin generar transacciones", async () => {
    const user = await prisma.user.create({ data: { email: "transfer@example.com", passwordHash: "x" } });
    const main = await prisma.account.create({
      data: { userId: user.id, name: "Principal", type: "checking", initialBalanceCents: 100000 },
    });
    const savings = await prisma.account.create({
      data: { userId: user.id, name: "Ahorro", type: "savings", initialBalanceCents: 0 },
    });
    mockUser(user.id);

    const res = await POST(
      new Request("http://localhost/api/transfers", {
        method: "POST",
        body: JSON.stringify({ fromAccountId: main.id, toAccountId: savings.id, amountCents: 20000, date: "2026-10-01" }),
        headers: { "Content-Type": "application/json" },
      })
    );
    expect(res.status).toBe(201);

    expect(await getAccountBalanceCents(main.id)).toBe(80000);
    expect(await getAccountBalanceCents(savings.id)).toBe(20000);

    const transactionCount = await prisma.transaction.count({ where: { userId: user.id } });
    expect(transactionCount).toBe(0);
  });

  it("rechaza transferir entre la misma cuenta", async () => {
    const user = await prisma.user.create({ data: { email: "transfer2@example.com", passwordHash: "x" } });
    const main = await prisma.account.create({
      data: { userId: user.id, name: "Principal", type: "checking", initialBalanceCents: 1000 },
    });
    mockUser(user.id);

    const res = await POST(
      new Request("http://localhost/api/transfers", {
        method: "POST",
        body: JSON.stringify({ fromAccountId: main.id, toAccountId: main.id, amountCents: 100, date: "2026-10-01" }),
        headers: { "Content-Type": "application/json" },
      })
    );
    expect(res.status).toBe(400);
  });

  it("rechaza transferir desde una cuenta de otro usuario", async () => {
    const owner = await prisma.user.create({ data: { email: "owner2@example.com", passwordHash: "x" } });
    const attacker = await prisma.user.create({ data: { email: "attacker@example.com", passwordHash: "x" } });
    const main = await prisma.account.create({
      data: { userId: owner.id, name: "Principal", type: "checking", initialBalanceCents: 1000 },
    });
    const target = await prisma.account.create({
      data: { userId: attacker.id, name: "Destino", type: "checking", initialBalanceCents: 0 },
    });
    mockUser(attacker.id);

    const res = await POST(
      new Request("http://localhost/api/transfers", {
        method: "POST",
        body: JSON.stringify({ fromAccountId: main.id, toAccountId: target.id, amountCents: 100, date: "2026-10-01" }),
        headers: { "Content-Type": "application/json" },
      })
    );
    expect(res.status).toBe(403);
  });
});
```

- [ ] **Step 3: Ejecutar y verificar que falla**

```bash
npm test -- transfers.test.ts
```

Expected: FAIL — módulo no encontrado.

- [ ] **Step 4: Implementación mínima**

Crear `src/app/api/transfers/route.ts`:

```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth/session";
import { transferSchema } from "@/lib/validations/transfer";

export async function POST(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const body = await request.json();
  const parsed = transferSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const [fromAccount, toAccount] = await Promise.all([
    prisma.account.findUnique({ where: { id: parsed.data.fromAccountId } }),
    prisma.account.findUnique({ where: { id: parsed.data.toAccountId } }),
  ]);
  if (!fromAccount || !toAccount || fromAccount.userId !== userId || toAccount.userId !== userId) {
    return NextResponse.json({ error: "Cuenta no válida" }, { status: 403 });
  }

  const transfer = await prisma.transfer.create({ data: { ...parsed.data, userId } });
  return NextResponse.json(transfer, { status: 201 });
}
```

- [ ] **Step 5: Ejecutar y verificar que pasa**

```bash
npm test -- transfers.test.ts
```

Expected: PASS (3 tests).

- [ ] **Step 6: Formulario de transferencia en la UI**

Crear `src/components/accounts/TransferForm.tsx`:

```tsx
"use client";

import { useState } from "react";

type Account = { id: string; name: string };

export function TransferForm({ accounts, onDone }: { accounts: Account[]; onDone: () => void }) {
  const [fromAccountId, setFromAccountId] = useState("");
  const [toAccountId, setToAccountId] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/transfers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fromAccountId,
        toAccountId,
        amountCents: Math.round(parseFloat(amount) * 100),
        date: new Date().toISOString().slice(0, 10),
      }),
    });
    if (!res.ok) {
      setError("No se pudo realizar la transferencia");
      return;
    }
    setAmount("");
    onDone();
  }

  return (
    <form onSubmit={handleSubmit} className="mb-6 flex flex-wrap items-end gap-2 rounded border border-surface-muted bg-surface p-3">
      <select value={fromAccountId} onChange={(e) => setFromAccountId(e.target.value)} required className="rounded bg-background border border-surface-muted px-2 py-1 text-text-primary">
        <option value="">Desde...</option>
        {accounts.map((a) => (
          <option key={a.id} value={a.id}>{a.name}</option>
        ))}
      </select>
      <select value={toAccountId} onChange={(e) => setToAccountId(e.target.value)} required className="rounded bg-background border border-surface-muted px-2 py-1 text-text-primary">
        <option value="">Hacia...</option>
        {accounts.map((a) => (
          <option key={a.id} value={a.id}>{a.name}</option>
        ))}
      </select>
      <input type="number" step="0.01" placeholder="Importe" value={amount} onChange={(e) => setAmount(e.target.value)} required className="w-28 rounded bg-background border border-surface-muted px-2 py-1 text-text-primary" />
      <button type="submit" className="rounded bg-accent px-3 py-1 font-medium text-background">Transferir</button>
      {error && <p className="text-sm text-negative">{error}</p>}
    </form>
  );
}
```

- [ ] **Step 7: Insertar el formulario en la página de cuentas**

Modificar `src/app/dashboard/accounts/page.tsx` añadiendo el import y el componente entre el título y `AccountForm`:

```tsx
import { TransferForm } from "@/components/accounts/TransferForm";
// ... dentro del JSX, después de <AccountForm onCreated={load} />:
<TransferForm accounts={accounts} onDone={load} />
```

- [ ] **Step 8: Verificación manual**

```bash
npm run dev
```

En `/dashboard/accounts`, transferir 300€ de "Principal" a "Ahorro". Confirmar que ambos saldos se actualizan correctamente y que la transferencia no aparece en `/dashboard/transactions`.

- [ ] **Step 9: Registrar commit sugerido**

Añadir fila de la Tarea 14 a la tabla de commits sugeridos.

---

### Task 15: Remanente y meta de ahorro

**Files:**
- Create: `src/lib/calculations/remainder.ts`, `tests/lib/calculations/remainder.test.ts`
- Create: `src/app/api/summary/route.ts`, `tests/api/summary.test.ts`

**Interfaces:**
- Consumes: `prisma`, `getCurrentUserId`.
- Produces: `calculateRemainderCents`, `calculateSavingsPercent`, `getSavingsStatus` (puras, reutilizables en Fase 3 — gráficas); `GET /api/summary?month=YYYY-MM` (usado en Fase 3 — dashboard de resumen).

- [ ] **Step 1: Test que falla — funciones puras**

Crear `tests/lib/calculations/remainder.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { calculateRemainderCents, calculateSavingsPercent, getSavingsStatus } from "@/lib/calculations/remainder";

describe("remainder calculations", () => {
  it("calcula el remanente como ingresos menos gastos", () => {
    expect(calculateRemainderCents(150000, 90000)).toBe(60000);
  });

  it("calcula el % de ahorro real sobre los ingresos", () => {
    expect(calculateSavingsPercent(60000, 150000)).toBeCloseTo(40);
  });

  it("devuelve null si no hubo ingresos", () => {
    expect(calculateSavingsPercent(0, 0)).toBeNull();
  });

  it("marca 'exceeded' si el % real supera el objetivo", () => {
    expect(getSavingsStatus(40, 20)).toBe("exceeded");
  });

  it("marca 'met' si el % real iguala el objetivo", () => {
    expect(getSavingsStatus(20, 20)).toBe("met");
  });

  it("marca 'not-met' si el % real es menor que el objetivo", () => {
    expect(getSavingsStatus(10, 20)).toBe("not-met");
  });
});
```

- [ ] **Step 2: Ejecutar y verificar que falla**

```bash
npm test -- remainder.test.ts
```

Expected: FAIL — módulo no encontrado.

- [ ] **Step 3: Implementación mínima**

Crear `src/lib/calculations/remainder.ts`:

```ts
export function calculateRemainderCents(incomeCents: number, expenseCents: number): number {
  return incomeCents - expenseCents;
}

export function calculateSavingsPercent(remainderCents: number, incomeCents: number): number | null {
  if (incomeCents === 0) return null;
  return (remainderCents / incomeCents) * 100;
}

export type SavingsStatus = "met" | "exceeded" | "not-met";

export function getSavingsStatus(actualPercent: number | null, goalPercent: number): SavingsStatus {
  if (actualPercent === null) return "not-met";
  if (actualPercent > goalPercent) return "exceeded";
  if (actualPercent === goalPercent) return "met";
  return "not-met";
}
```

- [ ] **Step 4: Ejecutar y verificar que pasa**

```bash
npm test -- remainder.test.ts
```

Expected: PASS (6 tests).

- [ ] **Step 5: Test que falla — endpoint de resumen**

Crear `tests/api/summary.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/auth/session", () => ({ getCurrentUserId: vi.fn() }));
import { getCurrentUserId } from "@/lib/auth/session";
import { GET } from "@/app/api/summary/route";

function mockUser(userId: string) {
  (getCurrentUserId as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(userId);
}

describe("GET /api/summary", () => {
  it("calcula remanente y % de ahorro para el mes indicado", async () => {
    const user = await prisma.user.create({
      data: { email: "sum@example.com", passwordHash: "x", savingsGoalPercent: 20 },
    });
    const account = await prisma.account.create({
      data: { userId: user.id, name: "Principal", type: "checking", initialBalanceCents: 0 },
    });
    const incomeCategory = await prisma.category.create({ data: { name: "Nómina", type: "income", color: "#000" } });
    const expenseCategory = await prisma.category.create({ data: { name: "Gasto", type: "expense", color: "#111" } });

    await prisma.transaction.create({
      data: { userId: user.id, accountId: account.id, categoryId: incomeCategory.id, amountCents: 150000, date: new Date("2026-10-05"), type: "income" },
    });
    await prisma.transaction.create({
      data: { userId: user.id, accountId: account.id, categoryId: expenseCategory.id, amountCents: 90000, date: new Date("2026-10-10"), type: "expense" },
    });
    // transacción de otro mes, no debe contar
    await prisma.transaction.create({
      data: { userId: user.id, accountId: account.id, categoryId: expenseCategory.id, amountCents: 999999, date: new Date("2026-05-01"), type: "expense" },
    });

    mockUser(user.id);
    const res = await GET(new Request("http://localhost/api/summary?month=2026-10"));
    const data = await res.json();

    expect(data.remainderCents).toBe(60000);
    expect(data.savingsPercent).toBeCloseTo(40);
    expect(data.savingsGoalPercent).toBe(20);
    expect(data.status).toBe("exceeded");
  });
});
```

- [ ] **Step 6: Ejecutar y verificar que falla**

```bash
npm test -- summary.test.ts
```

Expected: FAIL — módulo no encontrado.

- [ ] **Step 7: Implementación mínima**

Crear `src/app/api/summary/route.ts`:

```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth/session";
import { calculateRemainderCents, calculateSavingsPercent, getSavingsStatus } from "@/lib/calculations/remainder";

export async function GET(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month") ?? new Date().toISOString().slice(0, 7);
  const start = new Date(`${month}-01T00:00:00.000Z`);
  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);

  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

  const [incomeSum, expenseSum] = await Promise.all([
    prisma.transaction.aggregate({
      where: { userId, type: "income", date: { gte: start, lt: end } },
      _sum: { amountCents: true },
    }),
    prisma.transaction.aggregate({
      where: { userId, type: "expense", date: { gte: start, lt: end } },
      _sum: { amountCents: true },
    }),
  ]);

  const incomeCents = incomeSum._sum.amountCents ?? 0;
  const expenseCents = expenseSum._sum.amountCents ?? 0;
  const remainderCents = calculateRemainderCents(incomeCents, expenseCents);
  const savingsPercent = calculateSavingsPercent(remainderCents, incomeCents);
  const status = getSavingsStatus(savingsPercent, user.savingsGoalPercent);

  return NextResponse.json({
    month,
    incomeCents,
    expenseCents,
    remainderCents,
    savingsPercent,
    savingsGoalPercent: user.savingsGoalPercent,
    status,
  });
}
```

- [ ] **Step 8: Ejecutar y verificar que pasa**

```bash
npm test -- summary.test.ts
```

Expected: PASS (1 test).

- [ ] **Step 9: Ejecutar toda la suite de la Fase 1**

```bash
npm test
```

Expected: todos los tests de las Tareas 1–15 en PASS.

- [ ] **Step 10: Registrar commit sugerido**

Añadir fila de la Tarea 15 a la tabla de commits sugeridos.

---

## Commits sugeridos (el usuario los ejecuta manualmente)

| # | Título del commit | Archivos principales |
|---|---|---|
| 1 | `chore: scaffold Next.js project with Dark Finance theme` | `package.json`, `tailwind.config.ts`, `src/app/layout.tsx`, `src/app/globals.css`, `src/app/page.tsx` |
| 2 | `chore: add Vitest and Postgres dev/test env config` | `vitest.config.ts`, `tests/setup.ts`, `.env.example`, `package.json` |
| 3 | `feat: add Prisma schema and database client` | `prisma/schema.prisma`, `src/lib/prisma.ts`, `tests/lib/prisma.test.ts`, `tests/setup.ts` |
| 4 | `feat: add password hashing and credential verification` | `src/lib/auth/password.ts`, `src/lib/auth/verifyCredentials.ts`, `tests/lib/auth/*` |
| 5 | `feat: add NextAuth config, session helper and route middleware` | `src/lib/auth/options.ts`, `src/lib/auth/session.ts`, `src/app/api/auth/[...nextauth]/route.ts`, `src/middleware.ts`, `src/types/next-auth.d.ts`, `tests/middleware.test.ts` |
| 6 | `feat: add registration API and category CRUD` | `src/lib/defaultCategories.ts`, `src/lib/validations/auth.ts`, `src/lib/validations/category.ts`, `src/app/api/register/route.ts`, `src/app/api/categories/**`, `tests/api/register.test.ts`, `tests/api/categories.test.ts` |
| 7 | `feat: add login/register landing page` | `src/app/page.tsx`, `src/app/providers.tsx`, `src/app/layout.tsx`, `src/components/auth/*` |
| 8 | `feat: add protected dashboard shell with top nav` | `src/app/dashboard/layout.tsx`, `src/app/dashboard/page.tsx`, `src/components/dashboard/TopNav.tsx` |
| 9 | `feat: add account balance calculation and accounts API` | `src/lib/calculations/accountBalance.ts`, `src/lib/validations/account.ts`, `src/app/api/accounts/**`, `tests/lib/calculations/accountBalance.test.ts`, `tests/api/accounts.test.ts` |
| 10 | `feat: add accounts UI` | `src/lib/format.ts`, `src/app/dashboard/accounts/page.tsx`, `src/components/accounts/AccountForm.tsx`, `src/components/accounts/AccountList.tsx`, `tests/lib/format.test.ts` |
| 11 | `feat: add transactions CRUD API` | `src/lib/validations/transaction.ts`, `src/app/api/transactions/**`, `tests/api/transactions.test.ts` |
| 12 | `feat: add transactions UI` | `src/app/dashboard/transactions/page.tsx`, `src/components/transactions/*` |
| 13 | `feat: generate due recurring transactions on dashboard load` | `src/lib/calculations/recurrence.ts`, `src/lib/calculations/generateRecurringTransactions.ts`, `src/app/dashboard/layout.tsx`, `tests/lib/calculations/recurrence.test.ts`, `tests/lib/calculations/generateRecurringTransactions.test.ts` |
| 14 | `feat: add transfers between accounts` | `src/lib/validations/transfer.ts`, `src/app/api/transfers/route.ts`, `src/components/accounts/TransferForm.tsx`, `src/app/dashboard/accounts/page.tsx`, `tests/api/transfers.test.ts` |
| 15 | `feat: add remainder and savings goal summary endpoint` | `src/lib/calculations/remainder.ts`, `src/app/api/summary/route.ts`, `tests/lib/calculations/remainder.test.ts`, `tests/api/summary.test.ts` |

## Siguiente fase

Fase 2 (plan separado): préstamos y amortización francesa, usando ya las tablas `Loan`/`LoanInstallment` creadas en la Tarea 3 y la cuenta de pago gestionada en las Tareas 9-10.
