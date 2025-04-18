/**
 * Interface para a API do Anthropic Claude
 */

import { Request, Response } from "express";
import { Anthropic } from "@anthropic-ai/sdk";
import { log } from "./vite";

// Inicializar cliente Anthropic
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Nome do modelo atual
const MODEL_NAME = "claude-3-7-sonnet-20250219";

/**
 * Verifica se a API do Anthropic está disponível
 */
export async function checkApiAvailability() {
  try {
    console.log(`Chave da API do Anthropic configurada: ${process.env.ANTHROPIC_API_KEY ? "Sim ✓" : "Não ✗"}`);
    
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error("Chave da API do Anthropic não configurada");
    }
    
    // Fazer uma chamada simples para verificar se a API está disponível
    const result = await anthropic.messages.create({
      model: MODEL_NAME,
      max_tokens: 10,
      messages: [
        {
          role: "user",
          content: "Olá, apenas confirmando que você está funcionando."
        }
      ]
    });
    
    if (result && result.content && result.content.length > 0) {
      console.log("API Anthropic: Disponível e funcionando corretamente");
      console.log("API Anthropic: Pronta para uso");
      return true;
    } else {
      throw new Error("API Anthropic retornou uma resposta incompleta");
    }
  } catch (error: any) {
    console.error("API Anthropic: Erro ao verificar disponibilidade - ", error.message);
    throw new Error(`API Anthropic indisponível: ${error.message}`);
  }
}

/**
 * Endpoint para completions de texto com o Claude
 */
export async function textCompletion(req: Request, res: Response) {
  try {
    const { prompt, maxTokens = 1000, temperature = 0.7, systemPrompt } = req.body;
    
    if (!prompt) {
      return res.status(400).json({
        error: "O campo 'prompt' é obrigatório"
      });
    }
    
    const messageParams: any = {
      model: MODEL_NAME,
      max_tokens: maxTokens,
      temperature,
      messages: [
        {
          role: "user",
          content: prompt
        }
      ]
    };
    
    // Adicionar system prompt se fornecido
    if (systemPrompt) {
      messageParams.system = systemPrompt;
    }
    
    const result = await anthropic.messages.create(messageParams);
    
    return res.json({
      success: true,
      completion: result.content[0].text,
      model: MODEL_NAME,
      usage: {
        input_tokens: result.usage?.input_tokens,
        output_tokens: result.usage?.output_tokens
      }
    });
  } catch (error: any) {
    log(`Erro na API Anthropic (textCompletion): ${error.message}`);
    return res.status(500).json({
      error: "Erro ao processar a requisição",
      details: error.message
    });
  }
}

/**
 * Endpoint para completions multimodais com o Claude (texto+imagem)
 */
export async function multimodalCompletion(req: Request, res: Response) {
  try {
    const { 
      messages, 
      maxTokens = 1000, 
      temperature = 0.7, 
      systemPrompt 
    } = req.body;
    
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({
        error: "O campo 'messages' deve ser um array de mensagens"
      });
    }
    
    const messageParams: any = {
      model: MODEL_NAME,
      max_tokens: maxTokens,
      temperature,
      messages
    };
    
    // Adicionar system prompt se fornecido
    if (systemPrompt) {
      messageParams.system = systemPrompt;
    }
    
    const result = await anthropic.messages.create(messageParams);
    
    return res.json({
      success: true,
      completion: result.content[0].text,
      model: MODEL_NAME,
      usage: {
        input_tokens: result.usage?.input_tokens,
        output_tokens: result.usage?.output_tokens
      }
    });
  } catch (error: any) {
    log(`Erro na API Anthropic (multimodalCompletion): ${error.message}`);
    return res.status(500).json({
      error: "Erro ao processar a requisição multimodal",
      details: error.message
    });
  }
}

/**
 * Endpoint para análise de código
 */
export async function analyzeCode(req: Request, res: Response) {
  try {
    const { code, language, question } = req.body;
    
    if (!code) {
      return res.status(400).json({
        error: "O campo 'code' é obrigatório"
      });
    }
    
    // Construir prompt para análise de código
    const prompt = `Analise o seguinte código ${language || ''}:
\`\`\`
${code}
\`\`\`

${question || 'Faça uma análise detalhada deste código, explicando sua funcionalidade, possíveis melhorias e problemas potenciais.'}`;
    
    const result = await anthropic.messages.create({
      model: MODEL_NAME,
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content: prompt
        }
      ]
    });
    
    return res.json({
      success: true,
      analysis: result.content[0].text,
      model: MODEL_NAME
    });
  } catch (error: any) {
    log(`Erro na API Anthropic (analyzeCode): ${error.message}`);
    return res.status(500).json({
      error: "Erro ao analisar o código",
      details: error.message
    });
  }
}

/**
 * Endpoint para explicação de código
 */
export async function explainCode(req: Request, res: Response) {
  try {
    const { code, language, level = 'intermediate' } = req.body;
    
    if (!code) {
      return res.status(400).json({
        error: "O campo 'code' é obrigatório"
      });
    }
    
    // Construir prompt para explicação de código
    const prompt = `Explique o seguinte código ${language || ''} para um programador de nível ${level}:
\`\`\`
${code}
\`\`\`

Forneça uma explicação linha por linha, destacando os conceitos importantes e o fluxo de execução.`;
    
    const result = await anthropic.messages.create({
      model: MODEL_NAME,
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content: prompt
        }
      ]
    });
    
    return res.json({
      success: true,
      explanation: result.content[0].text,
      model: MODEL_NAME
    });
  } catch (error: any) {
    log(`Erro na API Anthropic (explainCode): ${error.message}`);
    return res.status(500).json({
      error: "Erro ao explicar o código",
      details: error.message
    });
  }
}

/**
 * Endpoint para análise de imagem
 */
export async function analyzeImage(req: Request, res: Response) {
  try {
    const { imageBase64, question } = req.body;
    
    if (!imageBase64) {
      return res.status(400).json({
        error: "O campo 'imageBase64' é obrigatório"
      });
    }
    
    // Detectar o tipo de imagem a partir do base64
    const mediaType = imageBase64.startsWith('/9j/') ? 'image/jpeg' : 
                     imageBase64.startsWith('iVBORw0') ? 'image/png' : 
                     imageBase64.startsWith('R0lGOD') ? 'image/gif' : 
                     imageBase64.startsWith('UklGR') ? 'image/webp' : 
                     'image/jpeg';
    
    // Construir mensagem multimodal
    const messages = [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: mediaType,
              data: imageBase64
            }
          },
          {
            type: "text",
            text: question || "Descreva detalhadamente esta imagem."
          }
        ]
      }
    ];
    
    const result = await anthropic.messages.create({
      model: MODEL_NAME,
      max_tokens: 1000,
      messages
    });
    
    return res.json({
      success: true,
      analysis: result.content[0].text,
      model: MODEL_NAME
    });
  } catch (error: any) {
    log(`Erro na API Anthropic (analyzeImage): ${error.message}`);
    return res.status(500).json({
      error: "Erro ao analisar a imagem",
      details: error.message
    });
  }
}
