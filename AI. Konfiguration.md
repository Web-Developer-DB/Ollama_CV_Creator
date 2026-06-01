# AI Konfiguration

Diese Datei beschreibt, wie das AI-Modul des Ollama CV Creator konfiguriert wird, welche Betriebsarten unterstützt werden und wo die relevanten Daten gespeichert werden.

## Kurzüberblick

Die App nutzt Ollama fuer alle LLM-Funktionen:

- Profil aus Kandidatentext extrahieren
- Stellenbeschreibung analysieren
- Allgemeinen CV erstellen
- Angepassten CV erstellen
- Allgemeines Anschreiben erstellen
- Angepasstes Anschreiben erstellen
- AI Status, Modell-Auswahl und Modell-Steuerung anzeigen

Die App verwendet Ollamas `/api/generate` Endpoint mit:

- `stream: false`
- `format: "json"`
- `think: false`
- `options.num_ctx` aus den AI Runtime Settings
- `options.temperature` aus dem jeweiligen Prompt

## Empfohlene Entwicklungs-Konfiguration

Fuer die Entwicklungsphase ist ein groesseres Cloud-Modell sinnvoll, damit JSON-, Prompt- und Workflow-Probleme nicht durch zu kleine lokale Modelle verdeckt werden.

Empfohlen:

```bash
ollama signin
ollama pull gpt-oss:120b-cloud
```

Danach in der App:

1. `AI Status` oeffnen.
2. `gpt-oss:120b-cloud` auswaehlen.
3. Kontextfenster auf `Gross` oder `Maximal` stellen.
4. Timeout auf `Lang` oder `Erweitert` stellen.
5. Dokumenterstellung erneut testen.

Diese Variante nutzt weiterhin den lokalen Ollama-Host `http://127.0.0.1:11434`. Ollama authentifiziert Cloud-Zugriffe intern ueber `ollama signin`.

## Betriebsarten

### 1. Lokale Ollama-Modelle

Standard ohne weitere ENV-Konfiguration:

```bash
OLLAMA_BASE_URL=http://127.0.0.1:11434
```

Wenn `OLLAMA_BASE_URL` nicht gesetzt ist, nutzt die App automatisch:

```text
http://127.0.0.1:11434
```

Typischer Ablauf:

```bash
ollama pull granite4.1:3b-q6_K
ollama run granite4.1:3b-q6_K
```

Oder in der App:

1. `AI Status` oeffnen.
2. Modell auswaehlen.
3. `Connect` klicken.
4. Warten, bis `Connected` angezeigt wird.

Lokale Modelle muessen geladen sein. Die App prueft dafuer:

- `/api/tags`: installierte Modelle
- `/api/ps`: aktuell geladene Modelle

### 2. Ollama Cloud ueber lokalen Ollama-Host

Diese Variante ist fuer Entwicklung aktuell am bequemsten.

Konfiguration:

```bash
ollama signin
ollama pull gpt-oss:120b-cloud
```

App-Konfiguration:

```bash
OLLAMA_BASE_URL=http://127.0.0.1:11434
```

Oder `OLLAMA_BASE_URL` einfach nicht setzen.

Vorteile:

- Kein API-Key in der App-Konfiguration erforderlich.
- Die App spricht weiter mit dem lokalen Ollama API.
- Ollama kuemmert sich um Cloud-Authentifizierung.
- Cloud-Modelle erscheinen wie normale Modelle in `/api/tags`.

Modellnamen enden typischerweise auf:

```text
-cloud
```

Beispiel:

```text
gpt-oss:120b-cloud
```

Die App markiert solche Modelle in `AI Status` als Cloud-Modell.

### 3. Direkte Ollama Cloud API

Die App unterstuetzt auch direkte Requests an `https://ollama.com/api`.

Erstelle zuerst einen API-Key in den Ollama Account Settings. Danach eine lokale `.env.local` im Projekt-Hauptverzeichnis anlegen:

```bash
OLLAMA_BASE_URL=https://ollama.com/api
OLLAMA_API_KEY=dein_api_key
OLLAMA_TIMEOUT_MS=600000
```

Wichtig:

- `OLLAMA_API_KEY` niemals committen.
- `.env.local` bleibt lokal.
- Nach Aenderungen an `.env.local` den Dev-Server neu starten.
- Die App normalisiert `https://ollama.com/api` intern zu `https://ollama.com`, ruft aber weiterhin `/api/tags` und `/api/generate` korrekt auf.
- Der Authorization Header wird nur an Ollama-Cloud-Hosts gesendet.

Bei direkter Cloud API gibt es kein lokales geladenes Modell ueber `/api/ps`. Die App behandelt verfuegbare Cloud-Modelle deshalb als bereit, wenn sie in `/api/tags` vorhanden sind.

Beispiel-Test:

```bash
export OLLAMA_API_KEY=dein_api_key

curl https://ollama.com/api/tags \
  -H "Authorization: Bearer $OLLAMA_API_KEY"
```

Generate-Test:

```bash
curl https://ollama.com/api/generate \
  -H "Authorization: Bearer $OLLAMA_API_KEY" \
  -d '{
    "model": "gpt-oss:120b",
    "prompt": "Return JSON with ok true.",
    "stream": false
  }'
```

## Umgebungsvariablen

### `OLLAMA_BASE_URL`

Setzt den Ollama Host.

Standard:

```text
http://127.0.0.1:11434
```

Lokale Beispiele:

```bash
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_BASE_URL=http://localhost:11434
```

Direkte Cloud API:

```bash
OLLAMA_BASE_URL=https://ollama.com/api
```

Die App entfernt ein abschliessendes `/api` automatisch.

### `OLLAMA_API_KEY`

Nur fuer direkte Cloud API ueber `https://ollama.com/api`.

```bash
OLLAMA_API_KEY=dein_api_key
```

Die App sendet den Key als:

```text
Authorization: Bearer <key>
```

Der Header wird nur gesetzt, wenn der Host `ollama.com` oder eine Subdomain von `ollama.com` ist.

### `OLLAMA_TIMEOUT_MS`

Serverseitiges Standard-Timeout fuer Ollama Requests.

Standard:

```text
180000
```

Das entspricht 3 Minuten.

Beispiele:

```bash
OLLAMA_TIMEOUT_MS=300000
OLLAMA_TIMEOUT_MS=600000
```

In der UI koennen zusaetzlich Runtime-Presets gesetzt werden. Diese werden pro Anfrage mitgeschickt und koennen das ENV-Timeout fuer Generationen uebersteuern.

## AI Runtime Settings in der App

Die Seite `AI Status` speichert zwei Runtime-Einstellungen im Browser/Electron Renderer.

### Kontextfenster

Presets:

| Preset | Wert | Empfehlung |
| --- | ---: | --- |
| Kompakt | 4096 | Kurze Profile |
| Standard | 8192 | Empfohlen |
| Gross | 16384 | Lange Profile |
| Maximal | 32768 | Cloud oder starke Rechner |

Dieses Setting wird als Ollama Option gesendet:

```json
{
  "options": {
    "num_ctx": 8192
  }
}
```

### Timeout

Presets:

| Preset | Wert | Bedeutung |
| --- | ---: | --- |
| Standard | 180000 | 3 Minuten |
| Lang | 300000 | 5 Minuten |
| Erweitert | 600000 | 10 Minuten |

Fuer grosse Cloud-Modelle oder lange Profile ist `Lang` oder `Erweitert` sinnvoll.

## Wo werden Daten gespeichert?

### Projekt- und Profildaten in Electron

Im Desktop-Modus speichert die App Projekte in einer JSON-Datei unter Electron `userData`.

Datei:

```text
projects.json
```

Linux-Beispiel:

```text
~/.config/ollama-cv-creator/projects.json
```

Diese Datei enthaelt:

- Rohtext/Kandidatentext
- extrahiertes Kandidatenprofil
- Job-Zielrolle
- Job-Analyse
- generierte CVs
- generierte Anschreiben
- Design-/Template-Auswahl
- Export-Historie

Die Datei ist lokal und sollte nicht in Git committed werden.

### Browser-Fallback Storage

Wenn die App ohne Electron laeuft, nutzt sie IndexedDB.

IndexedDB:

```text
Database: ollama-cv-creator
Object store: projects
Index: by-updated-at
```

### Ausgewaehltes Modell

Das aktuell ausgewaehlte Modell wird in `localStorage` gespeichert.

Key:

```text
ollama-cv-selected-model
```

Beispielwert:

```text
gpt-oss:120b-cloud
```

### Runtime Settings

Kontextfenster und Timeout werden ebenfalls in `localStorage` gespeichert.

Key:

```text
ollama-cv-runtime-settings
```

Beispielwert:

```json
{
  "contextWindow": 16384,
  "timeoutMs": 300000
}
```

### API-Key

Der API-Key wird nicht in der App-UI gespeichert.

Fuer direkte Ollama Cloud API sitzt er in der lokalen Umgebung:

```bash
OLLAMA_API_KEY=...
```

Empfohlener Ort in der Entwicklung:

```text
.env.local
```

Diese Datei darf nicht committed werden.

## LLM-Routen der App

Alle LLM-Routen nutzen das ausgewaehlte Modell und die Runtime Settings.

| Route | Zweck |
| --- | --- |
| `/api/ai/status` | Ollama Status, Modelle, geladene Modelle |
| `/api/ai/model-control` | Modell laden/entladen |
| `/api/ai/extract-profile` | Kandidatenprofil aus Rohtext extrahieren |
| `/api/ai/analyze-job` | Stellenbeschreibung analysieren |
| `/api/ai/generate-cv` | CV generieren |
| `/api/ai/generate-cover-letter` | Anschreiben generieren |

Im Electron-Modus ruft der Renderer zuerst den Desktop IPC Bridge auf. Der Bridge validiert die Daten und proxyt dann an die Next API Routes.

## Empfohlene Konfigurationen

### Entwicklung mit Cloud-Modell ueber lokalen Ollama-Host

```bash
ollama signin
ollama pull gpt-oss:120b-cloud
npm run dev:electron
```

AI Status:

```text
Modell: gpt-oss:120b-cloud
Context window: Gross oder Maximal
AI timeout: Lang oder Erweitert
```

### Entwicklung mit direkter Ollama Cloud API

`.env.local`:

```bash
OLLAMA_BASE_URL=https://ollama.com/api
OLLAMA_API_KEY=dein_api_key
OLLAMA_TIMEOUT_MS=600000
```

Danach:

```bash
npm run dev:electron
```

AI Status:

```text
Modell: gpt-oss:120b
Context window: Gross oder Maximal
AI timeout: Erweitert
```

### Lokale Modelltests

```bash
ollama pull granite4.1:3b-q6_K
npm run dev:electron
```

AI Status:

```text
Modell: granite4.1:3b-q6_K
Context window: Standard oder Gross
AI timeout: Lang
```

Wenn kleine lokale Modelle unzuverlaessige JSON-Ausgaben liefern, zuerst mit Cloud-Modell testen. Wenn der Workflow mit Cloud stabil ist, danach kleinere lokale Modelle optimieren.

## Fehlermeldungen und Bedeutung

| Fehler | Bedeutung | Naechster Schritt |
| --- | --- | --- |
| `AI_MODEL_NOT_READY` | Kein passendes Modell ist geladen oder verfuegbar | AI Status oeffnen, Modell auswaehlen/laden |
| `AI_TIMEOUT` | Anfrage hat zu lange gedauert | Timeout erhoehen, Cloud-Modell nutzen, Prompt/Profil kuerzen |
| `INVALID_AI_JSON` | Ollama hat keine parsebare JSON-Antwort geliefert | Staerkeres Modell, groesseres Kontextfenster |
| `SCHEMA_VALIDATION_FAILED` | JSON war parsebar, passt aber nicht zum erwarteten App-Schema | Cloud-Modell oder groesseres Kontextfenster nutzen |
| `HALLUCINATION_DETECTED` | Modell hat Fakten/Skills erzeugt, die nicht im Profil stehen | Profil pruefen oder generierten Inhalt korrigieren |
| `OLLAMA_UNAVAILABLE` | Ollama oder Cloud-API nicht erreichbar | Host, API-Key, Internet, Ollama-Prozess pruefen |

Ollama-Fehler im Format:

```json
{
  "error": "rate limit exceeded"
}
```

werden von der App ausgelesen und in Status/Fehlermeldungen angezeigt.

## Kontextfenster-Probleme erkennen

Ein zu kleines Kontextfenster zeigt sich oft indirekt:

- Modell ignoriert Teile des Profils.
- JSON bricht ab oder ist unvollstaendig.
- Skills oder Stationen fehlen.
- Schema passt nicht.
- Generierung laeuft sehr lange.

Dann:

1. Kontextfenster auf `Gross` oder `Maximal` stellen.
2. Timeout auf `Lang` oder `Erweitert` stellen.
3. Cloud-Modell verwenden.
4. Kandidatenprofil pruefen und sehr lange irrelevante Rohdaten entfernen.

## Sicherheit

- Keine API-Keys in Git committen.
- Keine sensiblen CV-Daten in Logs kopieren.
- `projects.json` enthaelt personenbezogene Daten.
- Exportierte JSON-Dateien enthalten ebenfalls personenbezogene Daten.
- Direkte Cloud-API sendet Profil- und Dokumentdaten an Ollama Cloud.
- Lokale Modelle und lokale Cloud-Proxy-Nutzung ueber `ollama signin` sollten bewusst gewaehlt werden, je nachdem ob Daten lokal bleiben muessen.

## Schnelltest

Lokaler Status:

```bash
curl http://127.0.0.1:11434/api/tags
```

Geladene lokale Modelle:

```bash
curl http://127.0.0.1:11434/api/ps
```

Lokale Generierung:

```bash
curl http://127.0.0.1:11434/api/generate -d '{
  "model": "gpt-oss:120b-cloud",
  "prompt": "Return a JSON object with ok true.",
  "stream": false,
  "format": "json"
}'
```

Direkte Cloud Tags:

```bash
curl https://ollama.com/api/tags \
  -H "Authorization: Bearer $OLLAMA_API_KEY"
```

Direkte Cloud Generierung:

```bash
curl https://ollama.com/api/generate \
  -H "Authorization: Bearer $OLLAMA_API_KEY" \
  -d '{
    "model": "gpt-oss:120b",
    "prompt": "Return a JSON object with ok true.",
    "stream": false,
    "format": "json"
  }'
```

## Empfohlener Debug-Ablauf

1. In `AI Status` pruefen, ob die App den Host erreicht.
2. Pruefen, welches Modell ausgewaehlt ist.
3. Kontextfenster auf `Gross` stellen.
4. Timeout auf `Lang` stellen.
5. Profil-Extraktion testen.
6. Allgemeines CV testen.
7. Allgemeines Anschreiben testen.
8. Zielrolle hinzufuegen.
9. Angepassten CV und angepasstes Anschreiben testen.
10. Wenn Cloud funktioniert, danach kleinere lokale Modelle testen.

So lassen sich Modellprobleme, Kontextprobleme und App-Logik sauber voneinander trennen.
