# 🏋️ Gym Tracker

Eine schlanke Web-App zum Tracken von Krafttraining: Übungen anlegen, Workouts
mit Sätzen/Gewicht/Wiederholungen loggen, Fortschritt in Charts sehen und die
Trainingsaktivität als Heatmap. Läuft komplett im Browser, ohne Build-Schritt,
und synchronisiert optional über einen privaten GitHub-Gist.

![Deploy](https://github.com/VincentReddi/gym-tracker/actions/workflows/static.yml/badge.svg)
![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)
![Vanilla JS](https://img.shields.io/badge/vanilla-JS-f7df1e.svg)
![No build step](https://img.shields.io/badge/build-none-brightgreen.svg)

## Features

- **Dashboard** – Aktivitäts-Heatmap, Monatskennzahlen (Trainings, Volumen, Übungen) und Fortschritts-Chart pro Übung
- **Übungen** – nach Muskelgruppe gruppiert; Löschen entfernt **kaskadierend** auch die zugehörigen Einträge (mit Bestätigung)
- **Loggen** – Workout mit beliebig vielen Sätzen (Gewicht × Wiederholungen) erfassen; die Werte der letzten Einheit werden automatisch vorausgefüllt
- **Verlauf** – komplette Historie, nach Übung filterbar, einzeln löschbar
- **Fortschritt** – Linien-Chart (Max-Gewicht oder Gesamtvolumen) inkl. Bestleistung, Durchschnitt und Trend
- **Multi-Device-Sync** – über einen privaten GitHub-Gist, mit konfliktfreiem **Merge** (kein Datenverlust bei parallelen Geräten)

## Live-Demo

👉 **https://vincentreddi.github.io/gym-tracker/**

## Tech-Stack

- **Vanilla JavaScript** (ES-Module, kein Framework, kein Bundler)
- **[Chart.js](https://www.chartjs.org/)** für die Diagramme (per CDN)
- **localStorage** als lokaler Cache + **GitHub Gists** als Sync-Backend
- **Web Crypto** (SHA-256) für das Login
- Deployment über **GitHub Pages** (GitHub Actions)

## Projektstruktur

```text
gym-tracker/
├── index.html                 # Nur Markup – keine Logik, keine Inline-Handler
├── styles.css                 # Gesamtes Styling
├── src/
│   ├── main.js                # Einstiegspunkt: Event-Verdrahtung + Tab-Navigation
│   ├── state.js               # Zustand, localStorage, Merge & Tombstones
│   ├── sync.js                # Gist-Sync: Pull → Merge → entprellter Push
│   ├── auth.js                # Login/Aktivierung (SHA-256, kein Klartext)
│   ├── utils.js               # Datums-/HTML-Helfer, Toast
│   └── views/
│       ├── dashboard.js
│       ├── exercises.js
│       ├── log.js
│       ├── history.js
│       └── progress.js
└── .github/workflows/static.yml   # Auto-Deploy nach GitHub Pages
```

## Lokale Entwicklung

Weil die App ES-Module nutzt, muss sie über **HTTP** ausgeliefert werden
(`file://` funktioniert nicht). Ein beliebiger statischer Server genügt:

```bash
python -m http.server 5510
```

Danach http://localhost:5510 öffnen. Alternativ `npx serve` o. Ä.

## Daten & Synchronisation

Jeder Datensatz (Übung/Workout) trägt ein `updatedAt` und wird nie hart
gelöscht, sondern als **Tombstone** (`deleted: true`) markiert. Beim Sync wird
der Remote-Stand geholt und **pro Datensatz** zusammengeführt – das jüngste
`updatedAt` gewinnt. Dadurch gibt es keinen „last-write-wins"-Datenverlust,
wenn zwei Geräte parallel geändert haben, und eine Löschung bleibt bestehen.

## Sicherheit (ehrlich)

Dies ist eine **statische Seite ohne Server**. Das Login ist deshalb eine
Komfort-Hürde, kein echter Zugriffsschutz: Es liegen **keine Klartext-Passwörter**
mehr im Code (nur SHA-256-Hashes), aber ein clientseitiges Login lässt sich
technisch immer umgehen. Was die Daten tatsächlich schützt, ist der private
**GitHub-Token**. Für echte Authentifizierung bräuchte es ein Backend.

## Lizenz

[MIT](LICENSE)
