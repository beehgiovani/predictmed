// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

/**
 * 🤖 PredictMed Daily Enrichment Worker
 * --------------------------------------------------------------------------
 * Esta função roda 1x por dia via CRON.
 * Ela busca 25 produtos sem imagem e tenta enriquecê-los usando o ImageEngine.
 */

// Importamos a lógica que já temos no servidor (usando caminhos relativos ao deploy da function)
import { imageService } from "../../../server/lib/imageService.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

Deno.serve(async (req) => {
  // Verificação de Segurança (Opcional, mas bom ter um Token de Cron)
  const authHeader = req.headers.get("Authorization");
  // if (authHeader !== `Bearer ${Deno.env.get("CRON_SECRET")}`) {
  //   return new Response("Unauthorized", { status: 401 });
  // }

  console.log("[DailyEnrichment] Iniciando varredura diária...");

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // 1. Buscar os 25 produtos "candidatos" (COM EAN, SEM IMAGEM, e que não foram tentados hoje)
  const today = new Date().toISOString().split('T')[0];
  const { data: candidates, error } = await supabase
    .from('products')
    .select('code, ean')
    .is('imageurl', null)
    .not('ean', 'is', null)
    .or(`lastimagesync.is.null,lastimagesync.lt.${today}`)
    .limit(25);

  if (error) {
    console.error("[DailyEnrichment] Erro ao buscar candidatos:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  if (!candidates || candidates.length === 0) {
    console.log("[DailyEnrichment] Nenhum produto pendente de imagem.");
    return new Response(JSON.stringify({ status: "done", message: "Catálogo 100% ok" }));
  }

  console.log(`[DailyEnrichment] Processando ${candidates.length} itens...`);

  let syncedCount = 0;
  let bluesoftLimitReached = false;

  for (const item of candidates) {
    if (bluesoftLimitReached) break;

    const result = await imageService.findAndSync(item.code, item.ean);
    
    if (result === "LIMIT_EXCEEDED") {
      bluesoftLimitReached = true;
      console.log("[DailyEnrichment] Limite diário do Bluesoft Cosmos atingido.");
    } else if (result) {
      syncedCount++;
    }
  }

  console.log(`[DailyEnrichment] Fim da tarefa. Sincronizados: ${syncedCount}`);

  return new Response(JSON.stringify({ 
    success: true, 
    synced: syncedCount,
    bluesoftLimitReached 
  }), {
    headers: { "Content-Type": "application/json" }
  });
});
