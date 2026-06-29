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
import http from 'node:http';

const {
  ZEROCLAW_WEBHOOK = 'http://127.0.0.1:42617/webhook',
  ZEROCLAW_BEARER = '',
  ALLOWED_NUMBERS = '',
  // API d'envoi sortant (pour déclencher un message : curl / Siri / skill).
  SEND_PORT = '8090',
  SEND_SECRET = '',
} = process.env;

const allow = ALLOWED_NUMBERS.split(',').map((s) => s.trim()).filter(Boolean);
const logger = pino({ level: 'silent' });

let sock = null; // socket WhatsApp courant (mis à jour à chaque (re)connexion)

// Transforme "33612345678" ou "...@s.whatsapp.net" en JID Baileys valide.
function toJid(to) {
  if (!to) return null;
  if (to.includes('@')) return to;
  return `${to.replace(/[^0-9]/g, '')}@s.whatsapp.net`;
}

// Petit serveur HTTP local : POST /send {to, text}  (protégé par SEND_SECRET).
function startSendApi() {
  http
    .createServer(async (req, res) => {
      if (req.method !== 'POST' || req.url !== '/send') {
        res.writeHead(404).end('not found');
        return;
      }
      if (SEND_SECRET && req.headers['x-send-secret'] !== SEND_SECRET) {
        res.writeHead(401).end('unauthorized');
        return;
      }
      let body = '';
      req.on('data', (c) => (body += c));
      req.on('end', async () => {
        try {
          const { to, text } = JSON.parse(body || '{}');
          const jid = toJid(to);
          if (!jid || !text) {
            res.writeHead(400).end('to + text requis');
            return;
          }
          if (!sock) {
            res.writeHead(503).end('WhatsApp non connecté');
            return;
          }
          await sock.sendMessage(jid, { text });
          console.log(`⇢ (envoi déclenché) ${jid}: ${String(text).slice(0, 80)}`);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ sent: true, to: jid }));
        } catch (err) {
          console.error('Erreur /send:', err);
          res.writeHead(500).end('erreur');
        }
      });
    })
    .listen(Number(SEND_PORT), '127.0.0.1', () => {
      console.log(`📤 API d'envoi : POST http://127.0.0.1:${SEND_PORT}/send  {to, text}`);
    });
}

async function start() {
  const { state, saveCreds } = await useMultiFileAuthState('./data/baileys');
  const { version } = await fetchLatestBaileysVersion();

  sock = makeWASocket({ version, auth: state, logger });
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

startSendApi();
start().catch((e) => {
  console.error('Échec du lancement Baileys:', e);
  process.exit(1);
});
