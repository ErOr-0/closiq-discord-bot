# Architecture

## Overview

`closiq-discord-agent` is intentionally organized as a modular monolith. The application deploys as a single backend service, but each business capability has its own module with a clean internal boundary. This keeps the project simple to run while still allowing future extraction into independent services if needed.

## Request and event flow

1. A Discord customer message is received by the `discordGateway` adapter.
2. The message is saved through the `messages` module into MongoDB.
3. The `agent` module receives the message text and asks the `knowledgebase` module for relevant context.
4. The `knowledgebase` module creates an embedding and searches Qdrant.
5. The `agent` module sends the customer message plus retrieved context to the AI provider.
6. If auto-reply is enabled, the Discord adapter replies to the customer and records the outbound message in MongoDB.
7. The React dashboard reads messages and knowledge documents through the Express API.

## Backend dependency direction

Presentation routes depend on application use cases. Application use cases depend on domain types and infrastructure adapters. Domain files do not import from infrastructure or presentation.

This keeps business logic testable and prevents external concerns like Discord, Qdrant, or MongoDB from leaking into the UI-facing route layer.

## Modules

### Messages

Responsible for inbound Discord customer messages and outbound agent replies. MongoDB is the source of truth for the dashboard inbox.

### Knowledgebase

Responsible for storing knowledge documents in MongoDB and syncing embeddings into Qdrant. If Qdrant is unavailable, the module falls back to MongoDB text search so local development can continue.

### Agent

Responsible for answer orchestration. It gathers knowledgebase matches and asks the AI provider to produce a concise customer response.

### Infrastructure

Contains adapters for systems outside the application boundary:

- MongoDB connection
- Qdrant client
- OpenAI provider
- Discord gateway

## Frontend

The React app has feature-oriented modules that mirror backend capabilities:

- `modules/messages` - Discord inbox and manual test message form
- `modules/knowledgebase` - document creation and search UI
- `shared/api` - API client
- `shared/layout` - shell/navigation
