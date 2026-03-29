import { GoogleGenerativeAI } from "@google/generative-ai";
import "dotenv/config";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite-preview" });

export interface AISuggestionInput {
  productName: string;
  productCode: string;
  targetDays: number;
  salesSummary: string; // Ex: "5 unidades em 10 dias"
  avgDailyTurnover: number;
  userAdjustmentFactor: number; // Ex: 1.2 (pede 20% a mais)
  lostSalesCount: number; // Qtd de vezes que pediram no balcão e não tinha
  isCurrentlyMissing: boolean;
}

export async function getSmartAISuggestion(input: AISuggestionInput) {
  const prompt = `
    Você é o Assistente de Compras Especializado da PredictMed, uma farmácia de alto giro. 
    Seu objetivo é sugerir a quantidade ideal de compra para o produto "${input.productName}" (Cód: ${input.productCode}).
    
    DADOS DO PRODUTO:
    - Período Alvo de Estoque: ${input.targetDays} dias.
    - Giro Diário Médio (Matemático): ${input.avgDailyTurnover.toFixed(2)} unidades/dia.
    - Histórico de Vendas Recente: ${input.salesSummary}.
    - Comportamento do Usuário: O farmacêutico costuma ajustar as sugestões em ${((input.userAdjustmentFactor - 1) * 100).toFixed(0)}% para este item.
    - Procura no Balcão (Venda Perdida): Este item foi procurado ${input.lostSalesCount} vezes manualmente por clientes enquanto estava em falta.
    - Status de Ruptura: ${input.isCurrentlyMissing ? 'O item está atualmente em falta no estoque físico.' : 'O item tem estoque, mas precisa de reposição.'}

    REGRAS DE DECISÃO:
    1. Se houver "Venda Perdida" alta (>2), aumente a sugestão para cobrir a demanda reprimida.
    2. Considere o "Fator de Ajuste" do usuário como uma preferência de segurança. Se ele sempre pede mais, a IA deve sugerir mais.
    3. Se o giro diário for zero, mas o item teve procuras manuais, sugira uma quantidade mínima para teste (ex: 1 ou 2 unidades).

    RESPONDA APENAS EM FORMATO JSON:
    {
      "suggestedQuantity": number,
      "reasoning": "Breve explicação do porquê deste valor (máximo 150 caracteres)"
    }
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Limpeza de markdown se a IA retornar ```json ... ```
    const jsonStr = text.replace(/```json|```/g, "").trim();
    return JSON.parse(jsonStr) as { suggestedQuantity: number; reasoning: string };
  } catch (error) {
    console.error("[GeminiAI] Erro na sugestão inteligente:", error);
    // Fallback matemático simples caso a IA falhe ou atinja quota
    const mathSuggestion = Math.ceil(input.avgDailyTurnover * input.targetDays * input.userAdjustmentFactor);
    return { 
      suggestedQuantity: mathSuggestion, 
      reasoning: "Cálculo matemático preventivo (IA indisponível)." 
    };
  }
}
