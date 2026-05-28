# Closiq Discord Agent

A full-stack modular monolith for a Discord-powered customer support inbox. Customers message your Discord channel, the backend stores messages in MongoDB, retrieves relevant knowledge from self-hosted Qdrant, and can automatically reply through a Discord bot using an AI provider.

## Stack

- Frontend: React + Vite
- Backend: Node.js + Express + TypeScript
- Database: MongoDB
- Vector database: Qdrant
- Object storage: MinIO
- Discord integration: `discord.js`
- AI provider: LangChain chat runtime with OpenRouter/OpenAI-compatible models; OpenAI SDK for embeddings

## Project layout

- `apps/api` - Express API, Discord gateway, MongoDB models, Qdrant/MinIO integration, AI orchestration
- `apps/web` - React dashboard for messages and knowledgebase management
- `docs` - architecture notes
- `docker-compose.yml` - local MongoDB, Qdrant, and MinIO services

## Backend module boundaries

The backend follows a modular monolith layout:

- `config` - environment and logging
- `integrations` - external service clients for MongoDB, Qdrant, MinIO, Discord, and AI
- `shared` - common middleware, errors, and utilities
- `modules/messages` - customer/agent message persistence and inbox API
- `modules/knowledgebase` - knowledge document ingestion, storage, and vector search
- `modules/agent` - AI answer orchestration
- `modules/health` - service health endpoint

Within feature modules, backend code uses these folders:

- `routes` - Express route definitions only
- `controllers` - request validation and HTTP response handling
- `services` - business workflows called by controllers, Discord, or other modules
- `models` - Mongoose schemas and persistence models
- `types` - TypeScript shapes, enums, and DTO-like contracts
- `mappers` - conversion from persistence records to API-facing data
- `middlewares` - module-specific Express middleware
- `integrations` - app-wide external service clients; `utils` is reserved for small pure helpers

## Getting started

1. Install dependencies:

   `npm install`

2. Create your environment file:

   `cp .env.example .env`

3. Start MongoDB, Qdrant, and MinIO:

   `docker compose up -d`

4. Start the API and web app together:

   `npm run dev`

5. Open the web app:

   `http://localhost:5173`

## Environment notes

- `MONGODB_URI` points the API at MongoDB.
- Qdrant can be configured with either `QDRANT_URL` or `QDRANT_HOST` + `QDRANT_PORT`.
- MinIO knowledge objects use `MINIO_ENDPOINT`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`, and `MINIO_BUCKET`.
- Knowledge uploads are stored under `knowledge-sets/YYYY/MM/DD/<documentId>/<filename>` in MinIO so they are easy to manage.
- `OPENROUTER_API_KEY` enables OpenRouter chat completions through the LangChain agent runtime. `OPENROUTER_BASE_URL` defaults to OpenRouter's API endpoint.
- `OPENAI_API_KEY` is optional. When present, it is used for embeddings and can also power the LangChain chat runtime. Without it, the backend uses deterministic development embeddings.
- `DISCORD_BOT_TOKEN` is optional. Without it, the API and dashboard still run, and you can use the manual inbound message form in the UI.
- Set `DISCORD_SUPPORT_CHANNEL_ID` if you only want the bot to respond in one Discord channel.
- Enable Discord Message Content Intent in the Discord developer portal for the bot to read customer messages.

## Useful commands

- `npm run dev` - run API and web concurrently
- `npm run dev:api` - run only the Express API
- `npm run dev:web` - run only the React app
- `npm run build` - build all workspaces
- `npm run typecheck` - typecheck all workspaces

## API endpoints

- `GET /api/health` - service health
- `GET /api/messages?limit=100` - list customer and agent messages
- `POST /api/messages/inbound` - create a manual inbound test message and generate a suggested reply
- `GET /api/knowledgebase?limit=100` - list knowledge documents
- `POST /api/knowledgebase` - create a knowledge document, upload it to MinIO, store metadata in MongoDB, and sync it to Qdrant. Supports JSON and multipart `file` uploads.
- `DELETE /api/knowledgebase/:id` - delete a knowledge set in order: MinIO object, Qdrant vector, then MongoDB record
- `POST /api/knowledgebase/search` - search Qdrant/MongoDB for relevant knowledge
- `POST /api/agent/answer` - generate an AI answer for a customer message
