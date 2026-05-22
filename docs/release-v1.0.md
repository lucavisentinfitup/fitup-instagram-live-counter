# Release stabile v1.0

Data: 2026-05-22

Commit stabile di riferimento: 07bfaad729a6ed8de0bf97a7fd68695a51dda010

## Stato operativo

Questa versione e' considerata stabile lato operativo per il live counter Instagram FitUP.

## Funzioni incluse

- Frontend React e Vite responsive
- Layout ottimizzato mobile, tablet e monitor
- Endpoint serverless per followers
- Lettura follower da endpoint JSON configurabile tramite variabile ambiente
- Refresh frontend ogni secondo
- Animazione odometer fluida
- Evidenza verde solo su incremento follower
- Decremento follower neutro senza rosso
- Cache backend anti ban
- Fallback intelligente
- Badge Live Source per sorgente reale o cache valida

## Variabili ambiente richieste

- STATS_API_URL
- CACHE_TTL_SECONDS
- FALLBACK_FOLLOWERS

## Note

Per ripristinare questa versione, tornare al commit indicato sopra o usare questo documento come riferimento della release stabile.
