---
name: brand-guidelines
description: Applies a brand's identity (colors, typography, logo, tone, imagery) consistently to any visual or written deliverable. In E-COM STUDIO IA, always use the CLIENT'S brand from the project (Project Brain, identity board, BRAND_RULES) — never Anthropic's look-and-feel unless the work is explicitly for Anthropic. Use it when brand colors, typography, style guidelines, visual formatting or brand consistency apply (ads, posts, banners, visuals, store sections).
license: Complete terms in LICENSE.txt
---

<!--
Modified by E-COM STUDIO IA (2026-10): the original Anthropic skill (anthropics/skills, commit 0f8d899,
Apache License 2.0) applied Anthropic's own palette and fonts. This version adds "Client brand first" rules so the
method serves each client's brand; Anthropic's palette is kept below only as the original example. See NOTICE.md.
-->

# Brand Guidelines — client brand first

## E-COM STUDIO IA: which brand to apply

Every deliverable carries the brand of the **client project** being worked on, never Anthropic's:

1. **Source of truth**: the project's brand (Project Brain: name, palette, fonts, logo, tone, signature/tagline,
   validated "locks"), the identity board (`src/lib/media/identity-board.ts`, `BRAND_RULES`) and the brand
   cohesion guideline in `CLAUDE.md`. A locked (validated) element is never changed.
2. **Palette**: dark anchor + brand color + accent + two neutrals — 5 colors at most. Text keeps a contrast of
   4.5:1 or more; the brand color carries emphasis (button, key word, rule), never every element at once.
3. **Typography**: two families — headings and body — taken from the brand. Headings short and strong, body
   readable; no third typeface for decoration.
4. **Logo / symbol**: the symbol is the signature (seal, pattern, avatar, stationery). Never redrawn, recolored
   outside the palette, stretched or placed on a background that hides it (use the light version on dark).
5. **Imagery**: one consistent photographic line per brand (same light, materials, grading). Icons in a single
   line style. Air and soft shadows. Nothing invented on mockups (no fake reviews, numbers, certifications).
6. **Tone**: the brand's personality and vocabulary; facts only from the project. A missing fact is written
   "[À compléter : …]" in editable text, never printed on an image.
7. **Missing brand element**: derive it from what exists (logo colors, product photo) and flag it; do not
   fall back to the example palette below.

## Smart application (method of the original skill, generalized)

- Headings in the brand heading font (large sizes), body text in the brand body font; system fallbacks only if
  the brand font is unavailable (sans-serif for headings, serif or sans for body depending on the brand).
- Text color chosen from the background (light text on dark brand fields, dark text on light neutrals).
- Non-text shapes use the brand accent colors, sparingly and consistently from one deliverable to the next.
- Preserve hierarchy: one dominant message, one supporting line, one call to action.

## Original example — Anthropic's own brand (only for Anthropic-branded work)

Kept from the original skill for reference. **Do not apply to client projects.**

- Dark `#141413`, Light `#faf9f5`, Mid Gray `#b0aea5`, Light Gray `#e8e6dc`
- Accents: Orange `#d97757`, Blue `#6a9bcc`, Green `#788c5d`
- Headings: Poppins (Arial fallback); body: Lora (Georgia fallback)
