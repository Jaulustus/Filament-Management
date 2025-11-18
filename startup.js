import 'dotenv/config';
import { networkInterfaces } from 'os';
import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import http from 'http';

const execAsync = promisify(exec);

/**
 * Findet die lokale IP-Adresse im Netzwerk (nicht localhost/127.0.0.1)
 * Wird beim Start ermittelt, da sich die IP je nach Netzwerk ändern kann
 */
function getLocalIP() {
  const nets = networkInterfaces();
  const results = {};

  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      // Skip internal (i.e. 127.0.0.1) and non-IPv4 addresses
      if (net.family === 'IPv4' && !net.internal) {
        if (!results[name]) {
          results[name] = [];
        }
        results[name].push(net.address);
      }
    }
  }

  // Priorität: Ethernet > WLAN > andere
  if (results['Ethernet'] && results['Ethernet'].length > 0) {
    return results['Ethernet'][0];
  }
  if (results['Wi-Fi'] && results['Wi-Fi'].length > 0) {
    return results['Wi-Fi'][0];
  }
  if (results['WLAN'] && results['WLAN'].length > 0) {
    return results['WLAN'][0];
  }
  
  // Fallback: erste gefundene IP
  for (const name of Object.keys(results)) {
    if (results[name].length > 0) {
      return results[name][0];
    }
  }

  return 'localhost';
}

/**
 * Öffnet den Browser mit der angegebenen URL
 */
function openBrowser(url) {
  const platform = process.platform;
  let command;

  if (platform === 'win32') {
    command = `start "" "${url}"`;
  } else if (platform === 'darwin') {
    command = `open "${url}"`;
  } else {
    command = `xdg-open "${url}"`;
  }

  exec(command, (error) => {
    if (error) {
      console.error(`Konnte Browser nicht öffnen: ${error.message}`);
    } else {
      console.log(`Browser geöffnet: ${url}`);
    }
  });
}

/**
 * Prüft, ob Node.js installiert ist
 */
async function checkNodeInstalled() {
  try {
    await execAsync('node --version');
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Prüft, ob npm installiert ist
 */
async function checkNpmInstalled() {
  try {
    await execAsync('npm --version');
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Installiert npm-Abhängigkeiten falls nötig
 */
async function ensureDependencies() {
  const fs = await import('fs');
  const path = await import('path');
  const { fileURLToPath } = await import('url');
  
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const nodeModulesPath = path.join(__dirname, 'node_modules');

  if (!fs.existsSync(nodeModulesPath)) {
    console.log('Installiere npm-Abhängigkeiten...');
    return new Promise((resolve, reject) => {
      const npm = spawn('npm', ['install'], {
        cwd: __dirname,
        stdio: 'inherit',
        shell: true
      });

      npm.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`npm install fehlgeschlagen mit Code ${code}`));
        }
      });
    });
  }
}

/**
 * Führt Prisma-Migrationen aus
 */
async function runPrismaMigrations() {
  const fs = await import('fs');
  const path = await import('path');
  const { fileURLToPath } = await import('url');
  
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const envPath = path.join(__dirname, '.env');
  const envExamplePath = path.join(__dirname, '.env.example');

  // .env erstellen falls nicht vorhanden
  if (!fs.existsSync(envPath) && fs.existsSync(envExamplePath)) {
    console.log('Erstelle .env aus .env.example...');
    fs.copyFileSync(envExamplePath, envPath);
  }

  // Stelle sicher, dass data Ordner existiert
  const dataDir = path.join(__dirname, 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
    console.log('Erstelle data Ordner...');
  }

  // WICHTIG: Keine bestehende Datenbank verwenden - wird neu erstellt
  // Die Datenbank wird durch prisma migrate deploy automatisch erstellt
  console.log('Führe Prisma-Migrationen aus (erstellt leere Datenbank falls nicht vorhanden)...');
  return new Promise((resolve, reject) => {
    const prisma = spawn('npx', ['prisma', 'migrate', 'deploy'], {
      cwd: __dirname,
      stdio: 'inherit',
      shell: true
    });

    prisma.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Prisma migrate fehlgeschlagen mit Code ${code}`));
      }
    });
  });
}

/**
 * Startet den Server
 */
async function startServer() {
  // Versuche Port 80, falls nicht verfügbar → Port 3000
  const DEFAULT_PORT = process.env.PORT ? parseInt(process.env.PORT) : 80;
  const FALLBACK_PORT = 3000;
  const APP_MODE = process.env.APP_MODE || 'both';
  const localIP = getLocalIP();
  
  // Setze Umgebungsvariablen
  process.env.PORT = DEFAULT_PORT.toString();
  process.env.APP_MODE = APP_MODE;
  process.env.HOST = '0.0.0.0'; // Hört auf allen Interfaces

  console.log('\n========================================');
  console.log('  FilaHub Server wird gestartet...');
  console.log('========================================\n');
  console.log(`Versuche Port ${DEFAULT_PORT}...`);
  if (DEFAULT_PORT === 80) {
    console.log(`(Falls keine Admin-Rechte: automatischer Wechsel auf Port ${FALLBACK_PORT})`);
  }
  console.log(`Lokale IP-Adresse: ${localIP}`);
  console.log(`Modus: ${APP_MODE}`);
  console.log('\nDrücke Ctrl+C zum Beenden.\n');

  // Variable für den tatsächlich verwendeten Port (wird vom Server gesetzt)
  let actualPort = DEFAULT_PORT;
  let networkUrl = '';
  let localUrl = '';

  // Warte auf Server-Start, dann öffne Browser
  // Wir warten auf eine erfolgreiche Server-Start-Meldung
  let serverStarted = false;
  const checkServer = setInterval(() => {
    // Prüfe beide Ports (80 und 3000), um den tatsächlichen Port zu finden
    [DEFAULT_PORT, FALLBACK_PORT].forEach(port => {
      const testUrl = `http://localhost${port === 80 ? '' : ':' + port}`;
      try {
        const req = http.get(testUrl, (res) => {
          if (!serverStarted && res.statusCode) {
            serverStarted = true;
            actualPort = port;
            networkUrl = `http://${localIP}${port === 80 ? '' : ':' + port}`;
            localUrl = testUrl;
            clearInterval(checkServer);
            console.log(`\n✓ Server gestartet auf Port ${port}!`);
            console.log(`Server erreichbar unter:`);
            console.log(`  - Lokal: ${localUrl}`);
            console.log(`  - Netzwerk: ${networkUrl}`);
            console.log(`\nÖffne Browser...\n`);
            openBrowser(networkUrl);
          }
        });
        req.on('error', () => {
          // Server noch nicht bereit auf diesem Port, weiter warten
        });
        req.setTimeout(100, () => {
          req.destroy();
        });
      } catch (error) {
        // Fehler ignorieren, weiter warten
      }
    });
  }, 500);

  // Timeout nach 15 Sekunden - öffne Browser auch wenn Server-Check fehlschlägt
  setTimeout(() => {
    if (!serverStarted) {
      clearInterval(checkServer);
      // Verwende Fallback-Port als Annahme
      actualPort = FALLBACK_PORT;
      networkUrl = `http://${localIP}:${FALLBACK_PORT}`;
      localUrl = `http://localhost:${FALLBACK_PORT}`;
      console.log(`\n⚠ Server-Start-Check Timeout. Versuche Browser zu öffnen...\n`);
      console.log(`Annahme: Server läuft auf Port ${FALLBACK_PORT}`);
      console.log(`URL: ${networkUrl}\n`);
      openBrowser(networkUrl);
    }
  }, 15000);

  // Starte den Server (importiert und startet server.js)
  await import('./server.js');
}

/**
 * Hauptfunktion
 */
async function main() {
  try {
    console.log('FilaHub Startup Script');
    console.log('======================\n');

    // Prüfe Node.js
    if (!(await checkNodeInstalled())) {
      console.error('FEHLER: Node.js ist nicht installiert!');
      console.error('Bitte installiere Node.js von https://nodejs.org/');
      process.exit(1);
    }

    // Prüfe npm
    if (!(await checkNpmInstalled())) {
      console.error('FEHLER: npm ist nicht installiert!');
      process.exit(1);
    }

    // Installiere Abhängigkeiten falls nötig
    await ensureDependencies();

    // Führe Prisma-Migrationen aus
    await runPrismaMigrations();

    // Starte Server
    await startServer();

  } catch (error) {
    console.error('FEHLER:', error.message);
    process.exit(1);
  }
}

// Starte die Anwendung
main();

