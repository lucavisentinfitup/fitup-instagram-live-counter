# FitUP Instagram Live Counter

Webapp interna FitUP per visualizzare un live counter dei follower Instagram.

## Obiettivo

Replicare il widget follower counter mostrato nello screenshot di riferimento, con branding FitUP e aggiornamento automatico del numero follower tramite backend interno.

## MVP

- Widget follower counter centrato
- Numero grande con animazione soft
- Profilo Instagram configurabile
- API backend `/api/followers` sull'**Instagram Graph API ufficiale** (niente scraping, niente numeri inventati)
- `?username=fitup_<club>` per gli account dei club (business discovery, solo account `fitup*`)
- `?demografia=1` genere ed età aggregati dei follower per gli account gestiti dal Business Manager FitUP
- Usata anche dal FitUP Dashboard Controller (Club Rate, Affollamento, schermo per le fiere)

## Configurazione su Vercel

Settings → Environment Variables (vedi `.env.example`):

- `INSTAGRAM_ACCESS_TOKEN`: token di lunga durata di un utente di sistema del Business Manager, con i permessi
  `instagram_basic`, `instagram_manage_insights`, `pages_show_list`, `pages_read_engagement`, `business_management`
- `INSTAGRAM_USER_ID`: ID dell'account Instagram Business di fitup.it

Senza queste due variabili l'API risponde `syncStatus: "not_configured"` e la pagina mostra "—".

## Struttura

```txt
apps/
  web/      Frontend React + Vite
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
