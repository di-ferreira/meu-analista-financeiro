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

    const dataToInsert: any[] = [];

    allRecords.forEach((row, index) => {
      // 1. Limpeza do valor (Amount)
      const rawAmount = row[mapping.amount]?.toString()
        .replace(/R\$/g, "")
        .replace(/\s/g, "")
        .replace(",", ".") || "0";
      const cleanAmount = parseFloat(rawAmount);

      // 2. Tratamento robusto de Data
      const rawDate = row[mapping.date]?.toString().trim();
      let finalDate: Date | null = null;

      if (rawDate) {
        // Tenta formato DD/MM/YYYY ou DD-MM-YYYY
        if (rawDate.includes("/") || rawDate.includes("-")) {
          const separator = rawDate.includes("/") ? "/" : "-";
          const parts = rawDate.split(separator);
          if (parts.length === 3) {
            // Assume DD/MM/YYYY
            const day = parseInt(parts[0]);
            const month = parseInt(parts[1]) - 1; // Meses no JS são 0-11
            const year = parts[2].length === 2 ? 2000 + parseInt(parts[2]) : parseInt(parts[2]);
            finalDate = new Date(year, month, day, 12, 0, 0);
          }
        } else {
          // Tenta fallback para datas padrão ISO
          finalDate = new Date(rawDate);
        }
      }

      // 3. Validação Crucial: Se a data for inválida, ignoramos a linha ou usamos HOJE
      // Aqui evitamos o erro de NOT NULL constraint do SQLite
      if (!finalDate || isNaN(finalDate.getTime())) {
        console.warn(`Linha ${index} ignorada: Data inválida (${rawDate})`);
        return; // Pula esta linha
      }

      dataToInsert.push({
        userId: session.user?.id,
        date: finalDate, // Agora garantidamente não é nulo
        description: row[mapping.description]?.toString().substring(0, 255) || "Sem descrição",
        amount: cleanAmount,
        type: cleanAmount >= 0 ? "income" : "expense",
      });
    });

    if (dataToInsert.length === 0) {
      return { success: false, error: "Nenhuma transação válida encontrada no arquivo." };
    }

    // 4. Inserção no Banco
    db.transaction((tx) => {
      const newUpload = tx.insert(uploads).values({
        userId: session.user?.id!,
        fileName: file.name,
      }).returning().get();

      if (newUpload) {
        const finalTransactions = dataToInsert.map(t => ({ ...t, uploadId: newUpload.id }));
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