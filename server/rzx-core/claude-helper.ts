/**
 * Um helper simples para o cliente Claude
 */
import { Anthropic } from '@anthropic-ai/sdk';
import { log } from '../vite';

// Inicializar cliente Anthropic
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Nome do modelo usado
const MODEL_NAME = 'claude-3-7-sonnet-20250219';

/**
 * Simplificação para chamar o Claude com uma mensagem
 */
export async function askClaude(message: string): Promise<string> {
  try {
    log(`[CLAUDE-HELPER] Enviando mensagem: ${message.substring(0, 100)}${message.length > 100 ? '...' : ''}`);
    
    // Chamar API do Claude
    const result = await anthropic.messages.create({
      model: MODEL_NAME,
      max_tokens: 4000,
      messages: [
        {
          role: 'user',
          content: message
        }
      ]
    });
    
    // Extrair e retornar resposta
    const responseText = result.content[0].text;
    log(`[CLAUDE-HELPER] Resposta recebida (${responseText.length} caracteres)`);
    
    return responseText;
  } catch (error: any) {
    log(`[CLAUDE-HELPER] Erro ao processar mensagem: ${error.message}`);
    throw error;
  }
}
