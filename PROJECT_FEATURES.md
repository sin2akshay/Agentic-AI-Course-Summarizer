# EAG v3: Agentic AI Course Summarizer — Feature Reference

**Project Name:** EAG v3 Dashboard  
**Framework:** Angular 21 (Standalone Components)  
**Core Objective:** Transform raw YouTube transcriptions into structured, navigable, and persistent educational dashboards using the Gemini API.

---

### 1. AI-Driven Generation Architecture

- **Live-Process HUD**: Integrated Admin Interface for real-time session generation from transcripts directly in the browser — no terminal scripts required.
- **Processing State UI**: While Gemini is working, the form is replaced with an animated processing screen showing each pipeline step (Reading Transcript → Synthesising Structure → Extracting Questions), so users always know generation is in progress.
- **Gemini 2.5 Flash Integration**: Uses `@google/genai` with `gemini-2.5-flash` as the default model — best price/quality balance for structured extraction. Model is user-selectable from the HUD dropdown.
- **Schema-Driven Prompting**: `GeminiService` sends a strict JSON schema (`responseJsonSchema`) alongside a system instruction, enforcing exact output shape without relying on string parsing.
- **Deterministic Output**: `temperature: 0` ensures near-identical output for the same transcript across runs, useful for reproducible session regeneration.
- **Full Transcript Support**: No character limit — the full transcript is sent to the model. `gemini-2.5-flash` supports a 1M token context window.
- **Automatic Technical Depth Scoring**: Questions in the Q&A forum are rated 1–5 stars on load using an algorithmic keyword scorer, not by the model.

### 2. Scalable Data Infrastructure

- **Master Syllabus Service**: Single source of truth for all 19 course sessions. Adding or unlocking a session is one metadata change.
- **Auto-Unlock on JSON Load**: When a session's JSON file is found in `public/data/`, the sidebar lock clears automatically — no manual syllabus update needed.
- **Persistent JSON Store**: All content is stored as static JSON assets in `public/data/`, giving 100% persistence without a database or backend.
- **Video URL in JSON**: Each generated JSON embeds the YouTube URL entered during generation. On load, `videoUrl` from the JSON takes precedence over the syllabus hardcode, so dropping a file is sufficient to wire up the whole session including the video.
- **Dynamic Routing**: ID-based routing asynchronously fetches the correct session JSON on navigation.

### 3. High-End UI/UX Design

- **Edge-to-Edge Sidebar**: Premium navigation with neon active indicators, monospace session badges, and locked sessions rendered as non-tabbable for accessibility.
- **Interactive Timeline**: Clickable timestamped chapter list seeks the YouTube player to the exact second.
- **Floating Mini-Player**: Video automatically shrinks and floats to the corner via `IntersectionObserver` when the user scrolls past it.
- **Session Summary Panel**: Displays session overview, 6 instructor takeaways with numbered cards, and a stats bar (chapters, questions, estimated runtime).
- **Technical Q&A Forum**: Searchable, depth-filterable question list. Placeholder reflects actual question count from the loaded JSON, not hardcoded text.
- **Success State**: Post-generation banner with a glowing icon and prominent download CTA replaces the spinner once generation finishes.
- **Dark / Light Mode**: `ThemeService` persists theme preference across sessions.

### 4. Advanced Utility Features

- **Dynamic Search Placeholder**: Forum search input shows the real question count from the loaded session (e.g. "Search through 7 questions...").
- **Skip-to-Forum Control**: Keyboard-accessible button moves focus past the embedded iframe directly to the Q&A search input.
- **Estimated Runtime**: Computed from the furthest timestamp in the session data and displayed in the summary panel.
- **JSON Download**: Strips UI-only `rating` fields before export, keeping the persisted file clean.

### 5. Security

- `src/environments/environment.ts` is git-ignored; never committed.
- `environment.sample.ts` is the safe template for onboarding.
- API key should be restricted to allowed referrer origins in Google AI Studio for browser-based use.

### 6. Code Quality

- **Modular Services**: Decoupled `GeminiService`, `YoutubeService`, `SyllabusService`, `ThemeService`.
- **ChangeDetectionStrategy.OnPush** on all components.
- **Targeted Test Coverage**: Vitest tests cover syllabus grouping/unlock, YouTube ID parsing, and session helper filtering/runtime estimation.
- **Zero Unnecessary Dependencies**: Native Angular with minimal external libraries.

---

**Developed for the EAG v3 Agentic AI Cohort.**
