# Overview

The Workshop is an on-demand 3D printing service platform built for Cairo. Users can upload 3D model files (STL, OBJ, AMF, 3MF), configure print settings (material, quality presets, advanced parameters), and place orders for physical delivery. The application handles the complete order lifecycle from file upload through order processing, with real-time progress tracking and status updates.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture

**Framework**: Next.js 15 with App Router and React 19
- Server components by default for optimal performance and SEO
- Client components (`"use client"`) used only where interactivity is required (file uploads, drag-and-drop, real-time polling)
- TypeScript with strict mode enforced across the codebase

**Routing Strategy**: Hybrid approach combining marketing and application flows
- Marketing pages (homepage) live at root level without navigation
- Order flows isolated in `(navbar)` route group to share navigation bar
- Dynamic segments handle order IDs with UUID validation via Zod schemas
- Status-based routing (`/order/[id]/[status]`) with automatic redirects to match current order state

**State Management**: 
- React Query (`@tanstack/react-query`) for server state synchronization and polling
- Local React state for ephemeral UI concerns (file queue, drag states, upload progress)
- No global state library needed due to server-first architecture

**UI Component System**: shadcn/ui presets with Radix primitives
- Button variants powered by `class-variance-authority` for type-safe styling
- Tailwind CSS v4 with custom theme tokens and dark mode support via CSS variables
- Lucide icons for consistent visual language
- `cn()` utility combines `clsx` and `tailwind-merge` for conditional styling

## Backend Architecture

**Server Actions**: Primary mutation mechanism following Next.js patterns
- `createOrderRecord`: Initializes order with "uploading" status
- `registerOrderFilesAction`: Batch-creates file records in database before upload
- `markFileUploadedAction`: Updates individual file status post-upload
- `updateOrderStatusAction`: Transitions order through lifecycle states
- All actions validated with Zod schemas to ensure type safety

**Data Fetching**: React `cache()` wrappers for deduplication
- `getOrderById`: Fetches order metadata with status
- `getFilesByOrderId`: Retrieves file configurations and metadata
- `getOrderDetails`: Combines order and file data for summary views
- Cache layer prevents redundant database queries during server rendering

**API Endpoints**: REST route at `/api/orders/[id]`
- Returns normalized JSON for client-side polling via React Query
- Validates order ID as UUID before database queries
- Aggregates order record and associated files into single response
- Enables real-time status updates without full page reloads

**File Upload Strategy**: Resumable uploads via tus protocol
- Files registered in database first to receive unique IDs
- tus-js-client uploads directly to Supabase Storage `order-files` bucket
- Progress tracking per file with idle/uploading/success/error states
- Post-upload callback updates database record and checks completion
- Once all files succeed, order status transitions to "uploaded" with automatic redirect

## Data Layer

**Database**: Supabase (PostgreSQL-backed)
- `orders` table: id (UUID), status (text), timestamps
- `files` table: id (UUID), order_id (FK), config (JSON), original_name (text), created_at
- Status field drives application routing and UI state
- JSON config stores print preset, overrides, material type/color per file

**Storage**: Supabase Storage bucket `order-files`
- Resumable uploads via tus protocol endpoint
- Files scoped by order ID for organizational clarity
- Public access not required; fetching happens server-side

**Client Configuration**:
- Server client uses service role key (`SUPABASE_SECRET_KEY`) for admin operations
- Browser client placeholder exists for future authenticated features
- Both clients initialized with `NEXT_PUBLIC_SUPABASE_URL`

## Configuration System

**Print Presets**: Predefined quality tiers
- Draft, Standard, Fine, Strong each map to layer height/walls/infill defaults
- Users can override individual parameters through advanced options panel
- Material types include PLA, PETG, PETG-CF20, TPU, PA6-CF
- Color selection from predefined swatches or custom hex values

**Environment Variables**:
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project endpoint
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: Anon/public key for client
- `SUPABASE_SECRET_KEY`: Service role key for server operations
- `REPLIT_DEV_DOMAIN`: Enables server actions in Replit environment

# External Dependencies

## Third-Party Services

**Supabase**: Backend-as-a-Service
- PostgreSQL database for orders and file metadata
- Storage API for binary file uploads via tus protocol
- Requires manual setup of `orders` and `files` tables plus `order-files` storage bucket
- Service role key needed for server-side operations

## Key Libraries

**React Query**: Server state management
- Polling mechanism for live order status updates
- Cache invalidation and refetching strategies
- Query key design: `["order", orderId]` for details endpoint

**tus-js-client**: Resumable file uploads
- Enables recovery from network interruptions
- Uploads directly to Supabase Storage resumable endpoint
- Progress events mapped to React state for UI feedback

**Zod**: Runtime type validation
- Schema validation for server action inputs
- UUID verification for route parameters
- FileConfig, PrintPreset, and MaterialType type guards

**shadcn/ui ecosystem**:
- `@radix-ui/react-slot`: Polymorphic component composition
- `class-variance-authority`: Type-safe variant styling
- `tailwind-merge` + `clsx`: Conditional class merging

**Tailwind CSS v4**: Utility-first styling with PostCSS 4 integration

## Development Tools

**TypeScript**: Strict mode with path aliases (`@/*`)
**ESLint**: Flat config with Next.js and TypeScript rules
**Prettier**: Code formatting (configured in VS Code settings)