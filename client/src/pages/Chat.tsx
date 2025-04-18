/**
 * Página de chat do RZX-CODE
 */

import React, { useState, useEffect } from 'react';
import ChatInterface from '../components/ChatInterface';

interface ChatPageProps {
  userId?: string;
  projectId?: string;
}

const ChatPage: React.FC<ChatPageProps> = ({ userId: propUserId, projectId }) => {
  // Se não for fornecido um userId, busca no localStorage
  const [userId, setUserId] = useState<string>(
    propUserId || localStorage.getItem('userId') || `user-${Date.now()}`
  );

  // Salvar userId no localStorage se necessário
  useEffect(() => {
    if (!localStorage.getItem('userId')) {
      localStorage.setItem('userId', userId);
    }
  }, [userId]);

  return (
    <div className="chat-page">
      <header className="chat-header">
        <h1>RZX-CODE Chat</h1>
        {projectId && <div className="project-indicator">Projeto: {projectId}</div>}
      </header>

      <main className="chat-container">
        <ChatInterface 
          userId={userId}
          projectId={projectId}
          className="main-chat"
        />
      </main>

      <footer className="chat-footer">
        <p>© 2025 RZX-CODE - Sistema de comunicação por IA</p>
      </footer>
    </div>
  );
};

export default ChatPage;
