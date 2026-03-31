import { supabase } from './supabase.ts';

/**
 * 🚀 PredictMed Image Engine - O Caçador de Fotos Premium (BLUESOFT)
 * --------------------------------------------------------------------------
 */

const BLUESOFT_TOKEN = 'AXpdxrCLfR-hMe4hN4iADQ';

export const imageService = {
  /**
   * Tenta as APIs gratuitas primeiro (Ilimitadas)
   */
  async fetchFreeSources(ean: string): Promise<string | null> {
    // --- OpenFoodFacts ---
    try {
      const offRes = await fetch(`https://world.openfoodfacts.org/api/v0/product/${ean}.json`);
      if (offRes.ok) {
        const data = await offRes.json();
        if (data.status === 1 && data.product?.image_url) return data.product.image_url;
      }
    } catch (e) {}

    // --- Mercado Livre ---
    try {
      const mlRes = await fetch(`https://api.mercadolibre.com/sites/MLB/search?q=${ean}`);
      if (mlRes.ok) {
        const data = await mlRes.json();
        if (data.results?.length > 0) {
          const url = data.results[0].thumbnail?.replace("-I.jpg", "-O.jpg") || data.results[0].thumbnail;
          if (url) return url;
        }
      }
    } catch (e) {}

    return null;
  },

  /**
   * Tenta a Bluesoft Cosmos (Limite 25/dia - A Elite)
   */
  async fetchBluesoft(ean: string): Promise<string | null> {
    try {
      const response = await fetch(`https://api.cosmos.bluesoft.com.br/gtins/${ean}.json`, {
        headers: {
          'User-Agent': 'Cosmos-API-Request',
          'X-Cosmos-Token': BLUESOFT_TOKEN,
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 429) {
        console.warn("[ImageEngine] Bluesoft atingiu o limite diário de 25.");
        return "LIMIT_EXCEEDED";
      }

      if (response.ok) {
        const data = await response.json();
        return data.thumbnail || null;
      }
    } catch (e) {
      console.error("[ImageEngine] Erro Bluesoft:", e);
    }
    return null;
  },

  /**
   * Lógica de Sincronização Inteligente
   */
  async findAndSync(code: string, ean: string): Promise<string | null | "LIMIT_EXCEEDED"> {
    // 1. Tenta fontes grátis (Não gasta o limite Bluesoft)
    let url = await this.fetchFreeSources(ean);
    
    // 2. Se não achou, gasta uma bala de prata da Bluesoft
    if (!url) {
      url = await this.fetchBluesoft(ean);
      if (url === "LIMIT_EXCEEDED") return "LIMIT_EXCEEDED";
    }

    if (url) {
      await supabase
        .from('products')
        .update({ 
          imageurl: url,
          lastimagesync: new Date().toISOString()
        })
        .eq('code', code);
      return url;
    }

    // Mesmo que não ache nada, marcamos como tentado hoje
    await supabase
      .from('products')
      .update({ lastimagesync: new Date().toISOString() })
      .eq('code', code);
      
    return null;
  }
};
