// @ts-nocheck
import { fetchRequestHandler } from "https://esm.sh/@trpc/server/adapters/fetch";
import { appRouter } from "../../../server/routers.ts";
import { createContext } from "../../../server/_core/context.ts";

console.log("PredictMed Edge Function starting...");

const allowedOrigins = [
  'https://predictmed.web.app',
  'https://predictmed-beehgiovani.web.app',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
];

const getCorsHeaders = (reqOrigin: string | null) => {
  const isAllowed = reqOrigin && (
    allowedOrigins.includes(reqOrigin) || 
    reqOrigin.startsWith('http://localhost') || 
    reqOrigin.startsWith('http://127.0.0.1')
  );

  return {
    'Access-Control-Allow-Origin': isAllowed ? reqOrigin : allowedOrigins[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, cookie, x-supabase-auth',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
  };
}

const trpcUrlPrefix = "/functions/v1/api/trpc";

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  console.log(`${req.method} ${url.pathname}`);

  // Resposta amigável para a raiz da função
  if (url.pathname === "/functions/v1/api" || url.pathname === "/functions/v1/api/") {
    return new Response(JSON.stringify({ 
      status: "PredictMed API Online", 
      version: "1.0.1",
      endpoint: "/trpc"
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  // Se o caminho não começar com o prefixo esperado, tenta ajustar dinamicamente
  let currentEndpoint = trpcUrlPrefix;
  if (!url.pathname.startsWith(trpcUrlPrefix) && url.pathname.includes("/trpc")) {
    currentEndpoint = url.pathname.split("/trpc")[0] + "/trpc";
  }

  // IMPORTANTE: O tRPC adapter precisa que o endpoint termine exatamente antes do nome da procedure.
  // Se a rota for .../trpc/cota.get, e o endpoint for .../trpc, o tRPC vê "/cota.get" (com barra).
  // Adicionar a barra no endpoint resolve o 404.
  if (!currentEndpoint.endsWith("/")) {
    currentEndpoint += "/";
  }

  // Trata preflight request do CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const res = await fetchRequestHandler({
      endpoint: currentEndpoint,
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
    const origin = req.headers.get('origin');
    const corsHeaders = getCorsHeaders(origin);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
