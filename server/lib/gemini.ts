import { GoogleGenerativeAI } from "@google/generative-ai";
import { ENV } from "../_core/env.ts";

// Inicializa a IA do Google. Se não tiver a chave, o sistema vai pro cálculo matemático de segurança.
const genAI = new GoogleGenerativeAI(ENV.forgeApiKey || "");
const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

export interface AISuggestionInput {
  productName: string;
  productCode: string;
  targetDays: number;
  salesSummary: string; // Ex: "Vendeu 5 unidades nos últimos 10 dias"
  avgDailyTurnover: number;
  userAdjustmentFactor: number; // Factor de segurança (ex: 1.2 significa que o Bruno gosta de 20% a mais)
  lostSalesCount: number; // Quantas vezes o pessoal do balcão disse que faltou esse item
  isCurrentlyMissing: boolean;
}

// Essa é a função que "pergunta" pra IA qual a melhor quantidade pra comprar
export async function getSmartAISuggestion(input: AISuggestionInput) {
  const prompt = `
    Você é o Assistente de Compras do Bruno, funcionario de uma farmácia de alto giro chamada Drogaria santo Antonio.
    Seu objetivo é sugerir a quantidade ideal de compra para o produto "${input.productName}" (Cód: ${input.productCode}).
    
    ESTADO ATUAL DA PRATELEIRA:
    - O Bruno quer estoque para cobrir ${input.targetDays} dias.
    - O giro diário real (calculado) é de ${input.avgDailyTurnover.toFixed(2)} unidades por dia.
    - Resumo das vendas: ${input.salesSummary}.
    - O Bruno costuma ajustar nossas sugestões em ${((input.userAdjustmentFactor - 1) * 100).toFixed(0)}% (isso é a margem de segurança dele).
    - Venda Perdida: No balcão, os clientes já pediram esse item ${input.lostSalesCount} vezes enquanto não tínhamos.
    - Status: ${input.isCurrentlyMissing ? 'O item ACABOU. Precisamos repor urgente!' : 'Ainda tem, mas precisamos garantir o abastecimento.'}

    SUAS ORIENTAÇÕES:
    1. Se teve muita venda perdia (balcão > 2), capricha na sugestão pra não faltar de novo.
    2. Respeita o fator de ajuste do Bruno. Se ele gosta de estoque alto, sugira mais.
    3. Se o giro diário for baixo mas as pessoas estão pedindo no balcão, sugira pelo menos 1 ou 2 pra teste.
    4. Seja direto e prático, como um bom comprador de farmácia.

    RESPONDA APENAS EM JSON (SEM MARKDOWN):
    {
      "suggestedQuantity": numero,
      "reasoning": "Explicação curta pro Bruno (máximo 140 caracteres)"
    }
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Tira qualquer sujeira de markdown (tipo ```json) que a IA possa ter mandado
    const jsonStr = text.replace(/```json|```/g, "").trim();
    return JSON.parse(jsonStr) as { suggestedQuantity: number; reasoning: string };
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error("[IA Gemini] Deu um erro na sugestão:", error);
    }
    
    // Se a IA falhar (quota ou erro), a gente usa a matemática clássica de segurança
    const mathSuggestion = Math.ceil(input.avgDailyTurnover * input.targetDays * input.userAdjustmentFactor);
    return { 
      suggestedQuantity: mathSuggestion, 
      reasoning: "Usei o cálculo matemático padrão (IA temporariamente fora do ar)." 
    };
  }
}
