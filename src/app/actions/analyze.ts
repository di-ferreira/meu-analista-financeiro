'use server';

import { auth } from '@/auth';
import { db } from '@/db';
import { transactions, uploads } from '@/db/schema';
import { parse } from 'csv-parse/sync';
import { revalidatePath } from 'next/cache';
import { randomUUID } from 'node:crypto';
import { OpenAI } from 'openai';

const ollama = new OpenAI({
  baseURL: `${process.env.IA_URL}`,
  apiKey: `${process.env.IA_API_KEY}`,
  defaultHeaders: {
    'HTTP-Referer': 'http://localhost:3000',
    'X-Title': 'Meu Analista Financeiro',
  },
});

interface CsvRow {
  [key: string]: string;
}

export async function uploadAndAnalyzeAction(formData: FormData) {
  try {
    // 1. Verificar a sessão e obter o ID do utilizador
    const session = await auth();
    if (!session?.user?.id) {
      throw new Error("Não autorizado: Usuário não encontrado na sessão.");
    }

    const userId = session.user.id;

    const file = formData.get('file') as File;
    if (!file || file.size === 0) {
      throw new Error('Arquivo não enviado ou está vazio.');
    }

    const csvContent = await file.text();
    const firstLine = csvContent.split('\n')[0];
    const delimiter = firstLine.includes(';') ? ';' : ',';

    // 2. Amostragem para a IA
    const sampleRecords = parse(csvContent, {
      columns: false,
      to_line: 4,
      delimiter: delimiter,
    }) as string[][];

    const sampleText = JSON.stringify(sampleRecords);

    // 3. IA Mapper
    const mappingResponse = await ollama.chat.completions.create({
      model: `${process.env.IA_MODEL}`,
      messages: [
        {
          role: 'system',
          content: `Você é um especialista em dados. Identifique as colunas: "date", "description" e "amount". Responda APENAS JSON: {"date": "col", "description": "col", "amount": "col"}`,
        },
        { role: 'user', content: `Amostra: ${sampleText}` },
      ],
      response_format: { type: 'json_object' },
    });

    const mapping = JSON.parse(mappingResponse.choices[0].message.content || '{}');

    // 4. Processar CSV completo
    const allRecords = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      delimiter: delimiter,
    }) as CsvRow[];

    // 5. Persistência do Registro de Upload vinculado ao utilizador
    const [newUpload] = await db
      .insert(uploads)
      .values({
        id: randomUUID(), // Garante ID se o schema não auto-gerar
        userId: userId,   // VÍNCULO COM O UTILIZADOR
        fileName: file.name,
        status: 'completed',
      })
      .returning();

    // 6. Preparar transações vinculadas ao utilizador e ao upload
    const dataToInsert = allRecords
      .map((row) => {
        // Limpeza do Valor
        let rawAmount = row[mapping.amount] || '0';
        const cleanAmountStr = rawAmount
          .replace(/R\$/g, '')
          .replace(/\s/g, '')
          .replace(/\.(?=[^,]*$)/g, '')
          .replace(',', '.');
        const cleanAmount = parseFloat(cleanAmountStr);

        // Tratamento de Data
        const rawDate = row[mapping.date];
        let finalDate: Date;
        if (rawDate.includes('/')) {
          const [day, month, year] = rawDate.split('/');
          finalDate = new Date(`${year}-${month}-${day}T12:00:00`);
        } else {
          finalDate = new Date(rawDate);
        }

        if (isNaN(finalDate.getTime()) || isNaN(cleanAmount)) return null;

        return {
          id: randomUUID(),
          userId: userId,      // VÍNCULO COM O UTILIZADOR
          uploadId: newUpload.id,
          date: finalDate,
          description: row[mapping.description] || 'Sem descrição',
          amount: cleanAmount,
          type: cleanAmount >= 0 ? ('income' as const) : ('expense' as const),
        };
      })
      .filter((item) => item !== null) as any[];

    // 7. Inserção em massa
    if (dataToInsert.length > 0) {
      await db.insert(transactions).values(dataToInsert);
    }

    revalidatePath('/');
    return { success: true, uploadId: newUpload.id };

  } catch (error) {
    console.error('Erro na Action analyze:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    };
  }
}