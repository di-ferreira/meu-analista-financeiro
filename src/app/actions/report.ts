'use server';

import { db } from '@/db';
import { OpenAI } from 'openai';

const ollama = new OpenAI({
  baseURL: `${process.env.IA_URL}`,
  apiKey: `${process.env.IA_API_KEY}`,
  defaultHeaders: {
    'HTTP-Referer': 'http://localhost:3000', // Opcional para o ranking do OpenRouter
    'X-Title': 'Meu Analista Financeiro', // Opcional
  },
});

export async function generateFinancialReport() {
  // 1. Buscar dados do SQLite
  const allTransactions = await db.query.transactions.findMany();

  const summary = allTransactions.reduce(
    (acc, curr) => {
      if (curr.type === 'income') acc.incomes += curr.amount;
      else acc.expenses += Math.abs(curr.amount);
      return acc;
    },
    { incomes: 0, expenses: 0 }
  );

  const balance = summary.incomes - summary.expenses;

  // 2. Pedir Insight para a IA
  const response = await ollama.chat.completions.create({
    model: `${process.env.IA_MODEL}`,
    messages: [
      {
        role: 'system',
        content:
          'Você é um CFO experiente. Analise os números e dê um conselho curto e prático.',
      },
      {
        role: 'user',
        content: `Dados do mês: Entradas R$ ${summary.incomes}, Saídas R$ ${
          summary.expenses
        }, Saldo R$ ${balance}. 
        Liste as 3 transações mais relevantes: ${JSON.stringify(
          allTransactions.slice(0, 5)
        )}`,
      },
    ],
  });

  return {
    summary,
    balance,
    insight: response.choices[0].message.content,
  };
}

