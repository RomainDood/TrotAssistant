// Pont WhatsApp -> zeroclaw, via la BIBLIOTHÈQUE open-wa (create()).
// On évite l'EASY API CLI d'open-wa (buggée en 4.76.0 : crash à la génération du Swagger).
// Flux : message WhatsApp -> POST /webhook zeroclaw {message} -> {response} -> sendText().
//
// Lancement : node --env-file=.env openwa/bridge.mjs   (ou ./scripts/start-openwa.sh)
import { create } from '@open-wa/wa-automate';

const {
  ZEROCLAW_WEBHOOK = 'http://127.0.0.1:42617/webhook',
  ZEROCLAW_BEARER = '',
  ALLOWED_NUMBERS = '',
  // Mode navigateur : visible par défaut (fiable pour scanner le QR sur un Mac).
  // Mets OPENWA_HEADLESS=true une fois la session enregistrée, ou sur un serveur sans écran.
  OPENWA_HEADLESS = 'false',
} = process.env;

const allow = ALLOWED_NUMBERS.split(',').map((s) => s.trim()).filter(Boolean);

create({
  sessionId: 'trotassistant',
  headless: OPENWA_HEADLESS === 'true',
  useChrome: true,
  qrTimeout: 0,
  authTimeout: 0,
  cacheEnabled: false,
  sessionDataPath: './data',
  disableSpins: true,
})
  .then(start)
  .catch((e) => {
    console.error('Échec du lancement open-wa:', e);
    process.exit(1);
  });

async function start(client) {
  console.log('✅ WhatsApp connecté. En écoute des messages…');
  if (allow.length) console.log('Filtre ALLOWED_NUMBERS actif:', allow.join(', '));

  client.onMessage(async (message) => {
    try {
      if (message.isGroupMsg) return;
      const from = message.from; // ex: 33612345678@c.us
      const number = from.replace(/@c\.us$/, '');
      if (allow.length && !allow.includes(number)) return;

      const body = (message.body || '').trim();
      if (!body) return;

      console.log(`← ${number}: ${body}`);

      const res = await fetch(ZEROCLAW_WEBHOOK, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(ZEROCLAW_BEARER ? { Authorization: `Bearer ${ZEROCLAW_BEARER}` } : {}),
        },
        body: JSON.stringify({ message: body }),
      });

      if (!res.ok) {
        console.error(`zeroclaw /webhook HTTP ${res.status}`);
        return;
      }
      const data = await res.json().catch(() => ({}));
      const reply = data.response || data.reply || '';
      if (reply) {
        await client.sendText(from, reply);
        console.log(`→ ${number}: ${reply.slice(0, 80)}`);
      }
    } catch (err) {
      console.error('Erreur bridge:', err);
    }
  });
}
