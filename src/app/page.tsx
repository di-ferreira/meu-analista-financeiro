import { Suspense } from "react";
import { auth } from "@/auth";
import { db } from "@/db";
import { transactions } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { logoutAction } from "@/app/actions/logout";
import { UploadButton } from "@/components/UploadButton";
import { getFinancialSummary } from "@/app/actions/report";
import { FormatToCurrency } from "@/lib/utils";

export default async function DashboardPage() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) return null;

  // Verificação de dados para decidir o layout central
  const dataCount = db
    .select({ value: sql<number>`count(*)` })
    .from(transactions)
    .where(eq(transactions.userId, userId))
    .get();

  const hasData = (dataCount?.value || 0) > 0;
  return (
    <main className="p-4 md:p-8 max-w-5xl mx-auto space-y-8">
      {/* HEADER: Sempre visível */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Olá, {session?.user?.name}</h1>
          <p className="text-sm text-gray-500">Gestão Financeira Inteligente</p>
        </div>

        <div className="flex items-center gap-3">
          {hasData && <UploadButton variant="compact" />}

          <form action={logoutAction}>
            <button className="text-sm text-red-600 border border-red-600 px-3 py-2 rounded-lg hover:bg-red-50 transition-colors">
              Sair
            </button>
          </form>
        </div>
      </header>

      {!hasData ? (
        <div className="text-center py-24 border-2 border-dashed rounded-2xl bg-gray-50/50 space-y-4">
          <div className="text-5xl">📈</div>
          <h2 className="text-xl font-semibold">Nenhum dado para analisar</h2>
          <p className="text-gray-500 max-w-sm mx-auto">
            Envie seu primeiro extrato CSV para que a IA possa gerar seu relatório financeiro.
          </p>
          <div className="pt-4">
            <UploadButton />
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          <Suspense fallback={<DashboardSkeleton />}>
            <DashboardContent />
          </Suspense>
        </div>
      )}
    </main>
  );
}

function DashboardSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map(i => <div key={i} className="h-24 bg-gray-200 rounded-xl" />)}
      </div>
      <div className="h-40 bg-gray-200 rounded-xl" />
    </div>
  );
}

async function DashboardContent() {
  const report = await getFinancialSummary();

  return (
    <div className="space-y-6">
      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card title="Entradas" value={report.summary.income} color="text-green-600" bg="bg-green-50" />
        <Card title="Saídas" value={report.summary.expense} color="text-red-600" bg="bg-red-50" />
        <Card title="Saldo Líquido" value={report.summary.balance} color="text-blue-600" bg="bg-blue-50" />
      </div>

      {/* Insight Box */}
      <section className="p-6 bg-slate-900 text-slate-100 rounded-2xl shadow-xl border-t-4 border-blue-500">
        <h3 className="text-blue-400 font-bold flex items-center gap-2 mb-3">
          <span className="text-xl">🤖</span> Análise do Estrategista IA
        </h3>
        <div className="prose prose-invert max-w-none">
          <p className="whitespace-pre-wrap leading-relaxed text-slate-300">
            {report.insight}
          </p>
        </div>
      </section>

      {/* Lista de Transações Recentes */}
      <section className="bg-white border rounded-xl overflow-hidden">
        <div className="p-4 border-b bg-gray-50">
          <h3 className="font-semibold">Últimas Transações Analisadas</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="text-gray-500 border-b">
                <th className="p-4 font-medium">Data</th>
                <th className="p-4 font-medium">Descrição</th>
                <th className="p-4 text-right font-medium">Valor</th>
              </tr>
            </thead>
            <tbody>
              {report.latestTransactions.map((tx: any) => (
                <tr key={tx.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="p-4 text-gray-600">{new Date(tx.date).toLocaleDateString('pt-BR')}</td>
                  <td className="p-4 font-medium">{tx.description}</td>
                  <td className={`p-4 text-right font-bold ${tx.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {FormatToCurrency(tx.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Card({ title, value, color, bg }: any) {
  return (
    <div className={`p-6 ${bg} rounded-2xl border border-white/50 shadow-sm`}>
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">{title}</p>
      <p className={`text-2xl font-black ${color}`}>
        {FormatToCurrency(value)}
      </p>
    </div>
  );
}