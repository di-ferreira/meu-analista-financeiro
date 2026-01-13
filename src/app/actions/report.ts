"use server"

import { auth } from "@/auth";
import { db } from "@/db";
import { transactions } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { OpenAI } from "openai";

const ollama = new OpenAI({
  baseURL: process.env.IA_URL,
  apiKey: process.env.IA_API_KEY,
});

export async function getFinancialSummary() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Não autorizado");

  // 1. Buscar métricas básicas no SQLite
  const data = await db.select({
    type: transactions.type,
    total: sql<number>`sum(${transactions.amount})`,
  })
    .from(transactions)
    .where(eq(transactions.userId, session.user.id))
    .groupBy(transactions.type);

  const income = data.find(d => d.type === 'income')?.total || 0;
  const expense = data.find(d => d.type === 'expense')?.total || 0;
  const balance = income + expense; // Despesas vêm como valor negativo

  // 2. Buscar as últimas 10 transações para contexto da IA
  const latestTransactions = await db.query.transactions.findMany({
    where: eq(transactions.userId, session.user.id),
    limit: 10,
    orderBy: (transactions, { desc }) => [desc(transactions.date)],
  });

  // 3. Solicitar Insight ao Ollama
  const prompt = `
    Como analista financeiro, analise estes dados:
    Renda Total: R$ ${income}
    Despesas Totais: R$ ${expense}
    Saldo Atual: R$ ${balance}
    Últimas transações: ${JSON.stringify(latestTransactions)}
    
    Dê um conselho curto e prático (máximo 3 frases) sobre a saúde financeira deste usuário.
  `;

  const aiResponse = await ollama.chat.completions.create({
    model: process.env.IA_MODEL || "llama3",
    messages: [{ role: "user", content: prompt }],
  });

  return {
    summary: { income, expense, balance },
    insight: aiResponse.choices[0].message.content,
    latestTransactions
  };
}