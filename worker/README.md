# KI-Coach – Proxy (Setup)

Die KI-Wochenanalyse braucht einen API-Key, der **niemals in den Browser** darf.
Dieser kleine Proxy hält den Key server-seitig und ruft Claude auf. Das Frontend
(GitHub Pages) spricht nur mit dem Proxy.

Umgesetzt über **Deno Deploy** (kostenlos, kein Build, kein CLI). Der Code:
[`deno-deploy.js`](deno-deploy.js).

## 1. Anthropic-API-Key besorgen
1. Konto anlegen bei **https://console.anthropic.com**
2. Etwas Guthaben aufladen (eine Analyse kostet grob **~1–2 Cent**).
3. **Wichtig – Kostenbremse:** unter *Settings → Limits* ein **Spend-Limit** setzen (z. B. 5 $/Monat).
4. Unter *API Keys* einen Key erstellen (`sk-ant-api03-...`) und kopieren.

## 2. Deno Deploy einrichten
1. Anmelden bei **https://dash.deno.com** (mit GitHub).
2. **New Project → Playground** (leeres Playground).
3. Den kompletten Inhalt von [`deno-deploy.js`](deno-deploy.js) einfügen.
4. **Settings → Environment Variables:** Name `ANTHROPIC_API_KEY`, Value = dein Key → **Save**.
5. **Save & Deploy** → die URL kopieren (`https://<name>.deno.dev` bzw. `.deno.net`).

## 3. Frontend verbinden
In [`../src/coach.js`](../src/coach.js) oben `AI_ENDPOINT` auf die Proxy-URL setzen, dann committen + pushen:

```js
export const AI_ENDPOINT = 'https://DEIN-PROJEKT.deno.net';
```

Fertig – ab Sonntag (bei ≥ 2 Trainings) erscheint die Analyse.

## Nützliches
- **Debug-Check:** ein `POST {"debug":true}` an die URL zeigt gefahrlos, ob der Key ankommt
  (Länge/Präfix), ohne den Key preiszugeben.
- **Modell/Kosten:** in `deno-deploy.js` die Konstante `MODEL` ändern (z. B. `claude-sonnet-5`
  oder `claude-haiku-4-5` für günstiger).
- **Ton/Aufbau der Analyse:** den `SYSTEM_PROMPT` in `deno-deploy.js` anpassen.
- **Andere Plattform?** Die `fetch`-Logik ist Standard – lässt sich genauso auf Cloudflare
  Workers, Vercel oder Val Town betreiben.
