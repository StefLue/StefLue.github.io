# Euclidean Analytics — website

A small static site: one landing page plus two standalone legal sub-pages, sharing a single stylesheet. No build step, no dependencies beyond Google Fonts via CDN.

```
index.html     the one-pager (hero, services, founder, capabilities, method, projects, contact)
imprint.html   Impressum, linked only from the footer
privacy.html   Datenschutzerklärung, linked only from the footer
style.css      shared styles for all three pages
```

The imprint and privacy pages are intentionally **not** part of the one-pager or the burger menu — they're only reachable via the footer links, as separate pages.

## Host on GitHub Pages
1. Create a new GitHub repo (or use an existing one).
2. Add all four files (`index.html`, `imprint.html`, `privacy.html`, `style.css`) to the repo root.
3. Go to **Settings → Pages**, set source to the `main` branch, root folder.
4. Your site will be live at `https://<username>.github.io/<repo>/` within a minute or two.

## Before going live
- Replace the placeholder founder name/initials, email address (`hello@euclideananalytics.example`), and location in the nav panel footer.
- The contact form doesn't submit anywhere yet — wire it to Formspree, a mailto link, or a serverless function (see the note under the form).
- Swap the reference-project figures for real, approved client outcomes once you have them; the current ones are illustrative placeholders.
- Fill in **`imprint.html`** with your real company name/legal form, address, register details, and VAT ID — every `[bracketed]` field is a placeholder. This is a structural template for the German TMG/MStV-mandated legal notice, not legal advice; have it reviewed by a lawyer, especially the register entry and § 18 MStV content-responsibility fields, which depend on your exact legal form.
- Fill in **`privacy.html`** with your real controller details and supervisory authority. It already discloses GitHub Pages hosting (incl. the US data transfer) and Google Fonts as required sub-processors/third parties under GDPR — if you self-host the fonts or move off GitHub Pages, update that section accordingly. Same caveat: template, not legal advice, and German site operators typically need this in German as well.
- Optional: add a `favicon.ico` and an Open Graph image for link previews.

## Editing
Sections within `index.html` are marked with HTML comments (`<!-- HERO -->`, `<!-- CASE STUDIES -->`, etc.) so you can find and edit each part directly. All visual styling lives in `style.css` and is shared across all three pages — edit it once, it applies everywhere.
