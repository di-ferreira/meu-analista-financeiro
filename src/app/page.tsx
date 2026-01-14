import { auth } from "@/auth";
import { db } from "@/db";
import { transactions } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { getFinancialSummary } from "@/app/actions/report";
import { logoutAction } from "@/app/actions/logout";
import { UploadButton } from "@/components/UploadButton";

export default async function DashboardPage() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) return null;

  const dataCount = db
    .select({ value: sql<number>`count(*)` })
    .from(transactions)
    .where(eq(transactions.userId, userId))
    .get();

  const hasData = (dataCount?.value || 0) > 0;

  return (
    <main className="p-8 max-w-4xl mx-auto space-y-8">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Olá, {session?.user?.name}</h1>
          <p className="text-sm text-gray-500">Bem-vindo ao seu Analista Financeiro.</p>
        </div>
        <form action={logoutAction}>
          <button className="text-sm text-red-600 border border-red-600 px-3 py-1 rounded hover:bg-red-50">
            Sair
          </button>
        </form>
      </header>

      {!hasData ? (
        <div className="text-center py-20 border-2 border-dashed rounded-xl space-y-4">
          <div className="text-4xl">📊</div>
          <h2 className="text-xl font-semibold">Nenhum dado encontrado</h2>
          <p className="text-gray-500">Faça upload de um arquivo CSV para começar a análise.</p>
          <div className="flex justify-center">
            <UploadButton />
          </div>
        </div>
      ) : (
        <DashboardContent />
      )}
    </main>
  );
}

async function DashboardContent() {
  const report = await getFinancialSummary();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-green-50 rounded-lg">
          <p className="text-sm text-green-700 font-medium">Entradas</p>
          <p className="text-2xl font-bold">R$ {report.summary.income.toFixed(2)}</p>
        </div>
        <div className="p-4 bg-red-50 rounded-lg">
          <p className="text-sm text-red-700 font-medium">Saídas</p>
          <p className="text-2xl font-bold">R$ {report.summary.expense.toFixed(2)}</p>
        </div>
        <div className="p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-700 font-medium">Saldo</p>
          <p className="text-2xl font-bold">R$ {report.summary.balance.toFixed(2)}</p>
        </div>
      </div>

      <div className="p-6 bg-gray-900 text-white rounded-xl">
        <h3 className="text-blue-400 font-bold mb-2">Insight da IA</h3>
        <p className="leading-relaxed">{report.insight}</p>
      </div>
    </div>
  );
}