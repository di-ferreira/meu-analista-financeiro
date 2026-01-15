// Interface que define a estrutura da resposta do Ollama (Padrão OpenAI)
interface OllamaChatResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// Opcional: Interface para o payload que você envia
interface OllamaChatPayload {
  model: string;
  messages: { role: "system" | "user" | "assistant"; content: string }[];
  stream: boolean;
  temperature: number;
}

/**
 * Realiza a chamada para a API do Ollama utilizando fetch nativo.
 * @param prompt O texto a ser analisado pela IA.
 * @returns Uma Promise contendo o texto gerado pela IA.
 */
export async function callIA(prompt: string): Promise<string> {
  const baseUrl = process.env.IA_URL?.replace(/\/$/, "");
  const url = `${baseUrl}/api/chat`;

  // 1. Criamos um controlador para aumentar o tempo de espera
  // 300.000ms = 5 minutos (dando tempo de sobra para a IA local pensar)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 300000);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.IA_MODEL || "llama3.1:8b",
        messages: [
          { role: "system", content: "Você é um analista financeiro. Responda em português." },
          { role: "user", content: prompt }
        ],
        stream: false,
      }),
      signal: controller.signal, // Vinculamos o timeout aqui
    });

    clearTimeout(timeoutId); // Limpamos o timeout se a resposta chegar antes

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erro Ollama: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data.message?.content?.trim() || "IA sem resposta.";

  } catch (error: any) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      console.error("Erro: A IA demorou demais para responder (Timeout).");
      return "A análise está levando mais tempo que o esperado. Tente atualizar a página em alguns instantes.";
    }

    console.error("Erro na conexão com Ollama:", error.message);
    return "Nota: O serviço de IA demorou a responder. Verifique se o seu computador está muito sobrecarregado.";
  }
}