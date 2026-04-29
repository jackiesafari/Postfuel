# Content Machine

Content Machine is a Next.js 14 App Router project for generating and reviewing AI-assisted content across four formats:

- Blog drafts
- Code walkthroughs
- Article or PDF summaries
- Social posts

The app is designed around one shared idea: every draft should keep evidence attached so an editor can review claims before sharing or publishing.

## What is implemented

### Studio workflow

- `/` is the main studio page.
- Users choose a format, enter a topic, add notes or a URL, and optionally upload a PDF for summaries.
- Submitting the form calls one of the agent API routes and creates a saved draft.

### Review workflow

- `/drafts/[id]` is the draft review page.
- The draft can be edited inline.
- Evidence items can be toggled as verified.
- Drafts can be copied as Markdown.
- Share helpers are included for email, X, and LinkedIn.

### Agent routes

The app currently exposes these route handlers:

- `POST /api/agents/blog`
- `POST /api/agents/code`
- `POST /api/agents/summary`
- `POST /api/agents/social`
- `GET /api/drafts`
- `GET /api/drafts/[id]`
- `PATCH /api/drafts/[id]`
- `POST /api/uploads`
- `GET /api/uploads/[filename]`

## Tech stack

- Next.js 14
- TypeScript
- Tailwind CSS
- Minimal shadcn-style UI primitives in `src/components/ui`
- OpenAI SDK for model-backed generation when configured
- `react-markdown` + `rehype-highlight` for draft preview
- `jsdom` + `@mozilla/readability` for URL/article extraction
- Optional Supabase persistence
- Optional Vercel Blob uploads
- Vitest for core generation tests

## Project structure

```text
src/
  app/
    page.tsx                  # Main studio UI
    drafts/[id]/page.tsx      # Review/edit/share screen
    api/
      agents/*/route.ts       # Four content agent endpoints
      drafts/route.ts         # List drafts
      drafts/[id]/route.ts    # Read/update a draft
      uploads/route.ts        # Upload PDFs
      uploads/[filename]/route.ts
  components/
    studio-form.tsx
    review-client.tsx
    recent-drafts.tsx
    markdown-renderer.tsx
    ui/
  lib/
    agents.ts                 # Agent orchestration and fallbacks
    draft-store.ts            # Supabase or local JSON persistence
    summary.ts                # URL extraction and chunking helpers
    uploads.ts                # Vercel Blob or local file storage
    research.ts               # Suggested web sources
    types.ts
data/
  drafts.json                 # Local fallback persistence
```

## How the app behaves today

### Persistence

The app uses two storage modes:

1. Supabase if both of these are set:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
2. Local JSON fallback if Supabase is not configured:
   - Drafts are stored in `data/drafts.json`

### Uploads

PDF uploads also support two modes:

1. Vercel Blob if `BLOB_READ_WRITE_TOKEN` is set
2. Local file fallback in `data/uploads/` if Blob is not configured

### AI generation

If `OPENAI_API_KEY` is set, the app uses OpenAI for draft generation.

If it is not set, the app falls back to deterministic template-based output so the UI and workflow still function locally.

### Summary behavior

Summary generation supports:

- URL summarization through article extraction
- Text-based fallback summarization from notes
- Optional delegation to an external Python service for PDF-heavy workflows

If the Python service is not configured, the app still works, but uploaded PDFs do not go through a full PyMuPDF pipeline.

## Environment variables

Create a `.env.local` file in the project root.

### Minimum useful setup

```bash
OPENAI_API_KEY=your_openai_key
```

This enables model-backed generation for the four agents.

### Optional storage setup

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
BLOB_READ_WRITE_TOKEN=your_vercel_blob_token
```

### Optional Python summary service

```bash
PYTHON_SUMMARY_SERVICE_URL=http://localhost:8000
```

Important detail:

- The code currently expects to call `${PYTHON_SUMMARY_SERVICE_URL}/summarize`
- For PDF uploads, it sends `multipart/form-data`
- For text or URL summaries, it sends JSON

So if you run a custom Python service locally, it should expose:

- `POST /summarize`

and accept both:

- JSON requests for text or URL summaries
- multipart file uploads for PDF summaries

## What `PYTHON_SUMMARY_SERVICE_URL` actually is

`PYTHON_SUMMARY_SERVICE_URL` is not something you download from this repo. It is the base URL of a separate Python summarization service that you host yourself.

Examples:

- Local development: `http://localhost:8000`
- Railway: `https://your-summary-service.up.railway.app`
- Render: `https://your-summary-service.onrender.com`

The current repo does not include that Python service implementation. The Next.js app is already wired to call it if you provide the URL.

## Local development

Install dependencies:

```bash
npm install
```

Start the app:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

## Verification commands

These all pass in the current implementation:

```bash
npm run test
npm run lint
npm run build
```

## Key files to read first

- `src/app/page.tsx`
- `src/components/studio-form.tsx`
- `src/components/review-client.tsx`
- `src/lib/agents.ts`
- `src/lib/draft-store.ts`
- `src/lib/summary.ts`

## Current implementation notes

- The project is usable without external infra because it has local fallbacks for drafts, uploads, and AI output.
- The review page supports sharing via generated links, not direct OAuth posting.
- Evidence is attached per draft item and can be marked verified in the UI.
- URL summarization is more complete than PDF summarization unless the external Python service is configured.

## Recommended next step

If you want the PDF summarizer to be production-ready, the next practical task is to create the separate Python microservice that:

- extracts PDF text with PyMuPDF
- chunks content into 3,000-token windows with overlap
- runs map-reduce summarization
- returns a `summary` or `outputMarkdown` payload from `POST /summarize`

