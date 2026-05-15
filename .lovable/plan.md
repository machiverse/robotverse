## RoboBook Blog Modernization

This plan upgrades the existing blog (stored in `community_posts` with `post_type='blog'`) without removing current functionality. All changes are additive.

### 1. Database (one migration)

Add SEO + publishing columns to `community_posts` (nullable, safe defaults). Existing rows continue to work.

- `slug text unique` (auto-generated from title if missing)
- `meta_title text`, `meta_description text`
- `focus_keywords text[]`, `seo_tags text[]`
- `featured_image text`, `featured_image_alt text`, `featured_image_caption text`
- `canonical_url text`
- `reading_time_minutes int`
- `scheduled_publish_at timestamptz`
- `is_draft boolean default false`
- DB function `generate_unique_slug(title text)` + trigger to auto-fill `slug` on insert/update when null
- DB function `calculate_reading_time(content text)` + trigger for `reading_time_minutes`
- Index on `slug`, `published_at`, `status`

### 2. Rich text editor

New `src/components/blog/BlogRichEditor.tsx` using **Tiptap** (already React-friendly, lightweight). Features:
- H1/H2/H3, bold, italic, underline, strike
- Bullet + numbered lists, blockquote
- Internal/external links with auto `rel="noopener"` for external
- Image insertion (drag-drop + paste) → uploads via existing Supabase storage, auto-compresses with `browser-image-compression`
- Video embed (YouTube/Vimeo URL → iframe block)
- Mobile preview toggle (desktop / tablet / mobile width frame)

Keep existing `RichTextEditor.tsx` untouched (used elsewhere).

### 3. BlogEditor page enhancements

`src/pages/BlogEditor.tsx` upgraded with:
- **SEO panel** (collapsible sidebar): meta title, meta description, focus keywords (chip input), SEO tags, URL slug (auto from title, editable), canonical URL
- **Featured image section**: drag-drop upload, auto-compress, ALT text, caption, file-name optimization (slugified before upload)
- **Social preview cards**: live Google SERP preview, LinkedIn card, Facebook card, Twitter card
- **Draft auto-save** every 20s to `is_draft=true`
- **Schedule publish** date-time picker → `scheduled_publish_at`
- **Reading-time** auto-calculated and shown
- Save/Publish/Schedule actions

### 4. BlogDetails page (public)

`src/pages/BlogDetails.tsx`:
- Add `<Helmet>` (already in project) tags: title, meta description, canonical, OG, Twitter
- Inject `Article` + `BreadcrumbList` JSON-LD schema
- Render featured image with `loading="lazy"`, `decoding="async"`, alt + caption
- Sticky social-share bar: LinkedIn, Facebook, Twitter/X, WhatsApp, Copy Link
- Author block (avatar, name, date, reading time, view count)
- Related blogs (same category/tags) at the bottom
- Slug-based routing: `/blog/:slug` (legacy `/blog/:id` still works via fallback lookup)

### 5. Blogs listing page

`src/pages/Blogs.tsx`:
- Search bar (title + content full-text)
- Category + tag filter chips
- Recent posts sidebar
- Modern card layout with featured image, reading time, view count, publish date, author
- Lazy-loaded images, responsive grid

### 6. Sitemap

Existing sitemap generator (or `SitemapXML.tsx` route) extended to pull all published blog slugs and emit `/blog/{slug}` entries with `lastmod`. Triggered on every build (existing `predev`/`prebuild`) and dynamically served.

### 7. Social sharing

New `src/components/blog/BlogShareBar.tsx` with native share-intent URLs (no SDKs) for LinkedIn, Facebook, Twitter, WhatsApp + clipboard copy with toast.

### 8. Design

Industrial aesthetic using existing semantic tokens (no new colors). Large readable serif headings (existing font tokens), generous spacing, white surface cards, subtle borders. Fully responsive (sm/md/lg/xl).

### 9. Files

**New:**
- `supabase/migrations/<ts>_blog_seo.sql`
- `src/components/blog/BlogRichEditor.tsx`
- `src/components/blog/BlogSEOPanel.tsx`
- `src/components/blog/BlogSocialPreview.tsx`
- `src/components/blog/BlogShareBar.tsx`
- `src/components/blog/FeaturedImageUpload.tsx`
- `src/components/blog/BlogPreviewFrame.tsx` (mobile/tablet/desktop preview)
- `src/utils/blogSeo.ts` (slug, reading time, schema helpers)

**Edited:**
- `src/pages/BlogEditor.tsx` — wire new components, auto-save, schedule
- `src/pages/BlogDetails.tsx` — Helmet, schema, share bar, related posts, slug routing
- `src/pages/Blogs.tsx` — search/filter/sidebar, modern cards
- `src/App.tsx` — add `/blog/:slug` route alongside existing
- `scripts/generate-sitemap.ts` (or create if absent) — include blog slugs

**Dependencies added:** `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-link`, `@tiptap/extension-image`, `@tiptap/extension-youtube`, `browser-image-compression`, `react-helmet-async` (if not already installed).

### Out of scope (future, as user noted)
AI blog generation, multi-language, automated cross-posting — schema leaves room (`focus_keywords`, `seo_tags`, draft/schedule) but no implementation in this pass.

---

This is a large change set spanning DB + ~10 files. After approval I'll create the migration first, then implement the components and page upgrades in batches.