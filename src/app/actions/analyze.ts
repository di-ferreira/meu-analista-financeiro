"use server"

import { auth } from "@/auth";
import { db } from "@/db";
import { transactions, uploads } from "@/db/schema";
import { parse } from "csv-parse/sync";
import { revalidatePath } from "next/cache";
import { OpenAI } from "openai";

const ollama = new OpenAI({
  baseURL: process.env.IA_URL,
  apiKey: process.env.IA_API_KEY,
});

export async function uploadAndAnalyzeAction(formData: FormData) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Sessão expirada. Faça login novamente." };

    const file = formData.get("file") as File;
    if (!file || file.size === 0) return { success: false, error: "Arquivo não selecionado ou vazio." };

    const csvContent = await file.text();
    const delimiter = csvContent.split("\n")[0].includes(";") ? ";" : ",";

    // 1. Amostragem para IA
    const sampleRecords: string[][] = parse(csvContent, {
      columns: false,
      to_line: 5,
      delimiter,
      skip_empty_lines: true
    });

    const mappingResponse = await ollama.chat.completions.create({
      model: process.env.IA_MODEL || "llama3",
      messages: [
        { role: "system", content: 'Identifique colunas: "date", "description", "amount". Responda APENAS JSON: {"date": "nome_col", "description": "nome_col", "amount": "nome_col"}' },
        { role: "user", content: `Dados: ${JSON.stringify(sampleRecords)}` }
      ],
      response_format: { type: "json_object" }
    });

    const mapping = JSON.parse(mappingResponse.choices[0].message.content || "{}");

    // 2. Parse Completo
    const allRecords: any[] = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      delimiter
    });

    // 3. Transação (Removido o async de dentro do tx)
    // Para o better-sqlite3, fazemos o processamento pesado fora e apenas a inserção dentro
    const dataToInsert: any[] = [];

    // Preparamos os dados antes da transação
    allRecords.forEach((row) => {
      const rawAmount = row[mapping.amount]?.replace(/R\$/g, "").replace(/\s/g, "").replace(",", ".") || "0";
      const cleanAmount = parseFloat(rawAmount);

      const rawDate = row[mapping.date];
      const dateParts = rawDate?.includes("/") ? rawDate.split("/") : null;
      const finalDate = dateParts ? new Date(`${dateParts[2]}-${dateParts[1]}-${dateParts[0]}T12:00:00`) : new Date(rawDate);

      dataToInsert.push({
        userId: session.user?.id,
        date: finalDate,
        description: row[mapping.description] || "Sem descrição",
        amount: cleanAmount,
        type: cleanAmount >= 0 ? "income" : "expense",
      });
    });

    // Execução da transação síncrona do Drizzle com better-sqlite3
    db.transaction((tx) => {
      // .get() executa a query e retorna o primeiro objeto encontrado
      const newUpload = tx.insert(uploads).values({
        userId: session.user?.id!,
        fileName: file.name,
      }).returning().get(); // Alterado de [newUpload] para .get()

      if (!newUpload) {
        throw new Error("Falha ao criar registro de upload.");
      }

      // Agora vinculamos as transações ao ID gerado
      const finalTransactions = dataToInsert.map(t => ({
        ...t,
        uploadId: newUpload.id
      }));

      if (finalTransactions.length > 0) {
        // .run() é usado para inserções em massa que não precisam de retorno
        tx.insert(transactions).values(finalTransactions).run();
      }
    });

    revalidatePath("/");
    return { success: true, message: "Dados processados com sucesso!" };

  } catch (error: any) {
    console.error("Erro na análise:", error);
    return {
      success: false,
      error: error.message || "Ocorreu um erro interno ao processar o CSV."
    };
  }
}