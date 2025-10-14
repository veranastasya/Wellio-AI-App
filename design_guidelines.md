# Wellio AI Coaching Platform - Design Guidelines

## Design Approach
**Selected Approach**: Modern SaaS Dashboard System with custom brand identity
**Justification**: Wellio is a productivity-focused coaching platform requiring clarity, efficiency, and professional aesthetics. The design prioritizes data readability, workflow efficiency, and trustworthy presentation while incorporating the distinctive brand colors.

---

## Core Design Elements

### A. Color Palette

**Brand Colors** (provided):
- Primary Lime: `#E2F9AD` → 75 91% 83%
- Primary Teal: `#28A0AE` → 186 61% 42%

**Extended Palette** (derived from brand colors):

**Light Mode:**
- Background: `220 20% 98%` (near white with subtle cool tone)
- Surface: `220 20% 100%` (pure white for cards)
- Text Primary: `220 15% 15%` (dark charcoal)
- Text Secondary: `220 10% 45%` (medium gray)
- Border: `220 15% 90%` (light gray borders)
- Teal Variants: 
  - Hover: `186 61% 38%` (darker)
  - Active: `186 61% 35%` (darkest)
  - Light: `186 50% 95%` (for backgrounds)
- Lime Variants:
  - Accent: `75 85% 75%` (slightly less bright)
  - Subtle: `75 80% 92%` (very light for highlights)
- Success: `145 65% 45%` (green)
- Warning: `45 90% 55%` (amber)
- Error: `0 70% 55%` (red)

**Dark Mode:**
- Background: `220 20% 10%` (deep charcoal)
- Surface: `220 18% 14%` (elevated surfaces)
- Surface Elevated: `220 16% 18%` (cards, modals)
- Text Primary: `220 15% 95%` (off-white)
- Text Secondary: `220 10% 65%` (light gray)
- Border: `220 15% 25%` (dark gray borders)
- Teal Dark: `186 55% 50%` (lighter for visibility)
- Lime Dark: `75 88% 88%` (brighter for contrast)

### B. Typography

**Font Stack**:
- Primary: `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`
- Monospace (for data): `'Roboto Mono', 'Courier New', monospace`

**Type Scale**:
- Heading 1: `text-4xl font-bold` (36px, dashboard titles)
- Heading 2: `text-2xl font-semibold` (24px, section headers)
- Heading 3: `text-xl font-semibold` (20px, card titles)
- Heading 4: `text-lg font-medium` (18px, subsections)
- Body Large: `text-base font-normal` (16px, primary content)
- Body: `text-sm font-normal` (14px, secondary content)
- Caption: `text-xs font-normal` (12px, metadata, labels)
- Stats/Numbers: `text-3xl font-bold tracking-tight` (30px, metrics)

### C. Layout System

**Spacing Primitives**: Use Tailwind units of `2, 3, 4, 6, 8, 12, 16, 20, 24`
- Micro spacing: `p-2, m-2` (8px - tight elements)
- Component spacing: `p-4, gap-4` (16px - standard padding)
- Section spacing: `p-6, gap-6` (24px - card interiors)
- Large spacing: `p-8, gap-8` (32px - major sections)
- Extra large: `p-12, py-20` (48px, 80px - page sections)

**Grid System**:
- Dashboard: `grid-cols-1 md:grid-cols-2 lg:grid-cols-4` for stat cards
- Main Content: `grid-cols-1 lg:grid-cols-3` (2/3 main, 1/3 sidebar)
- Client List: `grid-cols-1 gap-4` (stacked cards)

**Container Widths**:
- Max content width: `max-w-7xl mx-auto` (1280px)
- Card max width: `max-w-4xl` for focused content
- Form max width: `max-w-2xl` for optimal readability

### D. Component Library

**Navigation**:
- Left sidebar: `w-64` fixed, dark surface with teal accent for active items
- Logo area: Lime accent background with teal text
- Lock icons: Small gray lock with "Coming soon" tooltip on hover

**Cards & Surfaces**:
- Stats cards: White/dark surface, rounded-xl, subtle shadow, teal border-top accent (2px)
- Content cards: Consistent padding-6, rounded-lg borders
- Hover states: Subtle scale-105 transform, increased shadow

**Data Visualization**:
- Charts: Use teal primary, lime secondary for data points
- Progress bars: Lime fill on gray track, rounded-full
- Timeline: Vertical line in teal with lime dots for milestones

**Buttons**:
- Primary: Teal background, white text, rounded-lg, hover:darker teal
- Secondary: Lime background, dark text, rounded-lg
- Outline: Border-teal, text-teal, bg-transparent
- Ghost: No background, text-teal, hover:lime-subtle background
- Sizes: `px-4 py-2` (default), `px-6 py-3` (large), `px-3 py-1.5` (small)

**Forms**:
- Inputs: Border-gray, rounded-lg, focus:ring-2 ring-teal, padding-3
- Labels: text-sm font-medium, margin-bottom-2
- Error states: Border-red, text-red for messages
- Dark mode: Dark surface backgrounds, lighter borders

**Tables & Lists**:
- Headers: Teal background-subtle, font-semibold, uppercase text-xs
- Rows: Hover state with lime-subtle background
- Borders: Light gray dividers between rows
- Alternating rows: Optional subtle gray background

**Modals & Overlays**:
- Backdrop: `bg-black/50` with backdrop-blur-sm
- Modal: Max-width-2xl, rounded-xl, padding-6
- Close button: Top-right, text-gray hover:text-teal

**Icons**:
- Use Heroicons via CDN
- Size classes: `w-4 h-4` (small), `w-5 h-5` (default), `w-6 h-6` (large)
- Color: currentColor for adaptability

**Badges & Tags**:
- Status badges: Rounded-full, px-3 py-1, text-xs font-medium
- Active: Lime background, dark text
- Inactive: Gray background, dark text
- Warning: Amber background

### E. Dashboard-Specific Patterns

**Stat Cards**: 
- Grid of 4 cards showing key metrics
- Large number (text-3xl font-bold) with teal accent
- Label below in text-sm text-gray
- Small trend indicator (↑/↓) with percentage in lime/red
- Icon top-right in teal-subtle background circle

**Schedule Panel**:
- White card with time-based list
- Each session: Time (text-sm text-teal), client name (font-medium), session type (text-xs text-gray)
- Avatar with initials on left, colored background using teal/lime rotation
- Divider lines between sessions

**Activity Feed**:
- Reverse chronological list
- Icon (checkmark/star) in lime circle
- Activity text with client name bolded in teal
- Timestamp in text-xs text-gray below

**AI Insights Card**:
- Gradient background: Subtle teal-to-lime diagonal
- White text for contrast
- Alert icon in top-left
- Recommendation list with bullet points

**Client Cards**:
- Avatar/initial circle (teal or lime background)
- Client name (font-semibold), status badge
- Last session date, progress percentage
- Action buttons (view, message) on hover

---

## Accessibility & Interaction

**Focus States**: 
- Ring-2 ring-teal ring-offset-2 for keyboard navigation
- Visible focus on all interactive elements

**Contrast Requirements**:
- All text meets WCAG AA (4.5:1 for body, 3:1 for large text)
- Teal text on white: ≥4.5:1 ratio
- Dark mode: Lighter teal/lime variants for contrast

**Animation** (minimal):
- Transitions: `transition-all duration-200 ease-in-out` for hover states
- No auto-playing animations
- Chart animations: Subtle slide-in on load (once)

**Responsive Breakpoints**:
- Mobile: Single column, collapsed sidebar (hamburger menu)
- Tablet (md): 2-column grids, visible sidebar
- Desktop (lg+): Full 4-column dashboard, all features visible

---

## Images

**Dashboard**: No hero image required - focus on data visualization and functional UI. 
**Avatar Placeholders**: Use initials in colored circles (alternating teal/lime backgrounds) for client avatars throughout the interface.