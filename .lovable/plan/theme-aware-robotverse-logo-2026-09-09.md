# Theme-aware RobotVerse logo

## What will change
- Add the uploaded navy-on-transparent and light-on-transparent artwork under the requested asset names.
- Create one reusable `BrandLogo` that swaps artwork through CSS dark-mode classes, preserves square sizing, and optionally adds the live RobotVerse wordmark.
- Replace logo markup in all site headers and the footer without changing links, navigation, authentication, or data behavior.
- Generate correctly sized favicon and Apple touch assets from the original white-background artwork.
- Keep the existing purpose-built social card and point stale social-image defaults to it; leave organization-logo schema references on the square brand artwork.
- Add the reusable brand navy token if missing.

## Verification
- Check TypeScript and scan for obsolete visual logo imports.
- Visually verify light and dark themes, refresh behavior, footer legibility, keyboard focus, and the 360px header layout.

## Technical details
- `BrandLogo` renders both imported Vite assets and uses `dark:hidden` / `dark:block`, avoiding theme state and first-paint mismatch.
- Header links retain their existing destinations and receive only presentation/accessibility classes.
- No PWA manifest will be added if the project has none; only existing icon surfaces will be updated.
