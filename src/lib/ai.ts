// Usando o formato de compatibilidade do Ollama com OpenAI
import { OpenAI } from 'openai';

const ollama = new OpenAI({
  baseURL: `${process.env.IA_URL}`,
  apiKey: `${process.env.IA_API_KEY}`,
  defaultHeaders: {
    'HTTP-Referer': 'http://localhost:3000', // Opcional para o ranking do OpenRouter
    'X-Title': 'Meu Analista Financeiro', // Opcional
  },
});

export async function analyzeWithLocalAI(jsonData: any) {
  const prompt = `
    Aja como um analista financeiro. Analise estes dados JSON e me dê 3 insights:
    ${JSON.stringify(jsonData)}
  `;

  try {
    const response = await ollama.chat.completions.create({
      model: `${process.env.IA_MODEL}`,
      messages: [
        {
          role: 'system',
          content: 'Você é um consultor financeiro focado em PMEs brasileiras.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.1, // Manter baixo para análise de dados ser mais precisa
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error('Erro ao chamar Ollama:', error);
    return 'Falha na análise local.';
  }
}

