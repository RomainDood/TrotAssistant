// pm2 — lance et surveille les deux process de TrotAssistant.
//   pm2 start ecosystem.config.js
//   pm2 logs            (suivre les logs)
//   pm2 save && pm2 startup   (relance auto au reboot du Pi)
module.exports = {
  apps: [
    {
      name: "zeroclaw",
      script: "./scripts/start-zeroclaw.sh",
      interpreter: "bash",
      autorestart: true,
      restart_delay: 5000,
      max_restarts: 20,
    },
    {
      name: "openwa",
      script: "./scripts/start-openwa.sh",
      interpreter: "bash",
      autorestart: true,
      // délai au boot : laisse le temps à Chromium + à zeroclaw de démarrer
      restart_delay: 20000,
      max_restarts: 20,
    },
  ],
};
