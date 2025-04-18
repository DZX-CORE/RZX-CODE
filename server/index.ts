/**
 * Ponto de entrada principal do servidor
 */

import express from "express";
import { registerRoutes } from "./routes";
import { log } from "./vite";
import * as path from "path";

// Checar disponibilidade da API do Anthropic e fazer setup
import { checkApiAvailability } from "./anthropic";

const main = async () => {
  // Criar e configurar o servidor Express
  const app = express();
  app.use(express.json({ limit: "50mb" }));
  
  try {
    // Verificar disponibilidade da API do Anthropic
    console.log("API Anthropic: Verificando disponibilidade...");
    await checkApiAvailability();
    
    // Registrar rotas da API
    const httpServer = await registerRoutes(app);
    
    // Definir porta do servidor
    const PORT = process.env.PORT || 5000;
    
    // Iniciar o servidor HTTP
    httpServer.listen(PORT, () => {
      log(`serving on port ${PORT}`);
    });
    
  } catch (err: any) {
    console.error("Erro ao inicializar o servidor:", err);
    process.exit(1);
  }
};

// Tratamento de erros para exceções não capturadas
process.on("uncaughtException", (err) => {
  console.error("Exceção não capturada:", err);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Promessa rejeitada não tratada:", reason);
});

// Iniciar o servidor
main().catch((err) => {
  console.error("Erro no processo principal:", err);
  process.exit(1);
});
