# Architecture

The Student Portal follows a simple, modular client-server architecture:

## Client
- **Framework**: React.js + Vite
- **Styling**: Tailwind CSS + shadcn/ui
- **State Management**: React state + Zustand (where required)

## Server
- **Framework**: Express + Node.js
- **Language**: TypeScript
- **Structure**: Modular pattern (controllers, services, routes, schemas per domain).

## External Services
- **Database**: PostgreSQL (via Supabase)
- **Authentication**: Supabase Auth
- **Storage**: Supabase Storage
- **AI**: Gemini API for analytics interpretation
