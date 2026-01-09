'use server';

import { db } from '@/db';
import { transactions, uploads } from '@/db/schema';
import { parse } from 'csv-parse/sync';
import { revalidatePath } from 'next/cache';
import { randomUUID } from 'node:crypto';
import { OpenAI } from 'openai';

// Configuração do Ollama compatível com OpenAI
const ollama = new OpenAI({
  baseURL: `${process.env.IA_URL}`,
  apiKey: `${process.env.IA_API_KEY}`,
  defaultHeaders: {
    'HTTP-Referer': 'http://localhost:3000', // Opcional para o ranking do OpenRouter
    'X-Title': 'Meu Analista Financeiro', // Opcional
  },
});

interface CsvRow {
  [key: string]: string;
}

export async function uploadAndAnalyzeAction(formData: FormData) {
  try {
    const file = formData.get('file') as File;
    if (!file || file.size === 0) {
      throw new Error('Arquivo não enviado ou está vazio.');
    }

    const csvContent = await file.text();
    const firstLine = csvContent.split('\n')[0];
    const delimiter = firstLine.includes(';') ? ';' : ',';

    // 1. Amostragem para a IA (limitado a 3 linhas para não estourar o contexto)
    const sampleRecords = parse(csvContent, {
      columns: false,
      to_line: 4, // Cabeçalho + 3 linhas
      delimiter: delimiter,
    }) as string[][];

    const sampleText = JSON.stringify(sampleRecords);

    // 2. IA Mapper: Identificar colunas dinamicamente
    const mappingResponse = await ollama.chat.completions.create({
      model: `${process.env.IA_MODEL}`,
      messages: [
        {
          role: 'system',
          content: `Você é um especialista em dados. O usuário enviará uma amostra de CSV. 
          Identifique quais colunas representam: "date" (data), "description" (descrição do gasto/ganho) e "amount" (valor financeiro).
          Responda APENAS um JSON puro no formato: {"date": "nome_coluna", "description": "nome_coluna", "amount": "nome_coluna"}`,
        },
        { role: 'user', content: `Amostra do CSV: ${sampleText}` },
      ],
      response_format: { type: 'json_object' },
    });

    const rawContent = mappingResponse.choices[0].message.content || '{}';
    const mapping = JSON.parse(rawContent);

    // 3. Processar CSV completo
    const allRecords = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      delimiter: delimiter,
    }) as CsvRow[];

    // 4. Persistência no SQLite
    const [newUpload] = await db
      .insert(uploads)
      .values({
        fileName: file.name,
        status: 'completed',
      })
      .returning();

    // Inserção em massa (Batch Insert) é mais eficiente
    const dataToInsert = allRecords
      .map((row) => {
        // 1. Limpeza do Valor (Trata 1.500,00 ou 1500.00)
        let rawAmount = row[mapping.amount] || '0';
        // Remove R$, espaços e pontos de milhar, troca vírgula por ponto
        const cleanAmountStr = rawAmount
          .replace(/R\$/g, '')
          .replace(/\s/g, '')
          .replace(/\.(?=[^,]*$)/g, '') // Remove ponto se houver vírgula depois
          .replace(',', '.');

        const cleanAmount = parseFloat(cleanAmountStr);

        // 2. Tratamento de Data (DD/MM/YYYY para YYYY-MM-DD)
        const rawDate = row[mapping.date];
        let finalDate: Date;

        if (rawDate.includes('/')) {
          const [day, month, year] = rawDate.split('/');
          finalDate = new Date(`${year}-${month}-${day}T12:00:00`); // T12:00 evita problemas de fuso
        } else {
          finalDate = new Date(rawDate);
        }

        // 3. Validação final
        if (isNaN(finalDate.getTime()) || isNaN(cleanAmount)) {
          console.warn('Linha ignorada por dados inválidos:', row);
          return null;
        }

        return {
          id: randomUUID(), // Garante um ID único para cada transação
          uploadId: newUpload.id,
          date: finalDate,
          description: row[mapping.description] || 'Sem descrição',
          amount: cleanAmount,
          type: cleanAmount >= 0 ? ('income' as const) : ('expense' as const),
        };
      })
      .filter((item) => item !== null) as any[];

    // Insere todos de uma vez
    if (dataToInsert.length > 0) {
      await db.insert(transactions).values(dataToInsert);
    }

    // Atualiza a interface do Next.js
    revalidatePath('/');

    return { success: true, uploadId: newUpload.id, mapping };
  } catch (error) {
    console.error('Erro na Action analyze:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    };
  }
}

