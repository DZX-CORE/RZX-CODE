/**
 * Arquivo para teste direto do RZX-CORE sem depender da aplicação web
 */

import { Request, Response } from 'express';
import { Express } from 'express';
import { log } from './vite';
import { askClaude } from './rzx-core/claude-helper';

export function setupRzxTestEndpoints(app: Express) {
  // Middleware para garantir respostas JSON
  const ensureJsonResponse = (_req: Request, res: Response, next: Function) => {
    res.setHeader('Content-Type', 'application/json');
    next();
  };

  // Endpoint para inicialização do RZX-TEST
  app.get('/api/rzx-test/init', ensureJsonResponse, (req: Request, res: Response) => {
    log('[RZX-TEST] Inicializando testes...');
    
    res.json({
      success: true,
      message: 'RZX-TEST inicializado com sucesso',
      timestamp: new Date().toISOString()
    });
  });

  // Endpoint para verificar status do RZX-TEST
  app.get('/api/rzx-test/status', ensureJsonResponse, (req: Request, res: Response) => {
    res.json({
      status: 'online',
      mode: 'test',
      version: '1.0.0',
      timestamp: new Date().toISOString()
    });
  });

  // Endpoint para enviar mensagem diretamente para o Claude
  app.post('/api/rzx-test/message', ensureJsonResponse, async (req: Request, res: Response) => {
    try {
      const { message } = req.body;
      
      if (!message) {
        return res.status(400).json({
          success: false,
          error: 'Mensagem não fornecida'
        });
      }
      
      log(`[RZX-TEST] Enviando mensagem para o Claude: ${message.substring(0, 50)}${message.length > 50 ? '...' : ''}`);
      
      // Enviar mensagem para o Claude
      const response = await askClaude(message);
      
      return res.json({
        success: true,
        response,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      log(`[RZX-TEST] Erro ao processar mensagem: ${error.message}`);
      
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // Endpoint para testar o curl
  app.get('/api/rzx-test/curl-test', ensureJsonResponse, (req: Request, res: Response) => {
    res.json({
      success: true,
      message: 'API disponível para testes com curl',
      endpoint: '/api/rzx-test/message (POST)',
      example: 'curl -X POST -H "Content-Type: application/json" -d \'{"message":"Qual é o seu nome?"}\' http://localhost:5000/api/rzx-test/message',
      timestamp: new Date().toISOString()
    });
  });

  log('[RZX-TEST] Endpoints de teste configurados com sucesso');
}
