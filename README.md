# Student Portal

A clean, modern, personal productivity and academic progress tracking web application for students.

## Tech Stack
- **Frontend**: Next.js 16 (App Router), TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Node.js, Express, TypeScript, Zod
- **Database/Auth/Storage**: Supabase (PostgreSQL)
- **AI Integration**: Gemini API

## Project Structure
```
student-portal/
├── client/          # Next.js frontend
├── server/          # Express TypeScript backend
├── docs/            # Project documentation
├── README.md        # This file
└── .gitignore
```

## Local Setup

### 1. Environment Variables
Copy `.env.example` to `.env` in both `client` and `server` directories and fill in the required keys.

- `client/.env.example` -> `client/.env.local`
- `server/.env.example` -> `server/.env`

### 2. Run the Backend
```bash
cd server
npm install
npm run dev
```
Runs on `http://localhost:5000`

### 3. Run the Frontend
```bash
cd client
npm install
npm run dev
```
Runs on `http://localhost:3000`

## Documentation
Please refer to the `docs/` folder for more detailed technical information:
- [Architecture](docs/architecture.md)
- [Database](docs/database.md)
- [API](docs/api.md)
- [Development Guidelines](docs/development.md)
