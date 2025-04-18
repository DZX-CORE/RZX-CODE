/**
 * Interface de chat principal
 */

import React, { useState, useEffect, useRef } from 'react';
import { Message } from '../../../shared/types';
import { createWebSocketClient, WebSocketClient } from '../lib/websocket-client';
import { sendMessageToFirebase, listenForMessages } from '../lib/firebase-utils';

interface ChatInterfaceProps {
  userId: string;
  projectId?: string;
  initialMessages?: Message[];
  className?: string;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  userId,
  projectId,
  initialMessages = [],
  className = ''
}) => {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const wsClientRef = useRef<WebSocketClient | null>(null);

  // Inicializar WebSocket
  useEffect(() => {
    const wsClient = createWebSocketClient(userId);
    wsClientRef.current = wsClient;

    // Configurar handlers
    wsClient.on('message', (message: Message) => {
      setMessages(prev => [...prev, message]);
      setIsLoading(false);
    });

    wsClient.on('history', (history: Message[]) => {
      setMessages(history);
    });

    wsClient.on('error', (error: any) => {
      console.error('Erro no WebSocket:', error);
      setIsLoading(false);
    });

    wsClient.on('connectionChange', (connected: boolean) => {
      setIsConnected(connected);
    });

    // Conectar ao servidor
    wsClient.connect();

    // Cleanup
    return () => {
      if (wsClientRef.current) {
        wsClientRef.current.disconnect();
        wsClientRef.current = null;
      }
    };
  }, [userId]);

  // Escutar mensagens do Firebase, se disponível
  useEffect(() => {
    const unsubscribe = listenForMessages(userId, (fbMessages) => {
      if (fbMessages.length > 0) {
        setMessages(fbMessages);
      }
    }, projectId);

    return () => {
      unsubscribe();
    };
  }, [userId, projectId]);

  // Rolar para o final quando novas mensagens chegarem
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Enviar mensagem
  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    // Criar mensagem do usuário
    const userMessage: Message = {
      id: `local-${Date.now()}`,
      userId,
      content: inputValue,
      timestamp: new Date().toISOString(),
      sender: 'user',
    };

    // Atualizar estado local
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    // Tentar enviar via WebSocket
    if (wsClientRef.current && wsClientRef.current.isConnected()) {
      wsClientRef.current.sendMessage(inputValue);
    } else {
      // Fallback para Firebase se WebSocket não estiver disponível
      try {
        await sendMessageToFirebase(userId, inputValue, 'user', projectId);
        // Não precisamos fazer nada aqui, pois o Firebase enviará a resposta
        // através do listener que configuramos
      } catch (error) {
        console.error('Erro ao enviar mensagem:', error);
        setIsLoading(false);
      }
    }
  };

  // Formatar conteúdo da mensagem (suporte a markdown básico)
  const formatMessageContent = (content: string) => {
    // Converter links
    const linkPattern = /(https?:\/\/[^\s]+)/g;
    const withLinks = content.replace(linkPattern, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');

    // Converter quebras de linha
    const withLineBreaks = withLinks.replace(/\n/g, '<br />');

    return withLineBreaks;
  };

  return (
    <div className={`chat-interface ${className}`}>
      <div className="chat-status">
        {isConnected ? (
          <span className="status connected">Conectado</span>
        ) : (
          <span className="status disconnected">Desconectado</span>
        )}
      </div>

      <div className="chat-messages" ref={chatContainerRef}>
        {messages.length === 0 ? (
          <div className="empty-chat">
            <p>Envie uma mensagem para começar a conversa</p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`message ${message.sender === 'user' ? 'user-message' : 'ai-message'}`}
            >
              <div className="message-content">
                <div 
                  dangerouslySetInnerHTML={{ __html: formatMessageContent(message.content) }} 
                />
              </div>
              <div className="message-timestamp">
                {new Date(message.timestamp).toLocaleTimeString()}
              </div>
            </div>
          ))
        )}
        {isLoading && (
          <div className="message ai-message loading">
            <div className="message-content">
              <div className="loading-indicator">
                <span>.</span><span>.</span><span>.</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="chat-input">
        <textarea
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage();
            }
          }}
          placeholder="Digite sua mensagem..."
          disabled={isLoading}
        />
        <button
          onClick={handleSendMessage}
          disabled={isLoading || !inputValue.trim()}
        >
          Enviar
        </button>
      </div>
    </div>
  );
};

export default ChatInterface;
