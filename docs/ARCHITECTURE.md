# Architecture

## Overview

`closiq-discord-agent` is intentionally organized as a modular monolith. The application deploys as a single backend service, but each business capability has its own module with a clean internal boundary. This keeps the project simple to run while still allowing future extraction into independent services if needed.

## Request and event flow

1. A Discord customer message is received by the `discordGateway` adapter.
2. The message is saved through the `messages` module into MongoDB.
3. The `agent` module receives the message text and asks the `knowledgebase` module for relevant context.
4. The `knowledgebase` module creates an embedding and searches Qdrant.
5. The `agent` module sends the customer message plus retrieved context to the LangChain runtime.
6. If auto-reply is enabled, the Discord adapter replies to the customer and records the outbound message in MongoDB.
7. The React dashboard reads messages and knowledge documents through the Express API.

## Backend Dependency Direction

Routes depend on controllers. Controllers depend on services. Services depend on module types, other modules' services, models, and app-wide integrations.

This keeps business logic testable and prevents external concerns like Discord, Qdrant, or MongoDB from leaking into the UI-facing route layer.

Each backend feature module follows the same internal folder convention:

- `routes` contains Express path and middleware wiring.
- `controllers` contains request validation and HTTP response handling.
- `services` contains executable business workflows.
- `models` contains Mongoose schemas and persistence models.
- `types` contains TypeScript shapes, enums, and DTO-like contracts.
- `mappers` contains persistence-to-API mapping helpers.
- `middlewares` contains module-specific Express middleware.
- `integrations` contains app-wide external service clients. `utils` is reserved for small pure helpers.

## Modules

### Messages

Responsible for inbound Discord customer messages and outbound agent replies. MongoDB is the source of truth for the dashboard inbox.

### Knowledgebase

Responsible for storing knowledge documents in MongoDB and syncing embeddings into Qdrant. If Qdrant is unavailable, the module falls back to MongoDB text search so local development can continue.

### Agent

Responsible for answer orchestration. It gathers knowledgebase matches, loads conversation history from the messages module, and asks the LangChain runtime to produce a concise customer response.

Agent-specific runtime code is split by responsibility:

- `services/langchainAgent.service.ts` - LangChain chat model setup and tool-calling loop
- `tools/commandRegistry.ts` - executable tool registry
- `models` - command lookup table persistence model

### Integrations

Contains clients for systems outside the application boundary:

- MongoDB connection
- Qdrant client
- OpenAI embedding provider
- Discord gateway

## Frontend

The React app has feature-oriented modules that mirror backend capabilities:

- `modules/messages` - Discord inbox and manual test message form
- `modules/knowledgebase` - document creation and search UI
- `shared/api` - API client
- `shared/layout` - shell/navigation
