/**
 * Dashboard principal do RZX-CODE
 */

import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { Project } from '../../../shared/types';

interface DashboardPageProps {
  user: {
    uid: string;
    email: string;
    displayName?: string;
  };
}

const DashboardPage: React.FC<DashboardPageProps> = ({ user }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [_, navigate] = useLocation();

  // Carregar projetos
  useEffect(() => {
    async function fetchProjects() {
      try {
        const response = await fetch('/api/projects');
        const data = await response.json();
        
        if (data.success) {
          setProjects(data.projects || []);
        } else {
          setError(data.error || 'Erro ao carregar projetos');
        }
      } catch (err) {
        setError('Erro ao comunicar com o servidor');
        console.error('Erro ao buscar projetos:', err);
      } finally {
        setLoading(false);
      }
    }
    
    fetchProjects();
  }, []);

  // Função para navegar para o chat
  const goToChat = () => {
    navigate('/chat');
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>RZX-CODE Dashboard</h1>
        <div className="user-info">
          <span>Olá, {user.displayName || user.email}</span>
        </div>
      </header>

      <main className="dashboard-content">
        <section className="quick-actions">
          <h2>Ações Rápidas</h2>
          <div className="action-buttons">
            <button className="action-button primary" onClick={goToChat}>
              Conversar com RZX-CODE
            </button>
            <Link href="/projects">
              <a className="action-button secondary">Ver Todos os Projetos</a>
            </Link>
          </div>
        </section>

        <section className="recent-projects">
          <h2>Projetos Recentes</h2>
          {loading ? (
            <div className="loading">Carregando projetos...</div>
          ) : error ? (
            <div className="error-message">{error}</div>
          ) : projects.length === 0 ? (
            <div className="empty-projects">
              <p>Você ainda não possui projetos. Comece uma conversa com o RZX-CODE para criar seu primeiro projeto!</p>
            </div>
          ) : (
            <div className="projects-grid">
              {projects.slice(0, 4).map((project) => (
                <div key={project.id} className="project-card">
                  <h3>{project.name}</h3>
                  <p>Tipo: {project.type}</p>
                  <p>Arquivos: {project.files.length}</p>
                  <div className="project-actions">
                    <Link href={`/project/${project.id}/chat`}>
                      <a className="project-action">Chat do Projeto</a>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
          {projects.length > 0 && (
            <Link href="/projects">
              <a className="view-all">Ver todos os projetos</a>
            </Link>
          )}
        </section>

        <section className="system-status">
          <h2>Status do Sistema</h2>
          <div className="status-indicator">
            <span className="status online">Online</span>
            <p>RZX-CODE está disponível e pronto para ajudar</p>
          </div>
        </section>
      </main>

      <footer className="dashboard-footer">
        <p>© 2025 RZX-CODE - Assistente de IA para Desenvolvimento</p>
      </footer>
    </div>
  );
};

export default DashboardPage;
