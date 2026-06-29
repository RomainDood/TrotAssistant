// Pont WhatsApp -> zeroclaw, via Baileys (WebSocket, SANS navigateur/Chromium).
// Idéal Raspberry Pi : léger, QR dans le terminal.
// Flux : message WhatsApp -> POST /webhook zeroclaw {message} -> {response} -> envoi.
//
// Lancement : node --env-file=.env openwa/bridge.mjs   (ou ./scripts/start-openwa.sh)
import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} from '@whiskeysockets/baileys';
import qrcode from 'qrcode-terminal';
import pino from 'pino';

const {
  ZEROCLAW_WEBHOOK = 'http://127.0.0.1:42617/webhook',
  ZEROCLAW_BEARER = '',
  ALLOWED_NUMBERS = '',
} = process.env;

const allow = ALLOWED_NUMBERS.split(',').map((s) => s.trim()).filter(Boolean);
const logger = pino({ level: 'silent' });

async function start() {
  const { state, saveCreds } = await useMultiFileAuthState('./data/baileys');
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({ version, auth: state, logger });
  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (u) => {
    const { connection, lastDisconnect, qr } = u;
    if (qr) {
      console.log('\n📲 Scanne ce QR (WhatsApp → Appareils connectés → Connecter un appareil) :\n');
      qrcode.generate(qr, { small: true });
    }
    if (connection === 'open') {
      console.log('✅ WhatsApp connecté. En écoute des messages…');
      if (allow.length) console.log('Filtre ALLOWED_NUMBERS:', allow.join(', '));
    }
    if (connection === 'close') {
      const code = lastDisconnect?.error?.output?.statusCode;
      if (code === DisconnectReason.loggedOut) {
        console.error('Déconnecté (loggedOut). Supprime ./data et relance pour re-scanner.');
        process.exit(1);
      }
      console.log('Connexion fermée, reconnexion…');
      start();
    }
  });

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;
    for (const m of messages) {
      try {
        if (m.key.fromMe) continue;
        const jid = m.key.remoteJid || '';
        if (jid.endsWith('@g.us') || jid === 'status@broadcast') continue; // ignore groupes/statuts
        const number = jid.split('@')[0];
        if (allow.length && !allow.includes(number)) continue;

        const text =
          m.message?.conversation ||
          m.message?.extendedTextMessage?.text ||
          '';
        if (!text.trim()) continue;

        console.log(`← ${number}: ${text}`);
        await sock.sendPresenceUpdate('composing', jid);

        const res = await fetch(ZEROCLAW_WEBHOOK, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(ZEROCLAW_BEARER ? { Authorization: `Bearer ${ZEROCLAW_BEARER}` } : {}),
          },
          body: JSON.stringify({ message: text }),
        });
        if (!res.ok) {
          console.error(`zeroclaw /webhook HTTP ${res.status}`);
          continue;
        }
        const data = await res.json().catch(() => ({}));
        const reply = data.response || data.reply || '';
        if (reply) {
          await sock.sendMessage(jid, { text: reply });
          console.log(`→ ${number}: ${reply.slice(0, 80)}`);
        }
      } catch (err) {
        console.error('Erreur bridge:', err);
      }
    }
  });
}

start().catch((e) => {
  console.error('Échec du lancement Baileys:', e);
  process.exit(1);
});
