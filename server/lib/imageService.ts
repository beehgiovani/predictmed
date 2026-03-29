import axios from 'axios';
import { supabase } from './supabase';

/**
 * Serviço para enriquecimento de dados de produtos via APIs externas.
 */
export const imageService = {
  /**
   * Busca a imagem de um produto pelo EAN e salva a URL no banco de dados.
   * Utiliza um cache para evitar chamadas excessivas.
   */
  async syncProductImage(productCode: string, ean: string | null) {
    if (!ean || ean.length < 8) return null;

    try {
      // 1. Verificar se já temos a imagem salva
      const { data: product } = await supabase
        .from('products')
        .select('imageurl')
        .eq('code', productCode)
        .single();

      if (product?.imageurl) return product.imageurl;

      // 2. Tentar buscar na API externa
      const response = await axios.get(`https://api-produtos.seunegocionanuvem.com.br/api/${ean}`, {
        timeout: 5000
      });

      if (response.data && response.data.imagem_base64) {
        // Para não salvar base64 gigante no Postgres (pode pesar), 
        // idealmente salvaríamos num Storage, mas como o usuário sugeriu a API direta, 
        // vamos montar a URL de data se for pequena, ou salvar o link da API se disponível.
        
        // Verificamos o tamanho (heuristicamente)
        if (response.data.imagem_base64.length < 50) {
            // Imagem muito pequena/vazia -> Placeholder
            return '/placeholder.png';
        }

        const dataUrl = `data:${response.data.mime_type};base64,${response.data.imagem_base64}`;
        
        // 3. Atualizar no banco
        await supabase
          .from('products')
          .update({ 
            imageurl: dataUrl,
            lastimagesync: new Date().toISOString()
          })
          .eq('code', productCode);

        return dataUrl;
      }

      return '/placeholder.png';
    } catch (error) {
      console.error(`[ImageService] Erro ao sincronizar EAN ${ean}:`, error);
      return '/placeholder.png';
    }
  }
};
