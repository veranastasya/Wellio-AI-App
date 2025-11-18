# Wellio - AI Agent For Smarter Coaching

## Overview
Wellio is an AI-powered fitness and wellness coaching platform designed to help professionals efficiently manage their coaching practice. It provides client insights, streamlines workflows, and aims to enhance coaching effectiveness and client outcomes. The platform offers a modern dashboard, client management, questionnaire building, progress analytics, smart scheduling, communication tools, and AI-driven insights for personalized recommendations. Wellio seeks to be a comprehensive solution for coaches optimizing their practice with technology.

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
The platform features a modern design using React, Tailwind CSS, and Shadcn UI components, incorporating a teal and lime color scheme, dark mode support, and the Inter font family. It includes responsive design with a collapsible sidebar and touch-friendly controls (≥40px targets), consistent Tailwind breakpoints, and reusable layout primitives for standardized responsive patterns.

**UX Enhancements (November 2025):**
- **Mobile Sidebar Auto-Close**: Sidebar automatically closes on mobile when navigating between pages for better UX. Implemented via `SidebarAutoClose` wrapper component in both `CoachProtectedLayout` and `ClientProtectedLayout`.
- **Modern Component States**: All interactive elements feature smooth 150ms transitions on hover/focus/active states. Select dropdowns include hover-elevate effects and animated chevron rotation. Sidebar menu items have refined active states with softer highlighting.
- **Touch Target Optimization**: Core UI components updated to meet ≥40px minimum: Input (min-h-10), Select (min-h-10), Tabs (min-h-10), SidebarMenuButton (min-h-10/8/12), all with smooth transitions for professional feel.
- **Focus Ring Enhancement**: Improved keyboard navigation visibility with ring-2 system across all focusable elements.

**Mobile-First Responsive Implementation:**
- **Conditional Rendering**: List pages (questionnaires, etc.) use viewport detection (`isMobile` state with window.innerWidth <768px) to conditionally render card layouts on mobile and table layouts on desktop. Table elements are NOT present in DOM on mobile viewports, ensuring optimal mobile performance.
- **Touch Targets**: All interactive controls meet ≥40px minimum touch target requirement using `min-h-10` Tailwind class on buttons, inputs, selects, tabs, and all interactive elements across questionnaires list, questionnaire builder, and client onboarding pages.
- **Responsive Patterns**: Consistent use of responsive Tailwind classes: `p-4 sm:p-6` (padding), `space-y-3 sm:space-y-4` (spacing), `flex flex-col sm:flex-row` (stacked mobile layouts), `text-xl sm:text-2xl md:text-3xl` (typography scaling).
- **Smart Button Visibility**: Questionnaire builder implements dynamic button display based on status and unsaved changes detection using React Hook Form isDirty + deep JSON comparisons for questions/standardFields arrays.

### Technical Implementations
Wellio is built with a React frontend and an Express.js backend. Data is stored in PostgreSQL with Drizzle ORM. State management uses TanStack Query v5, and form handling uses React Hook Form with Zod validation. Data visualization is powered by Recharts. The system employs UUID primary keys, local timezones for date operations, and robust form validation. AI-Assisted Plan Builder leverages OpenAI GPT-4 with streaming responses. PDF generation uses pdfkit, and plan data uses JSONB columns for flexibility.

### Feature Specifications
- **Dashboard**: Real-time stats, client progress, schedule, activity, AI insights, and active goals.
- **Client Management**: CRUD operations for clients, including manual entry and questionnaire-based onboarding. Features a **single "Client Name" field** (not separate first/last name) for simplified data entry. Includes standardized goal types with 12 predefined options. Tracks 6 configurable health metrics: Sex (dropdown: Male/Female/Other), Age (0-120), Weight (0-1000 lbs, decimal), Height (0-120 inches, decimal), **Activity Level** (dropdown with user-friendly descriptive labels: "Sedentary (little to no exercise)", "Lightly Active (light exercise 1-3 days/week)", "Moderately Active (moderate exercise 3-5 days/week)", "Very Active (hard exercise 6-7 days/week)", "Extremely Active (hard exercise & work in a physical job)" - stored with backward-compatible keys and multipliers), and Body Fat % (0-100%, decimal). **Coach-facing client detail page** at `/coach/clients/:clientId` provides comprehensive client view with tabbed interface (Overview and Intake tabs).
- **Questionnaire Builder**: CRUD for questionnaires with a **complete lifecycle management system**: Draft/Published/Archived status workflow, tabbed UI (Active/Archived tabs), status filters (scoped to Active tab only), and usage tracking (increments when sent to clients). Supports 10 question types with type-specific settings and validation. **Smart deletion logic**: Archives questionnaires with usageCount > 0, hard deletes only unused ones (usageCount = 0). **Lifecycle API**: PATCH `/publish` (draft→published), `/archive` (any→archived), `/restore` (archived→published), DELETE with conditional archiving. **Auto-cleanup utility** (`cleanupArchivedQuestionnaires()`) removes unused archived questionnaires after 90 days. Includes toggles for 6 standard health metrics. **Units selector** (U.S. Units/Metric) positioned in top-right corner as filter-style component in Standard Health Metrics section header. Default fields list shows "Client Name" as single field. **Client onboarding form** automatically prefills name and email from invite token data while preserving user edits. **Intake Tab System**: Displays all questionnaire submissions in timeline view with metadata (questionnaire name, submission date), expandable Q&A accordions, PDF download capability, and pin/unpin toggle for AI context integration. Includes empty state handling and smart answer formatting.
- **Progress Analytics**: Tracks key metrics, trends, and performance insights over customizable time ranges.
- **Smart Scheduling**: Monthly calendar view for session management and booking forms.
- **Communication**: Two-way messaging with near-real-time updates, intelligent client list sorting, bidirectional unread tracking, global unread indicators, and bidirectional auto-mark-as-read. Supports inline file attachments with validation and object storage integration.
- **AI Insights Dashboard**: Provides AI-powered trend analysis for nutrition, activity, and progress, with actionable recommendations from OpenAI GPT-4 and integration of active goals progress.
- **Goal Setting & Progress Tracking**: CRUD for client goals with types, target/current value tracking, deadlines, status, and priority levels.
- **Client Data Logs**: Tabbed interface for recording nutrition, workout, check-in data, and managing client goals.
- **AI-Assisted Plan Builder**: Interactive plan creation using OpenAI GPT-4 with client context display, conversation memory, streaming responses, plan preview, save/publish workflow, and professional PDF generation. Implements optimistic UI updates for instant message display with full race-condition protection during cross-client navigation. **Persistent sidebar rail redesign** (November 2025): Client Context maintains spatial consistency with persistent 48px rail (w-12) when collapsed, showing vertical toggle and quick KPI chips (age badge, rotated goal snippet). Expands to w-80 with smooth 300ms transitions. **Single-document canvas** (November 2025): Replaced cramped section cards with unified continuous document editor using single Textarea for full-height editing. PDF controls (filename input + download button) moved from top header into canvas header. Canvas features expand/collapse toggle for full-screen editing. Plan content now stored as single text field (backward compatible with legacy sections array format). **PDF generation and access control** (November 2025): Complete ACL system implementation with CLIENT_ID access group type for client-specific files. PDFs stored in object storage with proper owner-based access (coaches as owners) and ACL rules for client READ permission. Fixed 401 Unauthorized errors by: (1) adding CLIENT_ID access group type to handle client access patterns, (2) updating /objects/* route handler to recognize both coach and client sessions, (3) correcting ACL policy generation to use proper enum values.
- **Wearables Integration (ROOK API)**: Two-tier architecture for 400+ devices (Garmin, Fitbit, Oura, Whoop) via web API and Apple Health via native iOS app (ROOK iOS SDK). Data delivered via webhooks with HMAC signature verification.
- **Client Portal**: Secure password-based authentication, client dashboard with Home, Forms, Chat, and Plan sections, and fully responsive design.

### System Design Choices
All displayed data is sourced from a robust backend, ensuring 100% authenticity. The system is designed for data accuracy, with calculations derived from live API data. AI insights leverage OpenAI GPT-4 for sophisticated pattern detection and recommendations, requiring a minimum of three data points for trend analysis and incorporating zero-baseline protection.

## External Dependencies
- **OpenAI GPT-4**: For AI insight generation, recommendations, and the AI-Assisted Plan Builder.
- **ROOK API**: For wearables integration (Garmin, Fitbit, Oura, Whoop).
- **ROOK iOS SDK v3.0+**: For Apple Health/HealthKit integration via a native iOS app.
- **iOS Native App (Swift)**: Companion app for Apple Health integration.
- **PostgreSQL**: Primary database, managed with Drizzle ORM.
- **Node.js**: Backend runtime environment.
- **React**: Frontend library.
- **Tailwind CSS**: Styling framework.
- **Shadcn UI**: UI component library.
- **Wouter**: React router.
- **Recharts**: Data visualization library.
- **TanStack Query v5**: Data fetching and state management.
- **React Hook Form**: Form management and validation.
- **Zod**: Schema validation.