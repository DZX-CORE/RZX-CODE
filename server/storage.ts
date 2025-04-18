/**
 * Sistema de armazenamento para o RZX-CODE
 * Implementação simplificada com armazenamento em memória
 */

export interface User {
  id: number;
  username: string;
  email: string;
  displayName?: string;
  createdAt: Date;
}

export interface InsertUser {
  username: string;
  email: string;
  displayName?: string;
}

export interface Project {
  id: string;
  name: string;
  ownerId: number;
  description?: string;
  type: string;
  createdAt: Date;
  updatedAt: Date;
  files: string[];
  path: string;
}

export interface InsertProject {
  name: string;
  ownerId: number;
  description?: string;
  type: string;
  files: string[];
  path: string;
}

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  getProject(id: string): Promise<Project | undefined>;
  getProjectsByOwnerId(ownerId: number): Promise<Project[]>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: string, updates: Partial<Project>): Promise<Project | undefined>;
  deleteProject(id: string): Promise<boolean>;
}

/**
 * Implementação de armazenamento em memória
 */
export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private projects: Map<string, Project>;
  private currentUserId: number;

  constructor() {
    this.users = new Map<number, User>();
    this.projects = new Map<string, Project>();
    this.currentUserId = 1;
    
    // Adicionar usuário de teste padrão
    this.createUser({
      username: 'admin',
      email: 'admin@rzx-code.com',
      displayName: 'Administrador'
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      user => user.username.toLowerCase() === username.toLowerCase()
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    
    const user: User = {
      ...insertUser,
      id,
      createdAt: new Date()
    };
    
    this.users.set(id, user);
    return user;
  }

  async getProject(id: string): Promise<Project | undefined> {
    return this.projects.get(id);
  }

  async getProjectsByOwnerId(ownerId: number): Promise<Project[]> {
    return Array.from(this.projects.values()).filter(
      project => project.ownerId === ownerId
    );
  }

  async createProject(insertProject: InsertProject): Promise<Project> {
    const id = `project-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date();
    
    const project: Project = {
      ...insertProject,
      id,
      createdAt: now,
      updatedAt: now
    };
    
    this.projects.set(id, project);
    return project;
  }

  async updateProject(id: string, updates: Partial<Project>): Promise<Project | undefined> {
    const project = this.projects.get(id);
    
    if (!project) return undefined;
    
    const updatedProject: Project = {
      ...project,
      ...updates,
      updatedAt: new Date()
    };
    
    this.projects.set(id, updatedProject);
    return updatedProject;
  }

  async deleteProject(id: string): Promise<boolean> {
    return this.projects.delete(id);
  }
}

// Exportar uma instância do armazenamento
export const storage = new MemStorage();
