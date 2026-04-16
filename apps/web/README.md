# apps/web

Phase 0 keeps the production dashboard running from the existing `airos/frontend`
Next.js app while the monorepo split lands around it.

This wrapper package exists so deployment, Docker, and CI can target `apps/web`
without duplicating the current frontend source tree. The commands proxy directly to
`airos/frontend`.
