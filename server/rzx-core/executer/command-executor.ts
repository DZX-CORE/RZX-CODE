/**
 * Executor de Comandos do RZX-CODE
 * Permite que a IA execute comandos reais no sistema
 */

import { log } from '../../vite';
import * as child_process from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as util from 'util';

// Promisify de funções do Node.js
const exec = util.promisify(child_process.exec);
const mkdir = util.promisify(fs.mkdir);
const writeFile = util.promisify(fs.writeFile);
const readFile = util.promisify(fs.readFile);

/**
 * Classe que expõe métodos para executar comandos no sistema
 */
export class CommandExecutor {
  /**
   * Executa um comando shell no sistema
   */
  static async executeCommand(command: string): Promise<any> {
    try {
      log(`[CommandExecutor] Executando comando: ${command}`);
      
      // Lista de comandos potencialmente perigosos
      const dangerousCommands = [
        'rm -rf', 'sudo', 'chmod', 'chown', '>', '>>', '|',
        'eval', 'exec', 'kill', 'reboot', 'shutdown'
      ];
      
      // Verificar se o comando contém operações potencialmente perigosas
      const isDangerous = dangerousCommands.some(cmd => command.includes(cmd));
      
      if (isDangerous) {
        return {
          success: false,
          error: 'Comando não permitido por razões de segurança'
        };
      }
      
      // Executar o comando com timeout de 10 segundos
      const { stdout, stderr } = await exec(command, { timeout: 10000 });
      
      return {
        success: true,
        stdout,
        stderr,
        message: 'Comando executado com sucesso'
      };
    } catch (error: any) {
      log(`[CommandExecutor] Erro ao executar comando: ${error.message}`);
      return {
        success: false,
        error: error.message,
        stderr: error.stderr
      };
    }
  }
  
  /**
   * Cria um arquivo com o conteúdo especificado
   */
  static async createFile(filePath: string, content: string): Promise<any> {
    try {
      log(`[CommandExecutor] Criando arquivo: ${filePath}`);
      
      // Normalizar o caminho para evitar acessos fora do diretório permitido
      const normalizedPath = path.normalize(filePath);
      
      // Validação de segurança para evitar escrita em locais sensíveis
      if (normalizedPath.startsWith('..') || normalizedPath.includes('../')) {
        return {
          success: false,
          error: 'Caminho de arquivo não autorizado'
        };
      }
      
      // Extrair o diretório e criar se não existir
      const dir = path.dirname(normalizedPath);
      if (!fs.existsSync(dir)) {
        await mkdir(dir, { recursive: true });
      }
      
      // Escrever no arquivo
      await writeFile(normalizedPath, content, 'utf-8');
      
      return {
        success: true,
        filePath: normalizedPath,
        message: `Arquivo criado com sucesso: ${normalizedPath}`
      };
    } catch (error: any) {
      log(`[CommandExecutor] Erro ao criar arquivo: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Lê o conteúdo de um arquivo
   */
  static async readFile(filePath: string): Promise<any> {
    try {
      log(`[CommandExecutor] Lendo arquivo: ${filePath}`);
      
      // Normalizar o caminho para evitar acessos fora do diretório permitido
      const normalizedPath = path.normalize(filePath);
      
      // Validação de segurança
      if (normalizedPath.startsWith('..') || normalizedPath.includes('../')) {
        return {
          success: false,
          error: 'Caminho de arquivo não autorizado'
        };
      }
      
      // Verificar se o arquivo existe
      if (!fs.existsSync(normalizedPath)) {
        return {
          success: false,
          error: `Arquivo não encontrado: ${normalizedPath}`
        };
      }
      
      // Ler o arquivo
      const content = await readFile(normalizedPath, 'utf-8');
      
      return {
        success: true,
        filePath: normalizedPath,
        content,
        message: `Arquivo lido com sucesso: ${normalizedPath}`
      };
    } catch (error: any) {
      log(`[CommandExecutor] Erro ao ler arquivo: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Cria um projeto completo com os arquivos especificados
   */
  static async createProject(
    name: string,
    type: string,
    files: Array<{path: string, content: string}>
  ): Promise<any> {
    try {
      log(`[CommandExecutor] Criando projeto: ${name} do tipo ${type}`);
      
      // Gerar um ID único para o projeto
      const projectId = `${name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;
      const projectPath = path.join(process.cwd(), 'projects', projectId);
      
      // Criar o diretório do projeto
      if (!fs.existsSync(projectPath)) {
        await mkdir(projectPath, { recursive: true });
      }
      
      // Criar todos os arquivos do projeto
      const createdFiles = [];
      for (const file of files) {
        if (!file.path) continue;
        
        const filePath = path.join(projectPath, file.path);
        const fileDir = path.dirname(filePath);
        
        if (!fs.existsSync(fileDir)) {
          await mkdir(fileDir, { recursive: true });
        }
        
        await writeFile(filePath, file.content || '', 'utf-8');
        createdFiles.push(filePath);
      }
      
      return {
        success: true,
        projectId,
        projectPath,
        projectType: type,
        projectName: name,
        createdFiles,
        message: `Projeto criado com sucesso: ${projectId}`
      };
    } catch (error: any) {
      log(`[CommandExecutor] Erro ao criar projeto: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Cria uma visualização de preview
   */
  static async createPreview(
    content: string,
    type: 'html' | 'markdown' | 'image' | 'json' = 'html'
  ): Promise<any> {
    try {
      log(`[CommandExecutor] Criando preview do tipo ${type}`);
      
      // Criar previews temporários
      const previewFilename = `preview_${Date.now()}.${type === 'html' ? 'html' : 'txt'}`;
      const tempDir = path.join(process.cwd(), 'temp_previews');
      
      if (!fs.existsSync(tempDir)) {
        await mkdir(tempDir, { recursive: true });
      }
      
      const previewPath = path.join(tempDir, previewFilename);
      await writeFile(previewPath, content, 'utf-8');
      
      return {
        success: true,
        previewUrl: `/previews/${previewFilename}`,
        previewPath,
        type,
        message: `Preview criado com sucesso: ${previewFilename}`
      };
    } catch (error: any) {
      log(`[CommandExecutor] Erro ao criar preview: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Exportar a classe para uso em outros módulos
export default CommandExecutor;
