/**
 * Componente principal da aplicação RZX-CODE
 */

import React, { useState, useEffect } from 'react';
import { Route, Switch, useLocation } from 'wouter';
import ChatPage from './pages/Chat';
import ProjectsPage from './pages/Projects';
import DashboardPage from './pages/Dashboard';
import { auth } from './lib/firebase-init';

const App: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [location, navigate] = useLocation();
  const [user, setUser] = useState<any>(null);

  // Verificar autenticação e redirecionar se necessário
  useEffect(() => {
    // Verificar se há um usuário armazenado no localStorage (modo offline)
    const storedUser = localStorage.getItem('offlineUser');
    if (storedUser) {
      console.log('AuthProvider: Usuário armazenado = sim');
      setUser(JSON.parse(storedUser));
      setLoading(false);
      return;
    }

    // Se o Firebase Auth estiver disponível, escutar por mudanças de autenticação
    if (auth) {
      const unsubscribe = auth.onAuthStateChanged((authUser) => {
        if (authUser) {
          setUser(authUser);
          // Armazenar informações básicas do usuário no localStorage
          localStorage.setItem(
            'offlineUser',
            JSON.stringify({
              uid: authUser.uid,
              email: authUser.email,
              displayName: authUser.displayName,
            })
          );
        } else {
          setUser(null);
          localStorage.removeItem('offlineUser');
        }
        
        setLoading(false);
      });

      return () => unsubscribe();
    } else {
      // Modo offline
      console.log('AuthProvider: Inicializando, modo offline = true');
      
      // Criar um usuário fictício para modo offline
      const offlineUser = {
        uid: 'offline-user-' + Date.now(),
        email: 'offline@example.com',
        displayName: 'Usuário Offline',
      };
      
      setUser(offlineUser);
      localStorage.setItem('offlineUser', JSON.stringify(offlineUser));
      setLoading(false);
    }
  }, []);

  // Redirecionar baseado na autenticação
  useEffect(() => {
    console.log('App: verificando redirecionamento', { loading, location });
    
    if (!loading) {
      // Se o usuário estiver na raiz, redirecionar para o dashboard
      if (location === '/') {
        console.log('App: redirecionando da raiz para dashboard direto');
        navigate('/dashboard');
      }
      
      // Se o usuário não estiver autenticado e tentar acessar rotas protegidas
      else if (!user && (location === '/dashboard' || location === '/projects' || location === '/chat')) {
        navigate('/login');
      }
    }
  }, [loading, user, location, navigate]);

  if (loading) {
    return <div className="loading-screen">Carregando...</div>;
  }

  return (
    <div className="app-container">
      <Switch>
        <Route path="/dashboard" component={() => <DashboardPage user={user} />} />
        <Route path="/projects" component={() => <ProjectsPage user={user} />} />
        <Route path="/chat" component={() => <ChatPage userId={user?.uid} />} />
        <Route path="/project/:id/chat">
          {(params) => <ChatPage userId={user?.uid} projectId={params.id} />}
        </Route>
        <Route>
          <div className="not-found">
            <h1>Página não encontrada</h1>
            <button onClick={() => navigate('/dashboard')}>Voltar para o Dashboard</button>
          </div>
        </Route>
      </Switch>
    </div>
  );
};

export default App;
