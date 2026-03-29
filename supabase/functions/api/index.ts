// @ts-nocheck
import { fetchRequestHandler } from "https://esm.sh/@trpc/server/adapters/fetch";
import { appRouter } from "../../../server/routers.ts";
import { createContext } from "../../../server/_core/context.ts";

console.log("PredictMed Edge Function starting...");

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, cookie',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Credentials': 'true',
}

const trpcUrlPrefix = "/functions/v1/api";

Deno.serve(async (req) => {
  // Trata preflight request do CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const res = await fetchRequestHandler({
      endpoint: trpcUrlPrefix,
      req,
      router: appRouter,
      createContext: (opts) => createContext({ req: opts.req, res: {} }),
      onError({ error }) {
        console.error(`[TRPC Error] ${error.message}`);
      },
    });

    // Adiciona headers de CORS na resposta do TRPC
    Object.entries(corsHeaders).forEach(([key, value]) => {
      res.headers.set(key, value);
    });

    return res;
  } catch (err) {
    console.error("Function Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
