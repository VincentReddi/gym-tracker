# KI-Coach – Cloudflare Worker (Setup)

Die KI-Wochenanalyse braucht einen API-Key, der **niemals in den Browser** darf.
Dieser kleine Worker hält den Key server-seitig und ruft Claude auf. Das Frontend
(GitHub Pages) spricht nur mit dem Worker.

## 1. Anthropic-API-Key besorgen
1. Konto anlegen bei **https://console.anthropic.com**
2. Etwas Guthaben aufladen (eine Analyse kostet grob **~1–2 Cent**).
3. **Wichtig – Kostenbremse:** unter *Settings → Limits* ein **Spend-Limit** setzen (z. B. 5 $/Monat).
4. Unter *API Keys* einen Key erstellen und kopieren (`sk-ant-...`).

## 2. Worker bei Cloudflare deployen (kostenlos)
Einfachster Weg über das Dashboard:
1. Konto anlegen bei **https://dash.cloudflare.com** → *Workers & Pages* → **Create → Worker**.
2. Namen vergeben (z. B. `gym-coach`), **Deploy**, dann **Edit code**.
3. Den kompletten Inhalt von [`worker.js`](worker.js) einfügen und **Deploy**.
4. **Secret setzen:** Worker → *Settings → Variables and Secrets* → **Add** →
   Name `ANTHROPIC_API_KEY`, Wert = dein Key → **Encrypt/Save & Deploy**.
5. Die URL kopieren, z. B. `https://gym-coach.DEINNAME.workers.dev`.

> Alternativ mit der CLI: `npm i -g wrangler` → `wrangler deploy worker.js` →
> `wrangler secret put ANTHROPIC_API_KEY`.

## 3. Frontend verbinden
In [`../src/coach.js`](../src/coach.js) ganz oben `AI_ENDPOINT` auf deine Worker-URL setzen:

```js
export const AI_ENDPOINT = 'https://gym-coach.DEINNAME.workers.dev';
```

Dann committen + pushen. Fertig – ab Sonntag (bei ≥ 2 Trainings) erscheint die Analyse.

## Alternative: Deno Deploy (oft einfacher als Cloudflare)
Kein CLI, kein Build – Code in den Browser einfügen, Secret setzen, fertig.
1. Anmelden bei **https://dash.deno.com** (mit GitHub).
2. **New Project → Playground** (bzw. „Empty Playground").
3. Den kompletten Inhalt von [`deno-deploy.js`](deno-deploy.js) einfügen.
4. Links/oben **Settings → Environment Variables**: `ANTHROPIC_API_KEY` = dein Key → **Save**.
5. **Save & Deploy** – die URL kopieren (`https://<name>.deno.dev`).
6. Diese URL in [`../src/coach.js`](../src/coach.js) bei `AI_ENDPOINT` eintragen.

> Eingebauter Debug-Check: ein `POST {"debug":true}` an die URL zeigt gefahrlos, ob der
> Key ankommt (Länge/Präfix), ohne den Key preiszugeben.

## Anpassen
- **Modell/Kosten:** in `worker.js` die Konstante `MODEL` ändern (z. B. `claude-sonnet-5`
  oder `claude-haiku-4-5` für günstiger).
- **Ton/Aufbau der Analyse:** den `SYSTEM_PROMPT` in `worker.js` anpassen.
