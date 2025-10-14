# Wellio - AI Agent For Smarter Coaching

## Overview
Wellio is an AI-powered fitness & wellness coaching platform that helps professionals grow their coaching practice faster with client insights and streamlined client management. The MVP features a modern, clean interface built with React and Express.js.

## Tech Stack
- **Frontend**: React, TypeScript, Tailwind CSS, Shadcn UI
- **Backend**: Express.js, Node.js
- **Data Visualization**: Recharts
- **Storage**: In-memory (MemStorage)
- **State Management**: TanStack Query (React Query)
- **Routing**: Wouter

## Features

### Fully Functional Features:
1. **Dashboard**
   - Stats cards (Total Clients, Active Sessions, Success Rate, Revenue)
   - Client Progress Overview chart with interactive data visualization
   - Today's Schedule panel showing upcoming sessions
   - Recent Activities feed
   - AI Insights card with plateau alerts

2. **Client Management**
   - Add, edit, and delete clients
   - Search clients by name or email
   - Client cards with progress tracking
   - Detailed client forms with validation
   - Status management (Active, Inactive, Paused)

3. **Communication**
   - Real-time messaging interface
   - Client conversation list
   - Send and receive messages
   - Message history with timestamps
   - Search conversations

### Coming Soon Features (Locked):
- Progress Analytics
- Smart Scheduling
- Predictive Analytics

## Design System

### Colors
- **Primary**: Teal (#28A0AE / hsl(186 61% 42%))
- **Accent**: Lime Green (#E2F9AD / hsl(75 85% 90%))
- **Background**: Light gray (#F5F6F7)
- **Card**: White
- **Dark Mode**: Fully supported with adaptive colors

### Typography
- Font Family: Inter
- Headings: Bold weights (600-800)
- Body: Regular (400) and Medium (500)

### Components
- Built with Shadcn UI components
- Custom styling following design guidelines
- Hover and active states with elevation system
- Responsive design for all screen sizes

## Project Structure
```
client/
  src/
    components/
      app-sidebar.tsx - Navigation sidebar
      theme-toggle.tsx - Dark/light mode toggle
      ui/ - Shadcn UI components
    pages/
      dashboard.tsx - Main dashboard view
      clients.tsx - Client management
      communication.tsx - Messaging interface
    lib/
      queryClient.ts - React Query setup
    App.tsx - Main app with routing
    
server/
  routes.ts - API endpoints
  storage.ts - In-memory data storage
  
shared/
  schema.ts - Data models and types
```

## API Routes

### Clients
- `GET /api/clients` - Get all clients
- `POST /api/clients` - Create new client
- `PATCH /api/clients/:id` - Update client
- `DELETE /api/clients/:id` - Delete client

### Sessions
- `GET /api/sessions` - Get all sessions
- `POST /api/sessions` - Create new session

### Messages
- `GET /api/messages` - Get all messages
- `POST /api/messages` - Send new message

### Activities
- `GET /api/activities` - Get all activities
- `POST /api/activities` - Create new activity

## Data Models

### Client
- id, name, email, phone, status
- goalType, progressScore, joinedDate
- lastSession, notes

### Session
- id, clientId, clientName, sessionType
- date, startTime, endTime, status, notes

### Message
- id, clientId, clientName, content
- sender, timestamp, read

### Activity
- id, clientId, clientName
- activityType, description, timestamp, status

## Recent Changes
- Initial MVP implementation (October 2025)
- Complete dashboard with stats and charts
- Full CRUD for client management
- Real-time communication hub
- Dark mode support
- Responsive design for desktop and mobile

## Development Notes
- Using in-memory storage for MVP (no database required)
- All data is seeded with realistic sample data
- Chart data is currently static for demo purposes
- AI Insights are placeholder content
- Lock icons appear on coming soon features with tooltips
