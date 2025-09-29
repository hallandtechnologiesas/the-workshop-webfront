# Technical Overview

## Framework & Tooling
- Next.js App Router on v15 with Turbopack-enabled scripts and React 19 (`package.json:5`, `package.json:10`).
- TypeScript with strict compiler settings, path alias `@/*`, and Next-specific plugin support (`tsconfig.json:2`).
- ESLint flat config extending `next/core-web-vitals` and `next/typescript` plus Tailwind/PostCSS 4 via `@tailwindcss/postcss` (`eslint.config.mjs:1`, `postcss.config.mjs:1`).
- UI utilities pulled from shadcn presets with Radix Slot, class-variance-authority, and local `cn` helper (`components/ui/button.tsx:1`, `lib/utils.ts:1`, `components.json:1`).

## Routing & Layout
- Uses App Router with a root layout that wires global styles and wraps all pages in a React Query provider (`app/layout.tsx:1`, `app/react-query-provider.tsx:1`).
- Route group `(navbar)` shares a lightweight navigation bar across order-related pages while keeping marketing pages isolated (`app/(navbar)/layout.tsx:1`).
- Marketing homepage rendered by `app/page.tsx:1`, while order flows live under `/order` with dynamic segments for `orderId` and status states (`app/(navbar)/order/page.tsx:1`, `app/(navbar)/order/[id]/page.tsx:1`, `app/(navbar)/order/[id]/uploading/page.tsx:1`, `app/(navbar)/order/[id]/uploaded/page.tsx:1`, `app/(navbar)/order/[id]/[status]/page.tsx:1`).
- `dynamic = "force-dynamic"` on `/order` creation ensures a fresh Supabase-backed order on each visit (`app/(navbar)/order/page.tsx:1`).

## Data & Backend Integration
- Supabase is the primary persistence layer; server-side client uses service role key while a placeholder client hints at future browser usage (`utils/supabase/server.ts:1`, `utils/supabase/client.ts:1`).
- Server actions manage order lifecycle: creating orders, registering files, marking uploads complete, and updating statuses, all guarded by Zod validation (`app/(navbar)/order/actions.ts:1`).
- React `cache` helpers wrap Supabase fetches for order summaries and file metadata to reuse queries during server rendering (`app/(navbar)/order/data.ts:1`).
- REST API endpoint at `/api/orders/[id]` normalises Supabase responses for client polling and enforces UUID params via shared schema (`app/api/orders/[id]/route.ts:1`, `app/(navbar)/order/schema.ts:1`).

## Client-Side Order Workflow
- `OrderUploadClient` drives the uploading UX: stateful file queue, drag-and-drop, advanced configuration, resumable uploads via `tus-js-client`, and post-upload Supabase updates (`app/(navbar)/order/[id]/OrderUploadClient.tsx:1`).
- Files are first registered server-side (assigning database IDs) before tus uploads into the `order-files` Supabase Storage bucket; upload progress is tracked per file, and failures bubble user-friendly errors (`app/(navbar)/order/[id]/OrderUploadClient.tsx:160`).
- Successful uploads trigger `markFileUploadedAction`, and once all files settle the order status flips to `uploaded`, redirecting to the confirmation page (`app/(navbar)/order/[id]/OrderUploadClient.tsx:320`).
- Post-upload dashboards (`OrderProcessingStatus`, `OrderUploadSummary`) re-use the `/api/orders/[id]` endpoint through React Query for live polling and pricing placeholders (`app/(navbar)/order/components/OrderProcessingStatus.tsx:1`, `app/(navbar)/order/components/OrderUploadSummary.tsx:1`, `app/(navbar)/order/hooks/useOrderDetails.ts:1`).

## Styling & UX
- Tailwind CSS v4 with theme tokens defined in `app/globals.css`, custom marquee animation, and dark-mode variants via `@custom-variant` (`app/globals.css:1`).
- UI building blocks rely on shadcn-style primitives (e.g., button variants) combined with Lucide icons for visual affordances (`components/ui/button.tsx:1`).
- Upload surfaces provide drag states, progress indicators, and advanced material presets/overrides, reflecting manufacturing-focused UX (`app/(navbar)/order/components/UploadDropzone.tsx:1`, `app/(navbar)/order/components/AdvancedOptions.tsx:1`, `app/(navbar)/order/components/UploadFileList.tsx:1`).

## Configuration & Operational Notes
- Environment variables required: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `SUPABASE_SECRET_KEY`; tus uploads expect a bucket named `order-files` (`utils/supabase/server.ts:2`, `app/(navbar)/order/[id]/OrderUploadClient.tsx:60`).
- Public assets currently limited to a logo, suggesting room to expand brand visuals (`public/logo.png`).
- Workspace configured for npm/pnpm/bun, with pnpm workspace only enabling build for `msgpackr-extract` native dependency (`pnpm-workspace.yaml:1`).

## Next Steps
1. Document required Supabase storage bucket and table schemas alongside the env var checklist.
2. Decide on real pricing data sources to replace the sample breakdown and wire them into `getOrderDetails`.
3. Add automated integration tests for the upload flow to guard the server actions and API contract.
