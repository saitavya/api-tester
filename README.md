# API Tester

A browser-based API client — a lightweight, open-source alternative to Postman, built with React.

## Features

- 🚀 Send HTTP requests (GET, POST, PUT, PATCH, DELETE)
- 📦 Custom headers, query params, and JSON bodies
- 🎨 Pretty-printed JSON responses with color-coded status
- 💾 Auto-saved request history (persists across sessions)
- 📁 Named collections of saved requests
- 🌍 Environments with `{{variable}}` substitution
- 🔒 Fully client-side — your data never leaves your browser

## Tech stack

- **React** + **Vite** for the UI
- **Tailwind CSS** for styling
- **Dexie.js** (IndexedDB wrapper) for persistence
- **No backend** — runs entirely in the browser

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:5173 in your browser.

## Roadmap

- [ ] CORS proxy for testing any API
- [ ] Pre-request and test scripts
- [ ] OAuth 2.0 helpers
- [ ] Postman collection import/export
- [ ] GraphQL support
- [ ] Team sync

## Why I built this

I wanted to deeply understand what powers tools like Postman — HTTP internals, browser
storage, React state management, and developer-tooling UX. This project covers all of
that and more.
