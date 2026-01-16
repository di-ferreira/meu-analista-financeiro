"use server"

import { auth } from "@/auth";
import { db } from "@/db";
import { transactions, uploads } from "@/db/schema";
import { callIA } from "@/services/apiIA";
import { parse } from "csv-parse/sync";
import { revalidatePath } from "next/cache";


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
    console.log('sampleRecords', sampleRecords);

    const prompt = `
      Analise estas linhas de um CSV e identifique os nomes exatos das colunas de DATA, DESCRIÇÃO e VALOR.
      
      Responda EXCLUSIVAMENTE um JSON no formato:
      {"date": "nome_exato", "description": "nome_exato", "amount": "nome_exato"}

      Dados: ${JSON.stringify(sampleRecords)}

      Regras:
      1. A coluna de data geralmente contém formatos como DD/MM/YYYY.
      2. A coluna de descrição contém textos explicativos.
      3. A coluna de valor contém números ou "R$".      
    `;

    const responseIA = await callIA([
      { role: "system", content: prompt },
      { role: "user", content: `Dados: ${JSON.stringify(sampleRecords)}` }
    ]);

    console.log('responseIA analyze', `\n ------------------------ \n ${responseIA} \n ------------------------`);

    const jsonMatch = responseIA.match(/\{[\s\S]*\}/);
    const jsonContent = jsonMatch ? jsonMatch[0] : "{}";
    console.log('jsonMatch', jsonMatch);
    console.log('jsonContent', jsonContent);

    let mapping: any;
    try {
      mapping = JSON.parse(jsonContent);
    } catch (parseError) {
      console.error("Erro ao parsear JSON da IA. Resposta bruta:", responseIA);
      return { success: false, error: "A IA retornou um formato inválido. Tente novamente." };
    }

    console.log('Mapping identificado pela IA:', mapping);

    // 2. Parse Completo
    const allRecords: any[] = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      delimiter
    });

    const dataToInsert: any[] = [];

    allRecords.forEach((row, index) => {
      // Usamos o mapping da IA para pegar os valores
      const rawAmount = row[mapping.amount]?.toString()
        .replace(/R\$/g, "")
        .replace(/\s/g, "")
        .replace(".", "") // Remove separador de milhar se houver
        .replace(",", ".") || "0";

      const cleanAmount = parseFloat(rawAmount);

      // 2. Tratamento robusto de Data
      const rawDate = row[mapping.date]?.toString().trim();
      console.log('rawDate', rawDate);
      let finalDate: Date | null = null;

      if (rawDate) {
        // Lógica de conversão de data (DD/MM/YYYY)
        const parts = rawDate.split(/[\/\-]/);
        if (parts.length === 3) {
          const day = parseInt(parts[0]);
          const month = parseInt(parts[1]) - 1;
          const year = parts[2].length === 2 ? 2000 + parseInt(parts[2]) : parseInt(parts[2]);
          finalDate = new Date(year, month, day, 12, 0, 0);
        } else {
          finalDate = new Date(rawDate);
        }
      }

      if (!finalDate || isNaN(finalDate.getTime())) {
        console.warn(`Linha ${index} ignorada: Data inválida (${rawDate}) usando coluna ${mapping.date}`);
        return;
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