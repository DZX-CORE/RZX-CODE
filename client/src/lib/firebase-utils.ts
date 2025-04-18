/**
 * Utilitários para trabalhar com o Firebase
 */

import { 
  ref, 
  onValue, 
  push, 
  set, 
  update, 
  remove, 
  query, 
  orderByChild,
  limitToLast,
  get,
  DatabaseReference,
  DataSnapshot
} from "firebase/database";
import { database } from "./firebase-init";
import { Message } from "../../shared/types";

// Verificar se o Firebase está disponível
const isFirebaseAvailable = !!database;

/**
 * Envia uma mensagem para o chat
 */
export const sendMessageToFirebase = async (
  userId: string,
  content: string,
  sender: 'user' | 'ai' = 'user',
  projectId?: string
): Promise<void> => {
  if (!isFirebaseAvailable) {
    console.log("[Firebase] Modo offline, simulando envio de mensagem");
    return Promise.resolve();
  }

  try {
    // Decidir qual caminho usar
    const basePath = projectId 
      ? `public_chats/projects/${projectId}/messages` 
      : `user_messages/${userId}`;

    const messagesRef = ref(database, basePath);
    const newMessageRef = push(messagesRef);
    
    const message: Omit<Message, 'id'> = {
      userId,
      content,
      timestamp: new Date().toISOString(),
      sender
    };
    
    await set(newMessageRef, message);
    console.log(`[Firebase] Mensagem enviada para ${basePath}`);
    
    return;
  } catch (error) {
    console.error("[Firebase] Erro ao enviar mensagem:", error);
    throw error;
  }
};

/**
 * Escuta mensagens do chat para um usuário ou projeto específico
 */
export const listenForMessages = (
  userId: string,
  callback: (messages: Message[]) => void,
  projectId?: string
): (() => void) => {
  if (!isFirebaseAvailable) {
    console.log("[Firebase] Modo offline, simulando escuta de mensagens");
    return () => {};
  }

  try {
    // Caminho para as mensagens
    const basePath = projectId 
      ? `public_chats/projects/${projectId}/messages` 
      : `user_messages/${userId}`;
    
    const messagesRef = ref(database, basePath);
    const messagesQuery = query(
      messagesRef,
      orderByChild('timestamp'),
      limitToLast(100) // Limitar a 100 mensagens mais recentes
    );
    
    // Escutar por mudanças
    const unsubscribe = onValue(messagesQuery, (snapshot) => {
      if (snapshot.exists()) {
        const messagesData: Message[] = [];
        
        snapshot.forEach((childSnapshot) => {
          messagesData.push({
            id: childSnapshot.key || '',
            ...childSnapshot.val()
          });
        });
        
        // Ordenar por timestamp
        messagesData.sort((a, b) => {
          return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
        });
        
        callback(messagesData);
      } else {
        callback([]);
      }
    });
    
    return unsubscribe;
  } catch (error) {
    console.error("[Firebase] Erro ao escutar mensagens:", error);
    return () => {};
  }
};

/**
 * Obtém as mensagens mais recentes sem escutar por mudanças
 */
export const getRecentMessages = async (
  userId: string,
  limit: number = 50,
  projectId?: string
): Promise<Message[]> => {
  if (!isFirebaseAvailable) {
    console.log("[Firebase] Modo offline, retornando mensagens vazias");
    return [];
  }

  try {
    // Caminho para as mensagens
    const basePath = projectId 
      ? `public_chats/projects/${projectId}/messages` 
      : `user_messages/${userId}`;
    
    const messagesRef = ref(database, basePath);
    const messagesQuery = query(
      messagesRef,
      orderByChild('timestamp'),
      limitToLast(limit)
    );
    
    const snapshot = await get(messagesQuery);
    
    if (snapshot.exists()) {
      const messagesData: Message[] = [];
      
      snapshot.forEach((childSnapshot) => {
        messagesData.push({
          id: childSnapshot.key || '',
          ...childSnapshot.val()
        });
      });
      
      // Ordenar por timestamp
      messagesData.sort((a, b) => {
        return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
      });
      
      return messagesData;
    } else {
      return [];
    }
  } catch (error) {
    console.error("[Firebase] Erro ao obter mensagens recentes:", error);
    return [];
  }
};

/**
 * Armazena dados de projeto no Firebase
 */
export const saveProjectData = async (
  projectId: string,
  projectData: any
): Promise<void> => {
  if (!isFirebaseAvailable) {
    console.log("[Firebase] Modo offline, simulando salvamento de projeto");
    return Promise.resolve();
  }

  try {
    const projectRef = ref(database, `projects/${projectId}`);
    await set(projectRef, {
      ...projectData,
      updatedAt: new Date().toISOString()
    });
    
    console.log(`[Firebase] Projeto salvo: ${projectId}`);
    return;
  } catch (error) {
    console.error("[Firebase] Erro ao salvar projeto:", error);
    throw error;
  }
};

/**
 * Notifica sobre um evento de projeto
 */
export const notifyProjectEvent = async (
  projectId: string,
  eventType: string,
  metadata: any = {}
): Promise<void> => {
  if (!isFirebaseAvailable) {
    console.log("[Firebase] Modo offline, simulando notificação de evento");
    return Promise.resolve();
  }

  try {
    const eventsRef = ref(database, `project_events/${projectId}`);
    const newEventRef = push(eventsRef);
    
    await set(newEventRef, {
      projectId,
      eventType,
      metadata,
      timestamp: new Date().toISOString()
    });
    
    console.log(`[Firebase] Evento notificado: ${eventType} para ${projectId}`);
    return;
  } catch (error) {
    console.error("[Firebase] Erro ao notificar evento:", error);
    throw error;
  }
};
