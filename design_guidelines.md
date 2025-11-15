# SmartGenEduX ERP Design Guidelines

## Design Approach

**Selected System:** Shadcn/ui Design Pattern with Tailwind CSS
**Rationale:** Enterprise-grade ERP systems require clarity, consistency, and efficiency. Shadcn/ui provides a modern, accessible component library perfect for data-dense admin interfaces while maintaining professional aesthetics suitable for educational institutions.

**Core Design Principles:**
1. **Clarity First**: Information hierarchy guides users through complex workflows
2. **Professional Trust**: Clean, understated design builds confidence with school administrators
3. **Efficient Workflows**: Minimize clicks, maximize productivity
4. **Scalable Foundation**: Component-based architecture supports future module expansion

---

## Typography

**Font Families:**
- Primary: Inter (via Google Fonts CDN)
- Monospace: JetBrains Mono (for code display in VipuDev.AI)

**Type Scale:**
- Headings: font-semibold to font-bold
- H1: text-3xl (dashboard titles, page headers)
- H2: text-2xl (section headers, card titles)
- H3: text-xl (subsection headers)
- H4: text-lg (card subheadings)
- Body: text-base, font-normal (default content, forms)
- Small: text-sm (helper text, metadata, timestamps)
- Extra Small: text-xs (labels, badges, table captions)
- Code: text-sm font-mono (AI-generated code previews)

**Line Heights:**
- Headings: leading-tight
- Body text: leading-relaxed
- Code blocks: leading-relaxed

---

## Layout System

**Spacing Primitives:** Use Tailwind units of 2, 4, 6, 8, 12, 16, 20, 24
- Micro spacing (2-4): Between related elements, icon-text gaps
- Component spacing (6-8): Internal component padding, card content
- Section spacing (12-16): Between distinct sections, card margins
- Page spacing (20-24): Page containers, major layout divisions

**Grid & Container Strategy:**
- Main container: max-w-7xl mx-auto for application shell
- Sidebar width: w-64 (256px) fixed for navigation
- Content area: Fluid, responsive to remaining viewport width
- Dashboard grid: grid-cols-1 md:grid-cols-2 lg:grid-cols-3 for widget cards
- Form layouts: max-w-2xl for optimal readability

---

## Component Library

### Navigation
**Top Navigation Bar:**
- Full-width header with school branding, user avatar, notifications
- Height: h-16
- Padding: px-6
- Items: Logo (left), breadcrumbs (center), user menu (right)

**Sidebar Navigation:**
- Fixed left sidebar for module navigation
- Width: w-64 with collapsible option to w-16 (icon-only)
- Sections grouped by role permissions (Super Admin sees VipuDev.AI)
- Active state: Subtle background treatment with border-l-4 accent
- Icons: Heroicons via CDN

### Dashboard Widgets
**Stat Cards:**
- Aspect ratio: Auto-height based on content
- Padding: p-6
- Border: border with rounded-lg
- Shadow: shadow-sm hover:shadow-md transition
- Content: Icon + Label (text-sm) + Value (text-3xl font-bold) + Trend indicator

**Data Tables:**
- Striped rows for readability (alternate row backgrounds)
- Sticky header: Header remains visible on scroll
- Row height: py-3 for comfortable scanning
- Actions column: Right-aligned with icon buttons
- Pagination: Bottom-aligned, shows current range
- Search/Filter: Top toolbar with input and dropdowns

### VipuDev.AI Chat Interface
**Primary Feature Layout:**
- Two-panel design: Chat history (left 1/3) + Active conversation (right 2/3)
- Full-height: min-h-screen minus header
- Sticky input: Bottom-fixed message input with rounded-t-xl elevation

**Message Bubbles:**
- User messages: Right-aligned, max-w-2xl
- AI responses: Left-aligned, max-w-3xl
- Padding: p-4
- Spacing: mb-4 between messages
- Code blocks: Full-width within bubble, with syntax highlighting
- Timestamp: text-xs at bottom of each message

**Code Preview Sandbox:**
- Monaco editor-style display (if implemented) or well-formatted pre/code blocks
- Border: border-2 with rounded
- Padding: p-4
- Background: Distinct from page background
- Action buttons: Top-right (Copy, Deploy, Discard)
- Preview area: Split view showing code and rendered preview side-by-side

### Forms
**Input Fields:**
- Height: h-10 for text inputs, h-24 for textareas
- Padding: px-3 py-2
- Border: border with rounded-md
- Focus state: ring-2 ring-offset-2
- Labels: text-sm font-medium mb-2
- Helper text: text-xs below input
- Error state: border-red-500 with error message text-red-600

**Buttons:**
- Primary: Solid with font-medium
- Secondary: Outline variant
- Destructive: Distinct treatment for dangerous actions
- Height: h-10 (consistent with inputs)
- Padding: px-4 py-2
- Icons: Optional leading icon with mr-2 spacing

### Modals & Overlays
**Modal Dialog:**
- Backdrop: Semi-transparent overlay
- Content: Centered, max-w-lg to max-w-4xl depending on purpose
- Padding: p-6
- Close button: Top-right corner
- Actions: Bottom-aligned, right-justified button group

**Deployment Confirmation Modal:**
- Warning state for permission-based deployment
- Displays code diff or summary
- Requires explicit Super Admin confirmation
- Two-button layout: Cancel (secondary) + Deploy (primary)

---

## Page-Specific Layouts

### Authentication Pages
- Centered card layout: max-w-md mx-auto
- Vertical centering: min-h-screen flex items-center justify-center
- Logo and title at top
- Form fields with generous spacing (space-y-4)
- Social login buttons (if using Replit Auth)
- Footer links: Register/Login toggle, Forgot Password

### Admin Dashboard (Landing after login)
- Grid of stat cards: 4 columns on large screens
- Recent activity feed: 2/3 width card
- Quick actions sidebar: 1/3 width
- Module status indicators showing active/inactive modules
- VipuDev.AI quick access card (Super Admin only)

### VipuDev.AI Module Interface
- Full-page dedicated view (not in modal)
- Conversation list sidebar (collapsible)
- Main chat area with message history
- Bottom input bar with send button and attachment options
- Code preview panel (toggleable, can expand to full view)
- Context indicators showing current module being developed

### Module Management Dashboard
- Table view of all current modules
- Columns: Module Name, Status, Last Updated, Actions
- Add Module button triggers VipuDev.AI for creation
- Module cards alternative view option with grid layout

---

## Animations

**Minimal, Purpose-Driven Only:**
- Page transitions: None (instant navigation)
- Hover states: Subtle shadow/scale changes (duration-200)
- Loading states: Spinner for data fetching, skeleton screens for initial loads
- AI typing indicator: Simple animated dots while generating responses
- Button interactions: Built-in focus/active states only
- Avoid: Unnecessary slide-ins, fades, or decorative animations

---

## Images

**Hero Image: Not applicable** - This is an application interface, not a marketing site

**Image Usage:**
- School logo: Top-left of navbar (h-8 to h-10)
- User avatars: Rounded-full, w-8 h-8 in navbar, w-12 h-12 in profiles
- Empty states: Simple illustrations for no-data scenarios (search for "empty state illustration" placeholders)
- VipuDev.AI avatar: Icon or small illustration representing the AI assistant in chat
- Module icons: Consistent icon set from Heroicons for each ERP module

**Placement Strategy:**
- Icons over photos for enterprise applications
- Avatars for human interaction points (user menus, message authors)
- Illustrations only for onboarding or empty states
- No decorative imagery that doesn't serve functional purpose