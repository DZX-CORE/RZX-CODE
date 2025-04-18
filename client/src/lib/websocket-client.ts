/**
 * Cliente WebSocket para comunicação em tempo real
 */

import { Message, WebSocketMessage } from "../../shared/types";

export class WebSocketClient {
  private socket: WebSocket | null = null;
  private userId: string;
  private reconnectInterval: number = 3000; // 3 segundos
  private maxReconnectAttempts: number = 5;
  private reconnectAttempts: number = 0;
  private handlers: {
    message?: (message: Message) => void;
    history?: (messages: Message[]) => void;
    error?: (error: any) => void;
    projectEvent?: (event: any) => void;
    connectionChange?: (isConnected: boolean) => void;
  } = {};

  constructor(userId: string) {
    this.userId = userId;
  }

  /**
   * Conecta ao servidor WebSocket
   */
  connect(): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      console.log("[WebSocket] Já conectado");
      return;
    }

    try {
      // Determinar o protocolo (ws ou wss) com base no protocolo da página
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      // Construir a URL do WebSocket
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      console.log(`[WebSocket] Conectando a ${wsUrl}`);
      
      // Criar nova conexão WebSocket
      this.socket = new WebSocket(wsUrl);
      
      // Configurar handlers
      this.socket.onopen = this.handleOpen.bind(this);
      this.socket.onmessage = this.handleMessage.bind(this);
      this.socket.onclose = this.handleClose.bind(this);
      this.socket.onerror = this.handleError.bind(this);
    } catch (error) {
      console.error("[WebSocket] Erro ao conectar:", error);
      this.scheduleReconnect();
    }
  }

  /**
   * Desconecta do servidor WebSocket
   */
  disconnect(): void {
    if (!this.socket) return;
    
    try {
      this.socket.close();
      this.socket = null;
      this.reconnectAttempts = 0;
      console.log("[WebSocket] Desconectado");
    } catch (error) {
      console.error("[WebSocket] Erro ao desconectar:", error);
    }
  }

  /**
   * Envia uma mensagem através do WebSocket
   */
  sendMessage(content: string): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.warn("[WebSocket] Não conectado. Tentando reconectar...");
      this.connect();
      setTimeout(() => this.sendMessage(content), 1000);
      return;
    }
    
    try {
      const message = {
        type: "message",
        content,
        timestamp: new Date().toISOString()
      };
      
      this.socket.send(JSON.stringify(message));
    } catch (error) {
      console.error("[WebSocket] Erro ao enviar mensagem:", error);
    }
  }

  /**
   * Notifica um evento de projeto
   */
  sendProjectEvent(eventType: string, projectId: string, metadata?: any): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.warn("[WebSocket] Não conectado para enviar evento. Tentando reconectar...");
      this.connect();
      setTimeout(() => this.sendProjectEvent(eventType, projectId, metadata), 1000);
      return;
    }
    
    try {
      const event = {
        type: "project_event",
        eventType,
        projectId,
        metadata,
        timestamp: new Date().toISOString()
      };
      
      this.socket.send(JSON.stringify(event));
    } catch (error) {
      console.error("[WebSocket] Erro ao enviar evento de projeto:", error);
    }
  }

  /**
   * Registra handlers para diferentes tipos de eventos
   */
  on(event: 'message' | 'history' | 'error' | 'projectEvent' | 'connectionChange', handler: Function): void {
    this.handlers[event] = handler as any;
  }

  /**
   * Remove um handler
   */
  off(event: 'message' | 'history' | 'error' | 'projectEvent' | 'connectionChange'): void {
    delete this.handlers[event];
  }

  /**
   * Handler para quando a conexão é aberta
   */
  private handleOpen(): void {
    console.log("[WebSocket] Conexão estabelecida");
    this.reconnectAttempts = 0;
    
    // Identificar o cliente
    if (this.socket) {
      this.socket.send(JSON.stringify({
        type: "identify",
        userId: this.userId
      }));
    }
    
    // Notificar alteração de estado
    if (this.handlers.connectionChange) {
      this.handlers.connectionChange(true);
    }
  }

  /**
   * Handler para mensagens recebidas
   */
  private handleMessage(event: MessageEvent): void {
    try {
      const data: WebSocketMessage = JSON.parse(event.data);
      
      switch (data.type) {
        case 'message':
          if (data.message && this.handlers.message) {
            this.handlers.message(data.message);
          }
          break;
          
        case 'history':
          if (data.messages && this.handlers.history) {
            this.handlers.history(data.messages);
          }
          break;
          
        case 'project_event':
          if (this.handlers.projectEvent) {
            this.handlers.projectEvent(data);
          }
          break;
          
        case 'error':
          if (this.handlers.error) {
            this.handlers.error(data.error);
          }
          console.error("[WebSocket] Erro recebido:", data.error);
          break;
          
        default:
          console.warn("[WebSocket] Tipo de mensagem desconhecido:", data.type);
      }
    } catch (error) {
      console.error("[WebSocket] Erro ao processar mensagem:", error);
    }
  }

  /**
   * Handler para quando a conexão é fechada
   */
  private handleClose(event: CloseEvent): void {
    console.log(`[WebSocket] Conexão fechada: ${event.code} ${event.reason}`);
    this.socket = null;
    
    // Notificar alteração de estado
    if (this.handlers.connectionChange) {
      this.handlers.connectionChange(false);
    }
    
    this.scheduleReconnect();
  }

  /**
   * Handler para erros
   */
  private handleError(event: Event): void {
    console.error("[WebSocket] Erro:", event);
    
    if (this.handlers.error) {
      this.handlers.error(event);
    }
  }

  /**
   * Agenda uma tentativa de reconexão
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log("[WebSocket] Número máximo de tentativas de reconexão atingido");
      return;
    }
    
    this.reconnectAttempts++;
    
    console.log(`[WebSocket] Tentando reconectar em ${this.reconnectInterval / 1000} segundos (tentativa ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    setTimeout(() => {
      this.connect();
    }, this.reconnectInterval);
  }

  /**
   * Verifica se o cliente está conectado
   */
  isConnected(): boolean {
    return !!this.socket && this.socket.readyState === WebSocket.OPEN;
  }
}

// Exportar uma função para criar um cliente WebSocket
export const createWebSocketClient = (userId: string): WebSocketClient => {
  return new WebSocketClient(userId);
};
