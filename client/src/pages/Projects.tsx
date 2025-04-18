/**
 * Página de listagem de projetos
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { Project } from '../../../shared/types';

interface ProjectsPageProps {
  user: {
    uid: string;
    email: string;
    displayName?: string;
  };
}

const ProjectsPage: React.FC<ProjectsPageProps> = ({ user }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

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

  // Remover um projeto
  const handleDeleteProject = async (projectId: string) => {
    if (deleteConfirm !== projectId) {
      setDeleteConfirm(projectId);
      return;
    }
    
    try {
      setLoading(true);
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Remover o projeto da lista
        setProjects(projects.filter(p => p.id !== projectId));
      } else {
        setError(data.error || 'Erro ao remover projeto');
      }
    } catch (err) {
      setError('Erro ao comunicar com o servidor');
      console.error('Erro ao remover projeto:', err);
    } finally {
      setLoading(false);
      setDeleteConfirm(null);
    }
  };

  // Cancelar remoção
  const cancelDelete = () => {
    setDeleteConfirm(null);
  };

  return (
    <div className="projects-page">
      <header className="projects-header">
        <h1>Seus Projetos</h1>
        <Link href="/dashboard">
          <a className="back-button">Voltar ao Dashboard</a>
        </Link>
      </header>

      <main className="projects-container">
        {loading ? (
          <div className="loading">Carregando projetos...</div>
        ) : error ? (
          <div className="error-message">{error}</div>
        ) : projects.length === 0 ? (
          <div className="empty-projects">
            <p>Você ainda não possui projetos. Comece uma conversa com o RZX-CODE para criar seu primeiro projeto!</p>
            <Link href="/chat">
              <a className="start-button">Iniciar uma conversa</a>
            </Link>
          </div>
        ) : (
          <div className="projects-list">
            {projects.map((project) => (
              <div key={project.id} className="project-item">
                <div className="project-info">
                  <h2>{project.name}</h2>
                  <p className="project-type">Tipo: {project.type}</p>
                  <p className="project-files">Arquivos: {project.files.length}</p>
                  {project.createdAt && (
                    <p className="project-date">
                      Criado em: {new Date(project.createdAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
                
                <div className="project-actions">
                  <Link href={`/project/${project.id}/chat`}>
                    <a className="action-button">Chat do Projeto</a>
                  </Link>
                  
                  {deleteConfirm === project.id ? (
                    <div className="confirm-actions">
                      <button 
                        className="action-button delete-confirm"
                        onClick={() => handleDeleteProject(project.id)}
                      >
                        Confirmar
                      </button>
                      <button 
                        className="action-button cancel"
                        onClick={cancelDelete}
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <button 
                      className="action-button delete"
                      onClick={() => handleDeleteProject(project.id)}
                    >
                      Remover
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <footer className="projects-footer">
        <p>© 2025 RZX-CODE - Gerenciador de Projetos</p>
      </footer>
    </div>
  );
};

export default ProjectsPage;
