# daily-reminders

Kleiner Hilfs-Job für die **Daily**-App: Er prüft alle ~5 Minuten per GitHub Actions, ob Erinnerungen fällig sind, und schickt sie als Push-Benachrichtigung über Firebase Cloud Messaging an deine registrierten Geräte.

**Warum ein eigenes, öffentliches Repo?** Öffentliche Repos haben unbegrenzt kostenlose Actions-Minuten. Ein Job alle 5 Minuten würde das Kontingent eines privaten Repos (2.000 Min./Monat) sprengen. Hier liegt nur dieses Skript – keine Daten, keine Schlüssel.

## Einrichtung

1. In der Firebase-Konsole: **Projekteinstellungen → Dienstkonten → Neuen privaten Schlüssel generieren**. Es wird eine JSON-Datei heruntergeladen. **Diese Datei ist geheim** (Admin-Zugriff auf dein Projekt) – nie ins Repo legen, nicht verschicken.
2. In diesem Repo auf GitHub: **Settings → Secrets and variables → Actions → New repository secret**
   - `FIREBASE_SERVICE_ACCOUNT`: den kompletten Inhalt der JSON-Datei einfügen
   - `OWNER_UID`: deine Firebase-User-ID
3. Danach die JSON-Datei vom Rechner löschen.
4. Unter **Actions** den Workflow „Erinnerungen senden“ einmal per „Run workflow“ starten und das Log prüfen.

## Hinweise

- GitHub startet geplante Jobs nicht minutengenau – rechne mit 5–20 Minuten Verzögerung.
- Bei wiederkehrenden Erinnerungen kommt der nächste Push, sobald du die aktuelle in der App abhakst.
- Geräte, die sich abgemeldet haben, werden automatisch entfernt.
