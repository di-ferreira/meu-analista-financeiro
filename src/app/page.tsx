import { auth } from "@/auth";
import { getFinancialSummary } from "@/app/actions/report";
import { logoutAction } from "@/app/actions/logout"; // Crie uma simples para signOut()

export default async function DashboardPage() {
  const session = await auth();
  const report = await getFinancialSummary();

  return (
    <main className="p-8 max-w-4xl mx-auto space-y-6">
      <header className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Olá, {session?.user?.name}</h1>
        <form action={logoutAction}>
          <button className="text-sm text-red-600 border border-red-600 px-3 py-1 rounded">Sair</button>
        </form>
      </header>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-700">Entradas</p>
          <p className="text-xl font-bold text-green-900">R$ {report.summary.income.toFixed(2)}</p>
        </div>
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">Saídas</p>
          <p className="text-xl font-bold text-red-900">R$ {report.summary.expense.toFixed(2)}</p>
        </div>
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-700">Saldo Geral</p>
          <p className="text-xl font-bold text-blue-900">R$ {report.summary.balance.toFixed(2)}</p>
        </div>
      </div>

      {/* Insight da IA */}
      <section className="p-6 bg-slate-900 text-slate-100 rounded-xl shadow-inner">
        <h3 className="text-blue-400 font-semibold mb-2 flex items-center gap-2">
          ✨ Insight do Analista IA
        </h3>
        <p className="italic text-lg">"{report.insight}"</p>
      </section>

      {/* Tabela de Transações */}
      <section className="bg-white border rounded-lg overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="p-4">Data</th>
              <th className="p-4">Descrição</th>
              <th className="p-4 text-right">Valor</th>
            </tr>
          </thead>
          <tbody>
            {report.latestTransactions.map(tx => (
              <tr key={tx.id} className="border-b">
                <td className="p-4 text-sm">{new Date(tx.date).toLocaleDateString()}</td>
                <td className="p-4">{tx.description}</td>
                <td className={`p-4 text-right font-medium ${tx.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  R$ {tx.amount.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}