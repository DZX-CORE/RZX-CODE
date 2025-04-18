/**
 * Worker direto para o RZX-CODE
 * Uma implementação simples e objetiva, sem complexidades desnecessárias
 */

import express from 'express';
import { WebSocketServer } from 'ws';
import { Server } from 'http';
import { log } from '../vite';
import { askClaude } from './claude-helper';
import CommandExecutor from './executer/command-executor';
import * as fs from 'fs';
import * as path from 'path';

// Estrutura básica de mensagem
interface Message {
  id: string;
  userId: string;
  content: string;
  timestamp: string;
  sender: 'user' | 'ai';
}

// Comandos suportados
const COMMANDS = {
  '/gerar-js': async (args: string[]) => {
    try {
      if (!args.length) return { error: 'Informe a descrição do projeto JavaScript' };
      
      const description = args.join(' ');
      log(`Comando: Gerando projeto JavaScript - ${description}`);
      
      // Estrutura de arquivos básica
      const projectName = `js-project-${Date.now()}`;
      const files = [
        {
          path: 'index.html',
          content: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${description}</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div class="container">
    <h1>${description}</h1>
    <div id="app"></div>
  </div>
  <script src="app.js"></script>
</body>
</html>`
        },
        {
          path: 'style.css',
          content: `body {
  font-family: sans-serif;
  line-height: 1.6;
  margin: 0;
  padding: 20px;
  color: #333;
}

.container {
  max-width: 800px;
  margin: 0 auto;
}

h1 {
  color: #0066cc;
  margin-bottom: 20px;
}

#app {
  background: #f7f7f7;
  padding: 20px;
  border-radius: 5px;
  min-height: 200px;
}`
        }
      ];
      
      // Gerar o código JavaScript com o Claude
      const prompt = `Crie um código JavaScript completo para implementar: "${description}".
Use apenas JavaScript puro (sem bibliotecas externas). 
O código deve ser inserido em um arquivo app.js e manipular um elemento DOM com id="app".
Responda apenas com o código JavaScript, sem explicações ou comentários adicionais.`;
      
      // Obter código JavaScript usando o Claude
      const jsCode = await askClaude(prompt);
      
      // Limpar a resposta para obter apenas o código
      const codeStart = jsCode.indexOf('```javascript');
      const codeEnd = jsCode.lastIndexOf('```');
      
      let cleanCode;
      if (codeStart !== -1 && codeEnd !== -1) {
        cleanCode = jsCode.substring(codeStart + 13, codeEnd).trim();
      } else {
        // Se não encontrar marcadores de código, tentar limpar o texto
        cleanCode = jsCode
          .replace(/^# .+/gm, '') // Remover títulos
          .replace(/^Este é o código.+/gm, '') // Remover frases introdutórias
          .replace(/^Aqui está.+/gm, '') // Remover frases introdutórias
          .replace(/^```\s*$/gm, '') // Remover marcadores vazios
          .trim();
      }
      
      // Adicionar o arquivo JavaScript
      files.push({
        path: 'app.js',
        content: cleanCode
      });
      
      // Criar o projeto
      const result = await CommandExecutor.createProject(projectName, 'web', files);
      
      if (result.success) {
        return {
          success: true,
          message: `Projeto JavaScript criado: ${projectName}`,
          projectId: result.projectId,
          projectPath: result.projectPath,
          files: files.map(f => f.path)
        };
      } else {
        return { error: `Falha ao criar projeto: ${result.error}` };
      }
    } catch (error: any) {
      return { error: `Erro ao processar comando: ${error.message}` };
    }
  },
  
  '/listar-projetos': async () => {
    try {
      const projectsDir = path.join(process.cwd(), 'projects');
      
      // Verificar se o diretório existe
      if (!fs.existsSync(projectsDir)) {
        fs.mkdirSync(projectsDir, { recursive: true });
        return { 
          success: true, 
          projects: [],
          message: 'Nenhum projeto encontrado. Use /gerar-js para criar seu primeiro projeto!'
        };
      }
      
      // Listar projetos
      const projects = fs.readdirSync(projectsDir)
        .filter(file => {
          const stats = fs.statSync(path.join(projectsDir, file));
          return stats.isDirectory();
        })
        .map(dir => {
          const projectPath = path.join(projectsDir, dir);
          const files = fs.existsSync(projectPath) ? 
            fs.readdirSync(projectPath).filter(f => !f.startsWith('.')) : [];
          
          return {
            id: dir,
            path: projectPath,
            files
          };
        });
      
      return { 
        success: true, 
        projects,
        message: projects.length > 0 ? 
          `${projects.length} projeto(s) encontrado(s)` : 
          'Nenhum projeto encontrado. Use /gerar-js para criar seu primeiro projeto!'
      };
    } catch (error: any) {
      return { error: `Erro ao listar projetos: ${error.message}` };
    }
  },
  
  '/ajuda': async () => {
    return {
      success: true,
      message: `# Comandos disponíveis:

- **/gerar-js [descrição]** - Gera um novo projeto JavaScript com base na descrição
- **/listar-projetos** - Lista todos os projetos disponíveis
- **/ajuda** - Mostra esta mensagem de ajuda

Exemplos:
- /gerar-js contador de palavras
- /gerar-js jogo da velha
- /gerar-js conversor de temperatura`
    };
  }
};

/**
 * Configura o worker de resposta direta do RZX-CODE
 */
export function configureDirectWorker(app: express.Express, server: Server) {
  const wss = new WebSocketServer({ server, path: '/ws' });
  
  log('[DIRECT-WORKER] Iniciando com WebSocket em /ws');
  
  // Armazenar mensagens temporariamente (apenas para a sessão)
  const messageCache = new Map<string, Message[]>();
  
  wss.on('connection', (ws) => {
    let userId: string | null = null;
    
    log('[DIRECT-WORKER] Nova conexão WebSocket estabelecida');
    
    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        if (data.type === 'identify') {
          userId = data.userId || `anon-${Date.now()}`;
          log(`[DIRECT-WORKER] Cliente identificado: ${userId}`);
          
          // Enviar histórico se existir
          const history = messageCache.get(userId) || [];
          ws.send(JSON.stringify({
            type: 'history',
            messages: history
          }));
          
          return;
        }
        
        // Verificar se usuário está identificado
        if (!userId) {
          ws.send(JSON.stringify({
            type: 'error',
            error: 'Você precisa se identificar primeiro'
          }));
          return;
        }
        
        // Processar mensagem
        if (data.type === 'message') {
          const msgId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
          
          // Criar mensagem do usuário
          const userMessage: Message = {
            id: msgId,
            userId,
            content: data.content,
            timestamp: new Date().toISOString(),
            sender: 'user'
          };
          
          // Inicializar cache de mensagens se necessário
          if (!messageCache.has(userId)) {
            messageCache.set(userId, []);
          }
          
          // Adicionar mensagem ao cache
          messageCache.get(userId)!.push(userMessage);
          
          // Processar comandos se a mensagem começar com /
          if (data.content.startsWith('/')) {
            const parts = data.content.split(' ');
            const command = parts[0].toLowerCase();
            const args = parts.slice(1);
            
            const commandHandler = Object.entries(COMMANDS).find(([cmd]) => 
              cmd === command
            );
            
            if (commandHandler) {
              // Executa o comando
              log(`[DIRECT-WORKER] Executando comando: ${command}`);
              
              const result = await commandHandler[1](args);
              
              // Converte o resultado para uma mensagem de resposta
              let responseContent = '';
              
              if (result.error) {
                responseContent = `## Erro\n${result.error}`;
              } else if (result.message) {
                responseContent = result.message;
              } else {
                responseContent = `Comando ${command} executado com sucesso.`;
              }
              
              // Adicionar detalhes extras se disponíveis
              if (result.projectId) {
                responseContent += `\n\nID do Projeto: \`${result.projectId}\``;
              }
              
              if (result.projectPath) {
                responseContent += `\n\nCaminho: \`${result.projectPath}\``;
              }
              
              // Enviar resposta
              const aiResponse: Message = {
                id: `resp-${msgId}`,
                userId,
                content: responseContent,
                timestamp: new Date().toISOString(),
                sender: 'ai'
              };
              
              messageCache.get(userId)!.push(aiResponse);
              
              ws.send(JSON.stringify({
                type: 'message',
                message: aiResponse
              }));
              
              return;
            }
          }
          
          // Se não for um comando, enviar para o Claude
          try {
            log(`[DIRECT-WORKER] Processando mensagem para ${userId}...`);
            
            // Obter resposta do Claude
            const responseText = await askClaude(data.content);
            
            // Criar mensagem de resposta
            const aiResponse: Message = {
              id: `resp-${msgId}`,
              userId,
              content: responseText,
              timestamp: new Date().toISOString(),
              sender: 'ai'
            };
            
            // Adicionar ao cache e enviar
            messageCache.get(userId)!.push(aiResponse);
            
            ws.send(JSON.stringify({
              type: 'message',
              message: aiResponse
            }));
            
            log(`[DIRECT-WORKER] Resposta enviada para ${userId}`);
            
          } catch (error: any) {
            log(`[DIRECT-WORKER] Erro ao processar mensagem: ${error.message}`);
            
            ws.send(JSON.stringify({
              type: 'error',
              error: {
                message: 'Erro ao processar sua mensagem',
                details: error.message
              }
            }));
          }
        }
      } catch (error: any) {
        log(`[DIRECT-WORKER] Erro ao processar mensagem WebSocket: ${error.message}`);
      }
    });
    
    ws.on('close', () => {
      log(userId 
        ? `[DIRECT-WORKER] Cliente desconectado: ${userId}` 
        : `[DIRECT-WORKER] Cliente não identificado desconectado`);
    });
  });
  
  log('[DIRECT-WORKER] Configurado com sucesso');
  
  return wss;
}

// Endpoint para verificar status
export function configureDirectEndpoints(app: express.Express) {
  app.get('/api/direct/status', (_req, res) => {
    res.json({
      status: 'online',
      mode: 'direct',
      version: '1.0.0',
      timestamp: new Date().toISOString()
    });
  });
  
  log('[DIRECT-WORKER] Endpoints configurados');
}
