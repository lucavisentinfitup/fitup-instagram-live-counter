# FitUP Instagram Live Counter

Webapp interna FitUP per visualizzare un live counter dei follower Instagram.

## Obiettivo

Replicare il widget follower counter mostrato nello screenshot di riferimento, con branding FitUP e aggiornamento automatico del numero follower tramite backend interno.

## MVP

- Widget follower counter centrato
- Numero grande con animazione soft
- Profilo Instagram configurabile
- API backend `/api/followers`
- Dato mock iniziale per sviluppo locale
- Struttura pronta per integrazione Instagram Graph API o fonte dati controllata

## Struttura

```txt
apps/
  web/      Frontend React + Vite
  api/      Backend Node.js + Express
packages/
  shared/   Utility condivise
  ui/       Componenti UI riutilizzabili
docs/       Documentazione tecnica
```

## Avvio rapido

```bash
npm install
npm run dev
```

## Sicurezza

I token Instagram o eventuali token di servizi terzi non devono mai essere inseriti nel frontend. Tutte le chiamate esterne devono passare dal backend.
