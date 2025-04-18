/**
 * Command Executor - Implementação para executar comandos no RZX-CODE
 * 
 * Este módulo é responsável por executar comandos como criar projetos,
 * listar projetos, executar comandos no sistema, etc.
 */

import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { log } from '../../vite';

/**
 * CommandExecutor - Classe estática para executar comandos
 */
class CommandExecutor {
  /**
   * Cria um novo projeto
   */
  static async createProject(name: string, type: string, files: Array<{path: string, content: string}>) {
    try {
      // Validar nome do projeto
      if (!name || name.trim() === '') {
        return { 
          success: false, 
          error: 'Nome do projeto é obrigatório' 
        };
      }
      
      // Criar diretório base de projetos se não existir
      const projectsDir = path.join(process.cwd(), 'projects');
      if (!fs.existsSync(projectsDir)) {
        fs.mkdirSync(projectsDir, { recursive: true });
      }
      
      // Criar ID do projeto
      const projectId = `${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}`;
      
      // Criar diretório do projeto
      const projectPath = path.join(projectsDir, projectId);
      fs.mkdirSync(projectPath, { recursive: true });
      
      // Salvar arquivos
      for (const file of files) {
        // Verificar se o arquivo tem pastas no caminho
        const filePath = path.join(projectPath, file.path);
        const fileDir = path.dirname(filePath);
        
        // Criar diretórios se necessário
        if (!fs.existsSync(fileDir)) {
          fs.mkdirSync(fileDir, { recursive: true });
        }
        
        // Escrever conteúdo do arquivo
        fs.writeFileSync(filePath, file.content);
      }
      
      // Criar arquivo de metadados
      const metadata = {
        id: projectId,
        name,
        type,
        createdAt: new Date().toISOString(),
        files: files.map(f => f.path)
      };
      
      fs.writeFileSync(
        path.join(projectPath, '.metadata.json'),
        JSON.stringify(metadata, null, 2)
      );
      
      log(`[COMMAND-EXECUTOR] Projeto criado: ${projectId} (${files.length} arquivos)`);
      
      return {
        success: true,
        projectId,
        projectPath,
        message: `Projeto ${name} criado com sucesso`
      };
    } catch (error: any) {
      log(`[COMMAND-EXECUTOR] Erro ao criar projeto: ${error.message}`);
      return { 
        success: false, 
        error: `Erro ao criar projeto: ${error.message}` 
      };
    }
  }
  
  /**
   * Lista todos os projetos
   */
  static async listProjects() {
    try {
      const projectsDir = path.join(process.cwd(), 'projects');
      
      // Verificar se o diretório existe
      if (!fs.existsSync(projectsDir)) {
        fs.mkdirSync(projectsDir, { recursive: true });
        return [];
      }
      
      // Listar projetos
      const projects = fs.readdirSync(projectsDir)
        .filter(file => {
          const stats = fs.statSync(path.join(projectsDir, file));
          return stats.isDirectory();
        })
        .map(dir => {
          const projectPath = path.join(projectsDir, dir);
          const metadataPath = path.join(projectPath, '.metadata.json');
          
          let metadata: any = {
            id: dir,
            name: dir,
            type: 'unknown',
            createdAt: new Date().toISOString(),
            files: []
          };
          
          // Tentar ler metadados
          if (fs.existsSync(metadataPath)) {
            try {
              metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
            } catch (e) {
              // Ignorar erro, usar metadados padrão
            }
          }
          
          return metadata;
        });
      
      return projects;
    } catch (error: any) {
      log(`[COMMAND-EXECUTOR] Erro ao listar projetos: ${error.message}`);
      return [];
    }
  }
  
  /**
   * Cria uma prévia do projeto (para visualização)
   */
  static async createPreview(projectId: string) {
    try {
      const projectsDir = path.join(process.cwd(), 'projects');
      const projectPath = path.join(projectsDir, projectId);
      
      // Verificar se o projeto existe
      if (!fs.existsSync(projectPath)) {
        return { 
          success: false, 
          error: `Projeto ${projectId} não encontrado` 
        };
      }
      
      // Verificar se o projeto tem um arquivo index.html
      const indexPath = path.join(projectPath, 'index.html');
      if (!fs.existsSync(indexPath)) {
        return { 
          success: false, 
          error: 'Projeto não tem um arquivo index.html' 
        };
      }
      
      // Criar diretório de prévia
      const previewsDir = path.join(process.cwd(), 'temp_previews');
      if (!fs.existsSync(previewsDir)) {
        fs.mkdirSync(previewsDir, { recursive: true });
      }
      
      // Criar ID único para a prévia
      const previewId = `preview-${Date.now()}-${uuidv4().substring(0, 8)}`;
      const previewPath = path.join(previewsDir, previewId);
      
      // Copiar todos os arquivos do projeto para a prévia
      fs.mkdirSync(previewPath, { recursive: true });
      
      // Função recursiva para copiar diretórios
      const copyDir = (src: string, dest: string) => {
        const entries = fs.readdirSync(src, { withFileTypes: true });
        
        for (const entry of entries) {
          const srcPath = path.join(src, entry.name);
          const destPath = path.join(dest, entry.name);
          
          if (entry.isDirectory()) {
            fs.mkdirSync(destPath, { recursive: true });
            copyDir(srcPath, destPath);
          } else {
            fs.copyFileSync(srcPath, destPath);
          }
        }
      };
      
      copyDir(projectPath, previewPath);
      
      // Criar o URL de prévia
      const previewUrl = `/previews/${previewId}/`;
      
      log(`[COMMAND-EXECUTOR] Prévia criada: ${previewId} para o projeto ${projectId}`);
      
      return {
        success: true,
        previewId,
        previewUrl,
        previewPath,
        message: 'Prévia criada com sucesso'
      };
    } catch (error: any) {
      log(`[COMMAND-EXECUTOR] Erro ao criar prévia: ${error.message}`);
      return { 
        success: false, 
        error: `Erro ao criar prévia: ${error.message}` 
      };
    }
  }
}

export default CommandExecutor;
