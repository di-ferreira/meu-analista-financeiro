"use server"

import { auth } from "@/auth";
import { db } from "@/db";
import { transactions } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { OpenAI } from "openai";

// Configuração do cliente OpenAI/Ollama com timeout estendido
const ollama = new OpenAI({
  baseURL: process.env.IA_URL,
  apiKey: process.env.IA_API_KEY,
  timeout: 90000, // 90 segundos para garantir que a IA complete o raciocínio
});

export async function getFinancialSummary() {
  try {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Usuário não autenticado.");

    const userId = session.user.id;

    // 1. Busca de métricas financeiras (Síncrono com .all() do better-sqlite3)
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

    // 2. Busca das últimas 15 transações
    // Adicionamos o await para garantir que 'latestTransactions' seja o Array de dados
    const latestTransactions = await db.query.transactions.findMany({
      where: eq(transactions.userId, userId),
      limit: 15,
      orderBy: (transactions, { desc }) => [desc(transactions.date)],
    });

    // 3. Limpeza de dados (Sanitização)
    // Agora o .map() funcionará pois o TypeScript sabe que é um Array
    const cleanTransactionsForAI = latestTransactions.map(tx => ({
      date: tx.date instanceof Date ? tx.date.toLocaleDateString('pt-BR') : tx.date,
      description: tx.description,
      amount: tx.amount,
      type: tx.type === 'income' ? 'Entrada' : 'Saída'
    }));

    // 4. Chamada à IA com stream desativado para retorno completo
    const prompt = `
      Aja como um analista financeiro experiente.
      Analise os seguintes dados do cliente:
      - Renda Total: R$ ${income.toFixed(2)}
      - Despesas Totais: R$ ${Math.abs(expense).toFixed(2)}
      - Saldo Atual: R$ ${balance.toFixed(2)}
      
      Últimas Transações:
      ${JSON.stringify(cleanTransactionsForAI, null, 2)}
      
      Com base nisso, forneça um diagnóstico detalhado da saúde financeira dele e 3 sugestões práticas para melhorar o saldo no próximo mês.
    `;

    const aiResponse = await ollama.chat.completions.create({
      model: process.env.IA_MODEL || "llama3",
      messages: [
        {
          role: "system",
          content: "Você é um consultor financeiro profissional. Seus retornos devem ser completos, objetivos e em português do Brasil."
        },
        { role: "user", content: prompt }
      ],
      stream: false, // Garante que o texto venha inteiro de uma vez
      temperature: 0.3, // Menor criatividade, maior precisão nos dados
    });

    const insight = aiResponse.choices[0].message.content?.trim() || "A IA não conseguiu gerar uma análise no momento.";

    return {
      summary: { income, expense, balance },
      insight: insight,
      latestTransactions: latestTransactions // Retornamos o original para a tabela (Drizzle lida bem)
    };

  } catch (error: any) {
    console.error("Erro crítico no Report Action:", error.message);

    // Fallback amigável em caso de erro (ex: Ollama offline)
    return {
      summary: { income: 0, expense: 0, balance: 0 },
      insight: "Infelizmente, não foi possível conectar ao analista IA agora. Verifique se o serviço Ollama está rodando.",
      latestTransactions: []
    };
  }
}