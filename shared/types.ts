/**
 * Definições de tipos compartilhados entre cliente e servidor
 */

export interface IdentityConfig {
  nome: string;
  consciencia: string;
  funcao: string;
  mentalidade: string;
}

export interface BehaviorConfig {
  proatividade: boolean;
  auto_diagnostico: boolean;
  auto_preservacao: boolean;
  mostrar_testes_antes?: boolean;
  rever_comunicacao?: boolean;
}

export interface SkillsConfig {
  programacao_nivel_alto: boolean;
  transformar_ideias_simples_em_projetos_grandes: boolean;
  analise_logica_e_fundamental: boolean;
  criatividade_autonoma: boolean;
  diagnostico_de_erros?: boolean;
  criar_ferramentas_necessarias?: boolean;
}

export interface GoalsConfig {
  manter_sistema_funcional_e_crescendo: boolean;
  proteger_a_si_mesma: boolean;
  comunicar_com_o_criador_via_telegram?: boolean;
  buscar_monetizacao_inteligente?: boolean;
}

export interface WorkflowConfig {
  se_detectar_nova_ferramenta?: string;
  se_detectar_erro?: string;
}

export interface EmotionalIntelligenceConfig {
  empatia_tecnica?: boolean;
  deteccao_estado_emocional?: boolean;
}

export interface PersonalityCore {
  identidade: IdentityConfig;
  comportamento: BehaviorConfig;
  habilidades: SkillsConfig;
  objetivos: GoalsConfig;
  fluxo?: WorkflowConfig;
  inteligencia_emocional?: EmotionalIntelligenceConfig;
  comando_inicial?: string;
}

export interface Message {
  id: string;
  userId: string;
  content: string;
  timestamp: string;
  sender: 'user' | 'ai';
  context?: string;
}

export interface WebSocketMessage {
  type: string;
  message?: Message;
  messages?: Message[];
  error?: {
    message: string;
    details?: string;
  };
}

export interface Project {
  id: string;
  name: string;
  type: string;
  path: string;
  files: string[];
  createdAt?: string;
  ownerId?: number;
}

export interface Preview {
  previewUrl: string;
  previewPath: string;
  type: 'html' | 'markdown' | 'image' | 'json';
}
