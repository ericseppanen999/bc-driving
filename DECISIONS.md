# Decisions

1. Provider adapters return normalized internal models only; raw payloads are preserved on the model for debugging.
2. The app uses in-memory cache and lightweight in-memory rate limiting to stay deployable on Vercel without extra infrastructure.
3. Local fixture data is used as a final fallback so the app remains usable in offline or restricted-network environments.
