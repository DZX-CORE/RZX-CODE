# RZX-CODE

Um ecossistema completo de apps com assistente de IA integrado. O sistema utiliza WebSockets para comunicação em tempo real via chat, com o Claude Sonnet 3.7 como "cérebro" do assistente.

## Características

- Chat em tempo real com assistente de IA (Claude 3.7 Sonnet)
- Geração de código e projetos via comandos
- Visualização de projetos em tempo real
- Sistema de savepoints para controle de estados
- Interface responsiva para todos os dispositivos

## Arquitetura

O sistema é composto por:

### Backend

- **server/rzx-core/claude-helper.ts**: Interface simplificada para o cliente Claude
- **server/rzx-core/direct-worker.ts**: Worker principal para processamento de mensagens
- **server/rzx-core/executer/command-executor.ts**: Executor de comandos (criar projetos, listar, etc.)

### Frontend

- Chat em React.js com interface responsiva
- Suporte a Firebase para comunicação em tempo real
- Ferramentas para visualização de projetos

## Comandos disponíveis

O assistente aceita os seguintes comandos:

- **/gerar-js [descrição]** - Gera um novo projeto JavaScript com base na descrição
- **/listar-projetos** - Lista todos os projetos disponíveis
- **/ajuda** - Mostra a mensagem de ajuda

## Instalação

1. Clone o repositório
2. Instale as dependências
3. Configure a variável de ambiente ANTHROPIC_API_KEY com sua chave da API do Anthropic
4. Inicie o servidor

## Licença

MIT
