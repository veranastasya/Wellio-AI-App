# Wellio - AI Agent For Smarter Coaching

## Overview
Wellio is an AI-powered fitness & wellness coaching platform MVP that helps professionals manage their coaching practice with client insights and streamlined workflows. Built with React and Express.js, featuring a modern dashboard interface with teal (#28A0AE) and lime (#E2F9AD) brand colors.

## Tech Stack
- **Frontend**: React, TypeScript, Tailwind CSS, Shadcn UI, Wouter
- **Backend**: Express.js, Node.js
- **Data Visualization**: Recharts
- **Storage**: In-memory (MemStorage)
- **State Management**: TanStack Query v5
- **Form Handling**: React Hook Form with Zod validation

## Features

### Fully Functional Features:
1. **Dashboard**
   - Real-time stats cards: Total Clients, Active Sessions, Success Rate, Avg Progress
   - Client Progress Distribution chart (quartile-based performance visualization)
   - Today's Schedule (filtered by local date, chronologically sorted)
   - Recent Activity feed (last 3 activities)
   - AI Insights card (dynamic insights from client data)

2. **Client Management**
   - Full CRUD operations (Create, Read, Update, Delete)
   - Search clients by name or email
   - Client cards with progress tracking (0-100 scale)
   - Form validation with error feedback
   - Status management (Active, Inactive, Paused)
   - Goal types: Weight Loss, Muscle Gain, Endurance, Flexibility, General Wellness

3. **Communication**
   - Real-time messaging interface
   - Client conversation list with unread badges
   - Send messages with validation
   - Message history with timestamps
   - Error handling and loading states

### Coming Soon Features (Locked with Tooltips):
- Progress Analytics
- Smart Scheduling
- Predictive Analytics

## Design System

### Colors
- **Primary (Teal)**: #28A0AE / hsl(186 61% 42%)
- **Accent (Lime)**: #E2F9AD / hsl(75 85% 80%)
- **Background**: hsl(210 40% 98%) light / hsl(222.2 84% 4.9%) dark
- **Card**: hsl(0 0% 100%) light / hsl(217 33% 17%) dark
- **Dark Mode**: Fully supported with adaptive tokens

### Typography
- Font Family: Inter (system fallback)
- Headings: Bold weights (600-800)
- Body: Regular (400) and Medium (500)

### Interaction System
- `hover-elevate` - Subtle background elevation on hover
- `active-elevate-2` - Dramatic elevation on press
- All Button/Badge components use built-in elevation states

### Components
- Built with Shadcn UI primitives
- Sidebar navigation with collapsible support
- Custom styled cards, buttons, badges
- Responsive design for all viewports

## Project Structure
```
client/
  src/
    components/
      app-sidebar.tsx - Navigation sidebar with locked items
      theme-toggle.tsx - Dark/light mode toggle
      ui/ - Shadcn UI components (Button, Card, Dialog, etc.)
    pages/
      dashboard.tsx - Main dashboard with stats and charts
      clients.tsx - Client management with CRUD
      communication.tsx - Messaging interface
    lib/
      queryClient.ts - TanStack Query setup with apiRequest helper
    App.tsx - Main app with SidebarProvider and routing
    
server/
  routes.ts - API endpoints with validation
  storage.ts - In-memory storage (IStorage interface + MemStorage)
  
shared/
  schema.ts - Drizzle schemas, Zod validation, TypeScript types

design_guidelines.md - Design system documentation
```

## API Routes

### Clients
- `GET /api/clients` - Get all clients
- `POST /api/clients` - Create new client (validated with insertClientSchema)
- `PATCH /api/clients/:id` - Update client
- `DELETE /api/clients/:id` - Delete client

### Sessions
- `GET /api/sessions` - Get all sessions
- `POST /api/sessions` - Create new session

### Messages
- `GET /api/messages` - Get all messages
- `POST /api/messages` - Send new message (validated with insertMessageSchema)

### Activities
- `GET /api/activities` - Get all activities
- `POST /api/activities` - Create new activity

## Data Models

### Client
```typescript
{
  id: number (auto-increment)
  name: string
  email: string
  phone?: string
  status: "active" | "inactive" | "paused"
  goalType: "weight_loss" | "muscle_gain" | "endurance" | "flexibility" | "general_wellness"
  progressScore: number (0-100)
  joinedDate: string (YYYY-MM-DD)
  lastSession?: string (YYYY-MM-DD)
  notes?: string
}
```

### Session
```typescript
{
  id: number (auto-increment)
  clientId: number
  clientName: string
  sessionType: "training" | "consultation" | "follow_up" | "assessment"
  date: string (YYYY-MM-DD)
  startTime: string (e.g., "9:00 AM")
  endTime: string (e.g., "10:00 AM")
  status: "scheduled" | "completed" | "cancelled"
  notes?: string
}
```

### Message
```typescript
{
  id: number (auto-increment)
  clientId: number
  clientName: string
  content: string
  sender: "coach" | "client"
  timestamp: string (ISO 8601)
  read: boolean
}
```

### Activity
```typescript
{
  id: number (auto-increment)
  clientId?: number
  clientName?: string
  activityType: "session" | "message" | "progress" | "milestone" | "goal"
  description: string
  timestamp: string (ISO 8601)
  status?: "completed" | "pending" | "cancelled"
}
```

## Data Accuracy & Production Readiness

### 100% Authentic Backend Data
All dashboard stats are calculated from real API data:
- **Total Clients**: Direct count from `/api/clients`
- **Active Sessions**: Count of sessions with `status === "scheduled"`
- **Success Rate**: `completedSessions / (completedSessions + activeSessions) * 100`
- **Avg Progress**: Average of all client `progressScore` values
- **Today's Schedule**: Filters sessions by local date (`toLocaleDateString('en-CA')`) and sorts chronologically
- **Chart Data**: Quartile averages computed from actual client progress scores
- **AI Insights**: Dynamic insights based on client plateau detection and progress analysis

### No Mock/Synthetic Data
- Removed all hardcoded percentages and fake metrics
- No fabricated trends or synthetic multipliers
- Every displayed value has a real data source from backend APIs

### UX Quality
- Loading skeletons on all query-dependent pages
- Error states with user-friendly messages
- Form validation with visible feedback (toast notifications)
- All buttons functional with proper states (loading, disabled, success)
- No dead UI - every interaction works as expected

## Recent Changes (October 2025)
- ✅ Complete MVP implementation with teal/lime color scheme
- ✅ Dashboard with 100% accurate real-time analytics
- ✅ Full CRUD client management with validation
- ✅ Real-time communication hub with error handling
- ✅ Dark mode support with proper token system
- ✅ Responsive Shadcn sidebar navigation
- ✅ Fixed timezone issues (using local dates, not UTC)
- ✅ Fixed time sorting (proper AM/PM chronological order)
- ✅ E2E testing validation passed
- ✅ All data sourced from backend (no mock data)

## Development Notes
- **Storage**: Using in-memory MemStorage for MVP (no database persistence)
- **Timezone**: All date operations use local timezone (`toLocaleDateString('en-CA')`)
- **Time Parsing**: Session times sorted with AM/PM conversion to minutes for accuracy
- **Validation**: All forms use react-hook-form with zodResolver for type-safe validation
- **Query Management**: TanStack Query v5 with proper cache invalidation on mutations
- **Locked Features**: Analytics, Scheduling, Predictive features show lock icons with "Coming soon" tooltips

## User Preferences
- Brand colors must be #E2F9AD (lime) and #28A0AE (teal)
- All visible UI buttons must be functional (no dead interactions)
- Use in-memory storage (MemStorage) - no database required for MVP
- Modern, clean aesthetic with professional coaching platform feel
