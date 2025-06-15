# Chat Application with AI Integration

## Overview

This is a full-stack chat application built with React, Express.js, and TypeScript. The application features a modern chat interface that allows users to interact with an AI assistant powered by Google Gemini AI. The system uses a monorepo structure with shared schema definitions and implements real-time messaging capabilities.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query (React Query) for server state management
- **UI Components**: Shadcn/ui component library with Radix UI primitives
- **Styling**: Tailwind CSS with custom CSS variables for theming
- **Build Tool**: Vite for development and production builds

### Backend Architecture
- **Runtime**: Node.js with Express.js server
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL with Drizzle ORM
- **Database Provider**: Neon Database (serverless PostgreSQL)
- **API Integration**: OpenAI-compatible client for Kluster AI
- **Session Management**: Basic memory storage (development setup)

### Monorepo Structure
```
├── client/          # React frontend application
├── server/          # Express.js backend server
├── shared/          # Shared TypeScript schemas and types
└── migrations/      # Database migration files
```

## Key Components

### Database Schema
- **Users Table**: Stores user authentication data (id, username, password)
- **Messages Table**: Stores chat messages with role-based categorization (user/assistant)
- **Schema Validation**: Zod schemas for runtime type validation

### API Endpoints
- `GET /api/messages` - Retrieve all chat messages
- `POST /api/messages` - Send new message and receive AI response
- `DELETE /api/messages` - Clear all messages (implemented in frontend)

### AI Integration
- **Provider**: Google Gemini AI with Gemini-1.5-Flash model
- **Context Awareness**: Maintains conversation history for contextual responses
- **Error Handling**: Graceful fallback for API failures

### UI Components
- **Chat Interface**: Real-time message display with user/assistant differentiation
- **Message Input**: Textarea with send functionality and keyboard shortcuts
- **Responsive Design**: Mobile-first approach with adaptive layouts
- **Loading States**: Visual feedback during AI response generation

## Data Flow

1. **User Input**: User types message in textarea and submits
2. **Frontend Validation**: Client validates message using Zod schema
3. **API Request**: POST request sent to `/api/messages` endpoint
4. **Message Storage**: User message saved to database
5. **AI Processing**: Server sends conversation history to Google Gemini AI
6. **AI Response**: Assistant response received and stored in database
7. **Frontend Update**: React Query invalidates cache and refetches messages
8. **UI Refresh**: New messages displayed in chat interface

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: Serverless PostgreSQL driver
- **drizzle-orm**: Type-safe SQL ORM with PostgreSQL dialect
- **@tanstack/react-query**: Server state management
- **@google/generative-ai**: Google Gemini AI client library
- **@radix-ui/***: Headless UI component primitives
- **tailwindcss**: Utility-first CSS framework

### Development Tools
- **tsx**: TypeScript execution for development
- **esbuild**: Fast bundler for production server build
- **drizzle-kit**: Database schema management and migrations

## Deployment Strategy

### Development Environment
- **Runtime**: Replit with Node.js 20, PostgreSQL 16
- **Development Server**: Vite dev server on port 5000
- **Hot Reload**: Automatic restart on file changes
- **Database**: Neon serverless PostgreSQL

### Production Build
1. **Frontend Build**: Vite builds React app to `dist/public`
2. **Backend Build**: esbuild bundles server to `dist/index.js`
3. **Database Migration**: Drizzle pushes schema changes
4. **Deployment**: Replit autoscale deployment target

### Environment Configuration
- **DATABASE_URL**: PostgreSQL connection string (required)
- **OPENAI_API_KEY**: Google Gemini AI service authentication
- **NODE_ENV**: Environment flag (development/production)

## Changelog
- June 15, 2025. Initial setup with Kluster AI integration
- June 15, 2025. Updated AI integration from Kluster AI to Google Gemini AI (Gemini-1.5-Flash model)

## User Preferences

Preferred communication style: Simple, everyday language.