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
    if (!session?.user?.id) throw new Error("Não autorizado");

    const file = formData.get("file") as File;
    const csvContent = await file.text();
    const delimiter = csvContent.split("\n")[0].includes(";") ? ";" : ",";

    // 1. Mapping com IA (Amostra)
    const sampleRecords: string[][] = parse(csvContent, {
      columns: false,
      to_line: 4,
      delimiter,
      skip_empty_lines: true
    });

    const mappingResponse = await ollama.chat.completions.create({
      model: process.env.IA_MODEL || "llama3",
      messages: [
        { role: "system", content: 'Identifique colunas: "date", "description", "amount". Responda JSON: {"date": "col", "description": "col", "amount": "col"}' },
        { role: "user", content: JSON.stringify(sampleRecords) }
      ],
      response_format: { type: "json_object" }
    });

    const mapping = JSON.parse(mappingResponse.choices[0].message.content || "{}");

    // 2. Parse completo
    const allRecords = parse(csvContent, { columns: true, skip_empty_lines: true, delimiter });

    // 3. Persistência Atômica (Transaction)
    // O better-sqlite3 lida bem com transações síncronas/assíncronas no Drizzle
    await db.transaction(async (tx) => {
      const [newUpload] = await tx.insert(uploads).values({
        userId: session.user?.id,
        fileName: file.name,
      }).returning();

      const dataToInsert = allRecords.map((row: any) => {
        const rawAmount = row[mapping.amount]?.replace(/R\$/g, "").replace(/\s/g, "").replace(",", ".") || "0";
        const cleanAmount = parseFloat(rawAmount);

        // Tratamento de data para Date Object
        const rawDate = row[mapping.date];
        const dateParts = rawDate.includes("/") ? rawDate.split("/") : null;
        const finalDate = dateParts ? new Date(`${dateParts[2]}-${dateParts[1]}-${dateParts[0]}T12:00:00`) : new Date(rawDate);

        return {
          userId: session.user?.id,
          uploadId: newUpload.id,
          date: finalDate,
          description: row[mapping.description] || "Sem descrição",
          amount: cleanAmount,
          type: cleanAmount >= 0 ? ("income" as const) : ("expense" as const),
        };
      });

      if (dataToInsert.length > 0) {
        await tx.insert(transactions).values(dataToInsert);
      }
    });

    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Erro na análise:", error);
    return { success: false, error: "Falha ao processar o ficheiro." };
  }
}