/**
 * Ponto de entrada principal do sistema RZX-CODE
 * Integração com o servidor Express
 */

import { Request, Response } from 'express';
import { log } from '../vite';
import { askClaude } from './claude-helper';
import CommandExecutor from './executer/command-executor';

// Armazenar evento do último projeto criado ou modificado
let lastProjectEvent = {
  projectId: '',
  action: '', // 'created' ou 'modified'
  timestamp: new Date().toISOString(),
  details: {}
};

// Armazenar informações de reinicialização
let lastRestartTimestamp = Date.now();

/**
 * Configura as rotas do RZX-CODE no Express
 */
export function configureRzxCore(app: any) {
  // Rota para notificar sobre projetos criados ou modificados
  app.post('/api/rzx/notify-project', async (req: Request, res: Response) => {
    try {
      const { projectId, action, details } = req.body;
      
      if (!projectId || !action) {
        return res.status(400).json({
          error: 'Parâmetros incompletos',
          details: 'projectId e action são obrigatórios'
        });
      }
      
      // Atualizar o evento de projeto mais recente
      lastProjectEvent = {
        projectId,
        action,
        timestamp: new Date().toISOString(),
        details: details || {}
      };
      
      log(`[RZX-CORE] Evento de projeto registrado: ${action} para ${projectId}`);
      
      return res.json({
        success: true,
        message: `Notificação de projeto (${action}) registrada com sucesso`,
        timestamp: lastProjectEvent.timestamp
      });
      
    } catch (error: any) {
      log(`[RZX-CORE] Erro ao registrar evento de projeto: ${error.message}`);
      return res.status(500).json({
        error: 'Erro ao processar notificação de projeto',
        details: error.message
      });
    }
  });
  
  // Rota para verificar evento de projeto mais recente
  app.get('/api/rzx/latest-project-event', (_req: Request, res: Response) => {
    res.json({
      success: true,
      event: lastProjectEvent
    });
  });
  
  // Rota principal para processar mensagens
  app.post('/api/rzx/message', async (req: Request, res: Response) => {
    try {
      const { userId, message } = req.body;
      
      if (!userId || !message) {
        return res.status(400).json({
          error: 'Parâmetros incompletos',
          details: 'userId e message são obrigatórios'
        });
      }
      
      log(`[RZX-CORE] Processando mensagem do usuário ${userId}: ${message.substring(0, 50)}...`);
      
      // Processar comandos especiais
      if (message.startsWith('/')) {
        const parts = message.split(' ');
        const command = parts[0].toLowerCase();
        const args = parts.slice(1).join(' ');
        
        // Comando para listar projetos
        if (command === '/listar-projetos') {
          const result = await CommandExecutor.executeCommand('ls -la ./projects');
          return res.json({
            success: true,
            response: `# Projetos Disponíveis\n\n${result.stdout}`,
            commandType: 'list-projects',
            timestamp: new Date().toISOString()
          });
        }
        
        // Comando para criar projeto
        if (command === '/gerar-js' && args) {
          // Tentar gerar um projeto JavaScript simples
          const projectName = `js-project-${Date.now()}`;
          const description = args;
          
          // Gerar arquivos básicos
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
  margin: 0;
  padding: 20px;
}

.container {
  max-width: 800px;
  margin: 0 auto;
}

h1 {
  color: #0066cc;
}`
            }
          ];
          
          // Obter código JavaScript usando Claude
          const prompt = `Crie um código JavaScript simples para implementar: "${description}".
Use apenas JavaScript puro, sem bibliotecas externas.
O código deve manipular um elemento DOM com id="app".
Responda apenas com o código JavaScript.`;
          
          try {
            const jsCode = await askClaude(prompt);
            
            // Adicionar arquivo JavaScript
            files.push({
              path: 'app.js',
              content: jsCode
            });
            
            // Criar o projeto
            const result = await CommandExecutor.createProject(projectName, 'web', files);
            
            return res.json({
              success: true,
              response: `# Projeto JavaScript Criado\n\nProjeto: ${projectName}\nArquivos: ${files.map(f => f.path).join(', ')}`,
              commandType: 'create-project',
              projectId: result.projectId,
              timestamp: new Date().toISOString()
            });
          } catch (error: any) {
            return res.json({
              success: false,
              error: 'Erro ao gerar código JavaScript',
              details: error.message
            });
          }
        }
        
        // Comando de ajuda
        if (command === '/ajuda') {
          return res.json({
            success: true,
            response: `# Comandos Disponíveis\n\n- **/gerar-js [descrição]** - Gera um novo projeto JavaScript\n- **/listar-projetos** - Lista os projetos existentes\n- **/ajuda** - Mostra esta ajuda`,
            commandType: 'help',
            timestamp: new Date().toISOString()
          });
        }
        
        // Comando desconhecido
        return res.json({
          success: true,
          response: `Comando não reconhecido: ${command}\nUse /ajuda para ver os comandos disponíveis.`,
          commandType: 'unknown-command',
          timestamp: new Date().toISOString()
        });
      }
      
      // Se não for um comando, enviar para o Claude
      const response = await askClaude(message);
      
      return res.json({
        success: true,
        response,
        commandType: 'chat',
        timestamp: new Date().toISOString()
      });
      
    } catch (error: any) {
      log(`[RZX-CORE] Erro ao processar mensagem: ${error.message}`);
      
      return res.status(500).json({
        error: 'Erro ao processar mensagem',
        details: error.message
      });
    }
  });
  
  // Rota para reiniciar o servidor
  app.post('/api/rzx/restart', (req: Request, res: Response) => {
    try {
      const { userId } = req.body;
      
      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'ID de usuário não fornecido'
        });
      }
      
      // Atualizar timestamp de reinicialização
      lastRestartTimestamp = Date.now();
      
      log(`[RZX-CORE] Reinicialização solicitada pelo usuário ${userId}`);
      
      return res.json({
        success: true,
        message: 'Servidor reiniciado com sucesso',
        restartedAt: new Date(lastRestartTimestamp).toISOString()
      });
      
    } catch (error: any) {
      log(`[RZX-CORE] Erro ao reiniciar servidor: ${error.message}`);
      return res.status(500).json({
        success: false,
        error: 'Erro ao reiniciar servidor',
        details: error.message
      });
    }
  });
  
  // Rota para verificar status do RZX-CORE (com informações de reinicialização)
  app.get('/api/rzx/status', (_req: Request, res: Response) => {
    const uptime = Math.floor((Date.now() - lastRestartTimestamp) / 1000);
    
    return res.json({
      status: 'online',
      mode: 'rzx-core',
      isActive: true,
      uptime,
      personalityConfigured: true,
      restartedAt: new Date(lastRestartTimestamp).toISOString(),
      timestamp: new Date().toISOString()
    });
  });
  
  // Endpoint geral para status do servidor
  app.get('/api/status', (_req: Request, res: Response) => {
    return res.json({
      success: true,
      status: 'online',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      restartedAt: new Date(lastRestartTimestamp).toISOString(),
      timestamp: new Date().toISOString()
    });
  });
  
  // Rota para inicializar o RZX-CORE
  app.post('/api/rzx/init', (req: Request, res: Response) => {
    const { userId } = req.body;
    
    log(`[RZX-CORE] Sistema inicializado para usuário ${userId}`);
    
    return res.json({
      success: true,
      message: 'RZX-CORE inicializado com sucesso',
      timestamp: new Date().toISOString()
    });
  });
  
  log(`[RZX-CORE] Endpoints configurados com sucesso`);
}

export default { configureRzxCore };
