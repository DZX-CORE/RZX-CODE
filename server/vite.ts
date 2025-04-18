/**
 * Configuração do Vite para desenvolvimento
 */

import { createServer as createViteServer } from "vite";
import express, { Express } from "express";
import { Server } from "http";
import path from "path";
import fs from "fs";

// Função para logging consistente
export function log(message: string, source = "express") {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`${timestamp} [${source}] ${message}`);
}

// Configurar o Vite para desenvolvimento
export async function setupVite(app: Express, server: Server) {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'custom'
  });

  app.use(vite.middlewares);

  log("Vite middleware configurado");
  
  return vite;
}

// Servir arquivos estáticos em produção
export function serveStatic(app: Express) {
  const clientDistPath = path.resolve(process.cwd(), "client/dist");
  
  if (fs.existsSync(clientDistPath)) {
    app.use(express.static(clientDistPath));
    
    app.get("*", (req, res) => {
      res.sendFile(path.join(clientDistPath, "index.html"));
    });
    
    log("Arquivos estáticos configurados para produção");
  } else {
    log("Diretório de distribuição não encontrado: " + clientDistPath, "warning");
  }
}
