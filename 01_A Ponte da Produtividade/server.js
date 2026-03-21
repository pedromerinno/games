const express = require('express');
const os = require('os');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.static(path.join(__dirname)));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Get local network IPs
function getLocalIPs() {
  const interfaces = os.networkInterfaces();
  const ips = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        ips.push({ name, address: iface.address });
      }
    }
  }
  return ips;
}

app.listen(PORT, '0.0.0.0', () => {
  console.log('\n========================================');
  console.log('  MNNO GAMES - A PONTE DA PRODUTIVIDADE');
  console.log('========================================\n');
  console.log(`  Local:   http://localhost:${PORT}`);

  const ips = getLocalIPs();
  ips.forEach(ip => {
    console.log(`  Rede:    http://${ip.address}:${PORT}`);
  });

  console.log('\n  Acesse de qualquer dispositivo na rede!');
  console.log('========================================\n');
});
