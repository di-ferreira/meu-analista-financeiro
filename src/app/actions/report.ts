"use server"

import { auth } from "@/auth";
import { db } from "@/db";
import { transactions } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { FormatToCurrency } from "@/lib/utils";
import { callIA, iMessage } from "@/services/apiIA";

export async function getFinancialSummary() {
  try {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Usuário não autenticado.");

    const userId = session.user.id;

    // 1. Busca de métricas
    const data = db.select({
      type: transactions.type,
      total: sql<number>`sum(${transactions.amount})`,
    })
      .from(transactions)
      .where(eq(transactions.userId, userId))
      .groupBy(transactions.type)
      .all();

    const income = data.find(d => d.type === 'income')?.total || 0;
    const expense = data.find(d => d.type === 'expense')?.total || 0;
    const balance = income + expense;

    // 2. Busca das transações
    const latestTransactions = await db.query.transactions.findMany({
      where: eq(transactions.userId, userId),
      limit: 15,
      orderBy: (transactions, { desc }) => [desc(transactions.date)],
    });

    const cleanTransactionsForAI = latestTransactions.map(tx => ({
      date: tx.date instanceof Date ? tx.date.toLocaleDateString('pt-BR') : tx.date,
      description: tx.description,
      amount: tx.amount,
      type: tx.type === 'income' ? 'Entrada' : 'Saída'
    }));

    // 3. Chamada à IA com tratamento de erro robusto
    let insight = "A IA não conseguiu gerar uma análise no momento.";
    const prompt = `
      Aja como um analista financeiro experiente.
      Analise os seguintes dados do cliente:
      - Renda Total: R$ ${FormatToCurrency(income.toString())}
      - Despesas Totais: R$ ${FormatToCurrency(Math.abs(expense).toString())}
      - Saldo Atual: R$ ${FormatToCurrency(balance.toString())}
      
      Últimas Transações:
      ${JSON.stringify(cleanTransactionsForAI)}
      
      Com base nisso, forneça um diagnóstico detalhado da saúde financeira dele e 3 sugestões práticas para melhorar o saldo no próximo mês.
    `;
    try {
      const messages: iMessage[] = [
        { role: "system", content: "Você é um analista financeiro. Responda em português." },
        { role: "user", content: prompt }
      ];
      const responseIA = await callIA(messages);
      console.log('responseIA report', responseIA);
      if (responseIA) {
        insight = responseIA.trim() || insight;
      }
    } catch (aiError) {
      console.error("Erro na conexão com Ollama:", aiError);
      insight = "Nota: O serviço de análise (Ollama) está offline. O resumo financeiro foi gerado apenas com dados brutos.";
    }

    return {
      summary: { income, expense, balance },
      insight: insight, // Agora o insight sempre terá um valor (texto ou aviso de erro)
      latestTransactions: latestTransactions
    };

  } catch (error: any) {
    console.error("Erro crítico no Report Action:", error.message);
    return {
      summary: { income: 0, expense: 0, balance: 0 },
      insight: "Erro ao carregar relatório.",
      latestTransactions: []
    };
  }
}