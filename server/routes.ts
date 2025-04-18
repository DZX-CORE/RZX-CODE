import express, { type Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from 'ws';
import { log } from "./vite";
import { configureDirectWorker, configureDirectEndpoints } from "./rzx-core/direct-worker";
import { setupRzxTestEndpoints } from "./test-rzx";
import * as path from 'path';
import * as fs from 'fs';
import { configureRzxCore } from "./rzx-core/main";

// Armazenar conexões ativas dos clientes
const connectedClients = new Map<string, WebSocket>();
// Armazenar histórico de mensagens por usuário
const messageHistory = new Map<string, Array<{userId: string, content: string, timestamp: string, sender: 'user' | 'ai'}>>(); 

export async function registerRoutes(app: Express): Promise<Server> {
  // Pasta para previews temporários
  const tempPreviewsDir = path.join(process.cwd(), 'temp_previews');
  if (!fs.existsSync(tempPreviewsDir)) {
    fs.mkdirSync(tempPreviewsDir, { recursive: true });
  }
  
  // Pasta para projetos
  const projectsDir = path.join(process.cwd(), 'projects');
  if (!fs.existsSync(projectsDir)) {
    fs.mkdirSync(projectsDir, { recursive: true });
  }
  
  // Servir arquivos estáticos de preview
  app.use('/previews', express.static(tempPreviewsDir));
  
  // Servir arquivos estáticos de projetos
  app.use('/projects', express.static(projectsDir));
  
  // Rota para criar e obter um preview
  app.post('/api/previews', (req, res) => {
    try {
      const { content, type = 'html', filename } = req.body;
      
      if (!content) {
        return res.status(400).json({
          success: false,
          error: 'Conteúdo obrigatório'
        });
      }
      
      // Gerar um nome de arquivo único se não for fornecido
      const previewFilename = filename || `preview_${Date.now()}.${type === 'html' ? 'html' : 'txt'}`;
      const previewPath = path.join(tempPreviewsDir, previewFilename);
      
      // Salvar o conteúdo no arquivo
      fs.writeFileSync(previewPath, content, 'utf-8');
      
      return res.json({
        success: true,
        previewUrl: `/previews/${previewFilename}`,
        previewPath
      });
    } catch (error: any) {
      log('Erro ao criar preview:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });
  
  // Rota para status do servidor
  app.get("/api/status", (req, res) => {
    res.json({
      status: "online",
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    });
  });
  
  // Rota para listar projetos
  app.get("/api/projects", async (req, res) => {
    try {
      // Listar os diretórios na pasta projects
      const projects = fs.existsSync(projectsDir) 
        ? fs.readdirSync(projectsDir)
          .filter(dir => fs.statSync(path.join(projectsDir, dir)).isDirectory())
          .map(dir => {
            const projectPath = path.join(projectsDir, dir);
            const files = fs.readdirSync(projectPath)
              .filter(file => !file.startsWith('.'));
            return {
              id: dir,
              name: dir,
              path: projectPath,
              files
            };
          })
        : [];
      
      return res.json({
        success: true,
        projects
      });
    } catch (error: any) {
      log("Erro ao listar projetos:", error);
      return res.status(500).json({
        success: false,
        error: "Erro ao listar projetos",
        details: error.message
      });
    }
  });
  
  // Rota para remover um projeto
  app.delete("/api/projects/:id", async (req, res) => {
    try {
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({
          success: false,
          message: "ID do projeto não fornecido"
        });
      }
      
      const projectPath = path.join(projectsDir, id);
      
      // Verificar se o projeto existe
      if (!fs.existsSync(projectPath)) {
        return res.status(404).json({
          success: false,
          message: `Projeto '${id}' não encontrado`
        });
      }
      
      // Remover o diretório do projeto e todo seu conteúdo
      fs.rmSync(projectPath, { recursive: true, force: true });
      
      return res.json({
        success: true,
        message: `Projeto '${id}' removido com sucesso`
      });
    } catch (error: any) {
      log("Erro ao remover projeto:", error);
      return res.status(500).json({
        success: false,
        error: "Erro ao remover projeto",
        details: error.message
      });
    }
  });

  const httpServer = createServer(app);
  
  // Configurar o RZX-CODE
  configureRzxCore(app);
  
  // Configurar o worker direto (WebSocket)
  configureDirectWorker(app, httpServer);
  configureDirectEndpoints(app);
  
  // Configurar endpoints de teste do RZX
  setupRzxTestEndpoints(app);
  
  return httpServer;
}
