# Wellio - AI Agent For Smarter Coaching

## Overview
Wellio is an AI-powered fitness and wellness coaching platform designed to help professionals efficiently manage their coaching practice. It provides client insights, streamlines workflows, and aims to enhance coaching effectiveness and client outcomes. The platform offers a modern dashboard, client management, questionnaire building, progress analytics, smart scheduling, communication tools, and AI-driven insights for personalized recommendations, serving as a comprehensive solution for coaches optimizing their practice with technology.

## User Preferences
- Brand colors must be #E2F9AD (lime) and #28A0AE (teal)
- All visible UI buttons must be functional (no dead interactions)
- PostgreSQL database with Drizzle ORM for data persistence
- Modern, clean aesthetic with professional coaching platform feel
- Questionnaire Builder positioned between Client Management and Progress Analytics in sidebar
- AI Insights and Client Data Logs positioned after Communication in sidebar navigation
- Mobile-first responsive design required across all pages with touch-friendly controls (≥40px targets)

## System Architecture

### UI/UX Decisions
The platform features a modern design using React, Tailwind CSS, and Shadcn UI components, incorporating a teal and lime color scheme, dark mode support, and the Inter font family. It includes responsive design with a collapsible sidebar, touch-friendly controls (≥40px targets), consistent Tailwind breakpoints, and reusable layout primitives for standardized responsive patterns.

### Technical Implementations
Wellio is built with a React frontend and an Express.js backend. Data is stored in PostgreSQL with Drizzle ORM. State management uses TanStack Query v5, and form handling uses React Hook Form with Zod validation. Data visualization is powered by Recharts. The AI-Assisted Plan Builder leverages OpenAI GPT-4 with streaming responses, and PDF generation uses pdfkit. The system supports web push notifications via VAPID keys and multi-language interfaces (English, Russian, Spanish).

### Feature Specifications
- **Dashboard**: Real-time statistics, client progress, schedule, activity overviews, AI insights, and active goals.
- **Client Management**: CRUD for clients, onboarding, standardized goal types, and health metric tracking.
- **Questionnaire Builder**: CRUD for questionnaires with lifecycle management, 10 question types, and smart deletion logic.
- **Progress Analytics**: Tracks key metrics, trends, and performance insights.
- **Smart Scheduling**: Monthly calendar view for session management.
- **Communication**: Two-way messaging with near real-time updates, unread tracking, and inline file attachments.
- **Contextual AI Assistance**: AI-powered insights embedded throughout the coach workflow (e.g., AISuggestionsStrip, AIInsightsCard, ClientAttentionIndicator).
- **Automatic AI Insight Detection**: Background service analyzing client activity for inactivity, missed workouts, and nutrition concerns, with auto-resolve and severity escalation.
- **AI Insights Dashboard**: Delivers AI-powered trend analysis for nutrition, activity, and progress with actionable recommendations and goal predictions.
- **Goal Setting & Progress Tracking**: CRUD for client goals, composite progress scoring (50% long-term goals, 30% weekly plan adherence, 20% activity consistency), and automatic recalculation. Weekly plan adherence tracks client checkmarks on their assigned schedule items.
- **Client Data Logs**: Tabbed interface for recording nutrition, workout, and check-in data.
- **AI-Assisted Plan Builder**: Interactive plan creation using OpenAI GPT-4, conversation memory, streaming responses, and professional PDF generation with plan assignment.
- **Wearables Integration**: Two-tier architecture using ROOK API and ROOK iOS SDK for data from over 400 devices and Apple Health.
- **Client Portal**: Secure password-based authentication with dashboard, activity feed, upcoming checklist, chat, and profile management.
- **Push Notifications**: Web push notifications with multi-device support, VAPID authentication, deep-linking, and various notification types.
- **Smart Reminders**: Intelligent automated reminder system with severity-based prioritization, cooldowns, quiet hours, and client timezone support.

### System Design Choices
All displayed data is sourced from a robust backend, ensuring 100% authenticity and accuracy. Calculations are derived from live API data. AI insights leverage OpenAI GPT-4 for sophisticated pattern detection and recommendations, requiring a minimum of three data points for trend analysis and incorporating zero-baseline protection.

## External Dependencies
- **OpenAI GPT-4**: For AI insight generation, recommendations, and the AI-Assisted Plan Builder.
- **ROOK API**: For wearables integration.
- **ROOK iOS SDK v3.0+**: For Apple Health/HealthKit integration.
- **PostgreSQL**: Primary database.
- **Node.js**: Backend runtime environment.
- **React**: Frontend library.
- **Tailwind CSS**: Styling framework.
- **Shadcn UI**: UI component library.
- **Wouter**: React router.
- **Recharts**: Data visualization library.
- **TanStack Query v5**: Data fetching and state management.
- **React Hook Form**: Form management and validation.
- **Zod**: Schema validation.