# Meu Líder

**Escalas de igreja sem planilha e sem grupo de WhatsApp bagunçado.**

O Meu Líder monta a escala de voluntários de cada equipe (som, mídia, recepção, louvor, infantil…), avisa cada pessoa no celular e deixa o líder resolver trocas e faltas em poucos toques. Funciona no Android (APK), no iPhone (PWA) e no navegador.

## Por que existe

Todo domingo alguém pergunta "quem está escalado hoje?". O Meu Líder responde isso e cuida do resto:

- o líder cria o evento e o app **sugere a escala** respeitando a disponibilidade de cada pessoa;
- cada voluntário **recebe aviso** quando é escalado e lembretes 24h, 12h e 1h antes;
- se não puder ir, **pede troca** direto no app;
- no fim do mês, o **relatório** mostra quem participou e quem faltou.

## O que o app faz

| Para quem | Recursos |
| --- | --- |
| **Voluntário** | Início com a próxima escala, minhas escalas, disponibilidade por data e por dia da semana, trocas entre membros (trocar o dia ou passar o turno), notificações, perfil e troca de senha |
| **Líder** | Equipes e funções, escala automática por evento, escala manual em cascata (equipe → função → pessoa), marcação de falta, convites por código curto, texto da escala pronto para o WhatsApp, relatório de participação |
| **Administrador** | Tudo acima em todas as equipes da igreja, eventos recorrentes e geração mensal automática |

### Destaques

- **Escala inteligente:** respeita disponibilidade, evita a mesma pessoa em dois lugares no mesmo horário e começa pelas funções mais difíceis de preencher.
- **Presença automática:** quem foi escalado conta como presente, a menos que o líder marque falta.
- **Várias equipes, vários líderes:** uma pessoa pode estar em mais de uma equipe, e cada líder só enxerga e escala a sua.
- **Convite simples:** o líder gera um código curto, manda pelo WhatsApp e a pessoa já entra na equipe certa ao criar a conta.
- **Esqueci a senha:** código de 6 dígitos por e-mail.
- **Compartilhar escala:** gera o texto formatado para colar no grupo.

## Tecnologias

| Camada | Stack |
| --- | --- |
| API | NestJS, TypeORM, PostgreSQL, JWT com refresh, tarefas agendadas (`@nestjs/schedule`) |
| App | Expo / React Native, expo-router, React Native Paper, Reanimated |
| Notificações | Caixa de entrada no app + push (Expo) |
| Hospedagem gratuita | Neon (banco), Render (API), Vercel (PWA), EAS Build (APK) |

## Rodando localmente

Pré-requisitos: Node 20+ e Docker.

```bash
# 1. banco (PostgreSQL na porta 55432)
docker-compose up -d

# 2. API
cd backend
cp .env.example .env          # ajuste os segredos
npm install
npm run start:dev             # http://localhost:3001

# 3. app
cd ../frontend
cp .env.example .env          # EXPO_PUBLIC_API_URL aponta para a API
npm install
npm run start:web             # ou: npm start (celular, com o IP do computador)
```

As tabelas são criadas sozinhas na primeira subida da API (migrations). Para criar a igreja e o primeiro administrador: `npm run db:seed` na pasta `backend`.

Modelo de dados e regras de negócio: [DOMAIN_MODEL.md](DOMAIN_MODEL.md).

## Testes

```bash
cd backend
npm test           # testes unitários
npm run test:e2e   # ponta a ponta (cria e apaga um banco de teste)
```

## Publicando

| Parte | Onde | Como |
| --- | --- | --- |
| Banco | Neon | `DB_SSL=true`, host sem `-pooler`, porta 5432 |
| API | Render | Docker, pasta `backend`, health check em `/health` |
| Site / PWA | Vercel | pasta `frontend`; o `vercel.json` já traz build e saída |
| APK | EAS Build | `cd frontend` e `npx eas-cli build -p android --profile preview` |

Variáveis importantes:

- **Render:** `DB_*`, `JWT_SECRET`, `REFRESH_TOKEN_SECRET`, `CORS_ORIGIN` (endereço do site, sem barra no final) e `APP_TIMEZONE`.
- **Vercel:** `EXPO_PUBLIC_API_URL` com o endereço da API.
- O APK usa o `EXPO_PUBLIC_API_URL` definido no `eas.json`.

Dica: o plano grátis do Render dorme após 15 minutos parado. Um monitor (UptimeRobot) chamando `/health` a cada 5 minutos evita a espera na primeira abertura.

### Instalando no celular

- **Android:** baixe o APK pelo link do EAS e permita a instalação de fontes desconhecidas.
- **iPhone:** abra o site no **Safari**, toque em **Compartilhar** e depois em **Adicionar à Tela de Início**.

## Estrutura

```
backend/    API NestJS (módulos: auth, igrejas, equipes, eventos, escalas, disponibilidade, convites, notificações…)
frontend/   App Expo (telas em src/app, componentes em src/components)
database/   scripts de apoio ao banco
```

Documentação de apoio: [DOMAIN_MODEL.md](DOMAIN_MODEL.md)

## Limites conhecidos

- Notificação push no Android depende de configurar o Firebase (FCM) no EAS.
- No iPhone (PWA) os avisos aparecem só dentro do app; push no iOS exigiria Web Push.
