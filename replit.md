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
The platform features a modern design using React, Tailwind CSS, and Shadcn UI components, incorporating a teal and lime color scheme, dark mode support, and the Inter font family. It includes responsive design with a collapsible sidebar, touch-friendly controls (≥40px targets), consistent Tailwind breakpoints, and reusable layout primitives for standardized responsive patterns. Key UX enhancements include mobile sidebar auto-close, modern component states with smooth transitions, optimized touch targets, and enhanced focus rings for improved accessibility. A detailed component design system ensures consistent styling and interaction across various UI elements. Mobile-first implementation uses conditional rendering for optimal performance and layout adjustments based on viewport size.

### Technical Implementations
Wellio is built with a React frontend and an Express.js backend. Data is stored in PostgreSQL with Drizzle ORM. State management uses TanStack Query v5, and form handling uses React Hook Form with Zod validation. Data visualization is powered by Recharts. The system employs UUID primary keys, local timezones for date operations, and robust form validation. The AI-Assisted Plan Builder leverages OpenAI GPT-4 with streaming responses, and PDF generation uses pdfkit. Plan data is stored using JSONB columns for flexibility. Database performance is optimized with indexes on frequently queried columns (clientId, coachId). Web push notifications are enabled via VAPID keys.

### Logging & Monitoring
A structured logging service (`server/logger.ts`) provides consistent logging with log levels (error, warn, info, debug). In production, logs are output as JSON for easy parsing. In development, logs are human-readable. Log level can be configured via the `LOG_LEVEL` environment variable (defaults to 'info' in production, 'debug' in development). Request ID tracking is added to all API requests for debugging. The error handler captures unhandled errors with full context for troubleshooting.

### Feature Specifications
- **Dashboard**: Provides real-time statistics, client progress, schedule, activity overviews, AI insights, and active goals.
- **Client Management**: Offers CRUD operations for clients, supporting manual entry and questionnaire-based onboarding. Includes standardized goal types and tracks configurable health metrics with user-friendly activity levels. A coach-facing client detail page provides a comprehensive, tabbed client view.
- **Questionnaire Builder**: Allows CRUD operations for questionnaires with a complete lifecycle management system (Draft/Published/Archived statuses), status filters, and usage tracking. It supports 10 question types with type-specific settings and smart deletion logic (archives used, hard deletes unused). An auto-cleanup utility removes unused archived questionnaires after 90 days. Includes toggles for standard health metrics and a units selector. The client onboarding form prefills data from invite tokens. An Intake Tab System displays questionnaire submissions with expandable Q&A, PDF download, and pinning for AI context.
- **Progress Analytics**: Tracks key metrics, trends, and performance insights over customizable time ranges.
- **Smart Scheduling**: Provides a monthly calendar view for session management and booking forms.
- **Communication**: Features two-way messaging with near-real-time updates, intelligent client list sorting, bidirectional unread tracking, global unread indicators, and auto-mark-as-read functionality. Supports inline file attachments with validation and object storage integration.
- **Contextual AI Assistance**: AI-powered insights are embedded contextually throughout the coach workflow instead of a separate page. Components include: AISuggestionsStrip (displays AI suggestions above chat messages in Communication page with send/edit actions), AIInsightsCard (shows AI-detected triggers with severity badges and check-in actions in Client Profile Overview tab), and ClientAttentionIndicator (attention badge on client cards when AI detects issues requiring action). All components fetch data from the engagement API endpoints and integrate with the messaging system to enable one-click check-in actions. Previous Engagement page scaffold remains available for legacy reference.
- **AI Insights Dashboard**: Delivers AI-powered trend analysis for nutrition, activity, and progress, offering actionable recommendations from OpenAI GPT-4o-mini and integrating active goals progress. The enhanced insights system analyzes ProgressEvent data from the AI Tracker to detect trends in weight, nutrition, workouts, sleep, and mood. Goal predictions estimate completion dates and success probability based on current trends. Coach dashboard shows aggregated insights for multiple clients, while client portal shows personalized insights with goal progress bars and recommendations.
- **Goal Setting & Progress Tracking**: Supports CRUD for client goals with various tracking parameters and priority levels. Goals have two scopes: "long_term" (persistent goals like weight loss) and "weekly_task" (recurring tasks from assigned plans). A composite progress score is calculated automatically using weighted components: 50% long-term goal progress, 30% weekly task completion, and 20% activity consistency (logged workouts, meals, check-ins). Progress recalculates automatically when goals are created/updated or when smart logs are processed. Client cards show the overall progress score with a detailed breakdown (Goals %, Weekly %, Activity %) in the expanded view.
- **Client Data Logs**: A tabbed interface for recording nutrition, workout, check-in data, and managing client goals.
- **AI-Assisted Plan Builder**: An interactive plan creation tool utilizing OpenAI GPT-4 for AI chat and a single-document canvas. It features conversation memory, streaming responses, and professional PDF generation with enhanced formatting (Markdown support, brand colors). The Plan Builder is integrated as a "Plan" tab within the client profile page, and chat messages and canvas content persist across tab switches. A comprehensive plan assignment system automates PDF generation, email notifications, plan versioning, and access controls, ensuring secure client access to assigned plans via a dedicated client portal.
- **Wearables Integration**: Achieved through a two-tier architecture using the ROOK API for over 400 devices and the ROOK iOS SDK for Apple Health integration via a native iOS app. Data is delivered via webhooks with HMAC signature verification.
- **Client Portal**: Provides secure password-based authentication with a redesigned dashboard featuring stat cards (Workouts/week, Calories/day, Day streak, Achievements), Recent Activity feed showing smart log entries, and Upcoming checklist. Navigation includes Dashboard, Profile, My Plan, Coach Chat, AI Tracker, and Log Out. The Coach Chat page features a modern chat interface with coach header (avatar and name), left-aligned coach messages and right-aligned client messages with chat bubble styling, timestamps, and a rounded message input bar with attachment support. The Profile page displays a clean layout with avatar card (initials, name, member since date), Contact Information section, Physical Stats with 4 colored stat boxes (Age purple, Height teal, Current weight amber, Target weight rose), progress bar, and Goals & Preferences with goal badges. The AI Tracker page provides a chat-like interface for free-form progress tracking with quick action buttons (Workout, Meal, Weight, Sleep, Water, Mood) that prefill the input with contextual prompts. Supports image attachments (up to 3 images, max 10MB each, JPEG/PNG/GIF/WebP) for food photos and workout images. AI processing uses GPT-4o Vision for image analysis, automatically classifying entries and extracting structured data (food descriptions, calories, macros, workout details). ParsedDataDisplay components show detailed nutrition info (food description, calories, protein, carbs, fat with confidence) in color-coded panels for both client AI Tracker and coach's client data logs view. All pages are fully responsive with mobile-first design.
- **Push Notifications**: Web push notifications with multi-device support, VAPID authentication, and deep-linking. Features include: multi-device subscriptions per user (stored in pushSubscriptions table with deviceId and userAgent), plan assignment notifications (triggered when weekly or main plans are assigned), test notification buttons in Settings for both coaches and clients, notification type payloads (message, plan_assigned, test, reminder, goal_update), and service worker deep-linking that routes clicks to specific pages based on notification type (e.g., messages → Communication/Coach Chat, plan_assigned → My Plan). The usePushNotifications hook handles subscription management with retry logic and permission flow. Enable Notifications UI is available in coach-settings.tsx and client-profile.tsx.

### System Design Choices
All displayed data is sourced from a robust backend, ensuring 100% authenticity and accuracy. Calculations are derived from live API data. AI insights leverage OpenAI GPT-4 for sophisticated pattern detection and recommendations, requiring a minimum of three data points for trend analysis and incorporating zero-baseline protection.

## External Dependencies
- **OpenAI GPT-4**: For AI insight generation, recommendations, and the AI-Assisted Plan Builder.
- **ROOK API**: For wearables integration (Garmin, Fitbit, Oura, Whoop).
- **ROOK iOS SDK v3.0+**: For Apple Health/HealthKit integration via a native iOS app.
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