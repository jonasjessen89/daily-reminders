// Verschickt fällige Erinnerungen der Daily-App als Push-Benachrichtigung.
// Läuft alle ~5 Minuten per GitHub Actions (siehe .github/workflows/remind.yml).
//
// Benötigte Umgebungsvariablen (als GitHub Secrets):
//   FIREBASE_SERVICE_ACCOUNT  – kompletter Inhalt der Service-Account-JSON-Datei
//   OWNER_UID                 – deine Firebase-User-ID
//
// Probelauf gegen den lokalen Emulator (sendet nichts):
//   FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 DRY_RUN=1 OWNER_UID=… node send.mjs
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getMessaging } from 'firebase-admin/messaging'

const { FIREBASE_SERVICE_ACCOUNT, OWNER_UID, DRY_RUN } = process.env
if ((!FIREBASE_SERVICE_ACCOUNT && !DRY_RUN) || !OWNER_UID) {
  console.error('FIREBASE_SERVICE_ACCOUNT und OWNER_UID müssen gesetzt sein.')
  process.exit(1)
}

initializeApp(DRY_RUN ? { projectId: 'demo-daily' } : { credential: cert(JSON.parse(FIREBASE_SERVICE_ACCOUNT)) })
const db = getFirestore()
const messaging = getMessaging()
const user = db.doc(`users/${OWNER_UID}`)

// Nur Erinnerungen der letzten 24 Stunden – ältere wären ohnehin überholt.
const now = Date.now()
const snap = await user.collection('reminders').where('at', '<=', now).where('at', '>', now - 24 * 3600_000).get()
const due = snap.docs.filter((d) => {
  const r = d.data()
  return r.notify && !r.done && !r.sentAt
})
console.log(`${due.length} fällige Erinnerung(en)`)
if (due.length === 0) process.exit(0)

const devices = (await user.collection('devices').get()).docs
if (devices.length === 0) {
  console.log('Keine registrierten Geräte.')
  process.exit(0)
}
const tokens = devices.map((d) => d.data().token)

if (DRY_RUN) {
  for (const d of due) console.log(`[Probelauf] würde senden: „${d.data().title}“ an ${tokens.length} Gerät(e)`)
  process.exit(0)
}

const fmt = new Intl.DateTimeFormat('de-DE', { timeZone: 'Europe/Berlin', hour: '2-digit', minute: '2-digit' })
const dead = new Set()

for (const doc of due) {
  const r = doc.data()
  const res = await messaging.sendEachForMulticast({
    tokens,
    // Reine Daten-Nachricht – angezeigt wird sie vom Service Worker der App.
    data: { title: r.title, body: `Erinnerung · ${fmt.format(new Date(r.at))} Uhr`, url: '/erinnerungen', tag: doc.id },
    webpush: { headers: { Urgency: 'high', TTL: '3600' } },
  })
  res.responses.forEach((x, i) => {
    if (!x.success) {
      console.warn(`Gerät ${devices[i].data().label}: ${x.error?.code}`)
      if (['messaging/registration-token-not-registered', 'messaging/invalid-registration-token'].includes(x.error?.code)) dead.add(devices[i].ref)
    }
  })
  console.log(`„${r.title}“ → ${res.successCount}/${tokens.length} Geräte`)
  await doc.ref.update({ sentAt: Date.now() })
}

// Abgemeldete Geräte aufräumen
for (const ref of dead) await ref.delete()
