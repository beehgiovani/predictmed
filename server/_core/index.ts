import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";

// Função pra ver se a porta tá livre pro servidor subir
function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

// Se a porta 3000 tiver ocupada, ele vai tentando as próximas (até 3020)
async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`Poxa, não achei nenhuma porta livre começando em ${startPort}!`);
}

// Configuração principal da nossa aplicação PredictMed
export const app = express();
const server = createServer(app);

// Limite de 50mb pros uploads (importante pros relatórios pesados)
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Rotas de login (OAuth)
registerOAuthRoutes(app);

// Nosso motor de API (tRPC)
app.use(
  "/api/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);

// No desenvolvimento a gente usa o Vite. Em produção, servimos os arquivos prontos (dist).
async function setupEnvironment() {
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    // Isso só roda se não estivermos no Firebase Functions (onde o Firebase serve o estático)
    if (!process.env.FUNCTIONS_EMULATOR && !process.env.FIREBASE_CONFIG) {
      serveStatic(app);
    }
  }
}

setupEnvironment().catch(console.error);

// Função que sobe o servidor local (só roda se chamarmos o arquivo diretamente)
async function startServer() {
  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Porta ${preferredPort} tava ocupada, usei a ${port} no lugar.`);
  }

  server.listen(port, () => {
    console.log(`PredictMed rodando liso em http://localhost:${port}/ 🚀`);
  });
}

// Só inicia o servidor se for execução direta (não importa como função do Firebase)
if (import.meta.url === `file://${process.argv[1]}` || process.env.TSX_WATCH) {
  startServer().catch(console.error);
}
