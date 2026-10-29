import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const SCREENSHOT_DIR = path.resolve('docs/screenshots');
fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

async function main() {
  console.log('[Capture] 1. Logging in as Demo Student...');
  const loginRes = await fetch('http://localhost:5001/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'demostudent99@university.edu',
      password: 'DemoStudent@123',
    }),
  });

  if (!loginRes.ok) {
    throw new Error(`Login failed with status ${loginRes.status}: ${await loginRes.text()}`);
  }

  const setCookie = loginRes.headers.get('set-cookie');
  const match = setCookie && setCookie.match(/student_hub_token=([^;]+)/);
  if (!match) throw new Error('Failed to extract student_hub_token cookie');
  const token = match[1];
  console.log('[Capture] Token retrieved successfully.');

  console.log('[Capture] 2. Launching Headless Chrome on port 9222...');
  const chromeProcess = spawn(
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    [
      '--headless=new',
      '--remote-debugging-port=9222',
      '--remote-allow-origins=*',
      '--disable-gpu',
      '--window-size=1440,900',
      '--no-first-run',
      '--no-default-browser-check',
      'about:blank',
    ],
    { stdio: 'ignore' }
  );

  // Wait for Chrome CDP to be available
  let versionData = null;
  for (let i = 0; i < 20; i++) {
    try {
      const res = await fetch('http://127.0.0.1:9222/json/version');
      if (res.ok) {
        versionData = await res.json();
        break;
      }
    } catch {
      await new Promise((r) => setTimeout(r, 250));
    }
  }

  if (!versionData) {
    chromeProcess.kill();
    throw new Error('Chrome CDP port 9222 not reachable');
  }

  console.log('[Capture] 3. Connecting to page target...');
  const listRes = await fetch('http://127.0.0.1:9222/json/list');
  const targets = await listRes.json();
  const pageTarget = targets.find((t) => t.type === 'page') || targets[0];
  if (!pageTarget?.webSocketDebuggerUrl) {
    throw new Error('No page target with webSocketDebuggerUrl found');
  }

  const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);

  let messageId = 1;
  const pendingRequests = new Map();

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.id && pendingRequests.has(data.id)) {
      pendingRequests.get(data.id)(data);
      pendingRequests.delete(data.id);
    }
  };

  await new Promise((resolve) => {
    ws.onopen = resolve;
  });

  function sendCommand(method, params = {}) {
    return new Promise((resolve) => {
      const id = messageId++;
      pendingRequests.set(id, resolve);
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  console.log('[Capture] 4. Enabling Page & Network domains...');
  await sendCommand('Page.enable');
  await sendCommand('Network.enable');

  console.log('[Capture] 5. Injecting Auth Cookie into Browser...');
  await sendCommand('Network.setCookie', {
    name: 'student_hub_token',
    value: token,
    domain: 'localhost',
    path: '/',
    httpOnly: true,
    sameSite: 'Lax',
  });

  const routes = [
    { name: 'dashboard', path: '/student/dashboard' },
    { name: 'attendance', path: '/student/attendance' },
    { name: 'tasks-kanban', path: '/student/tasks' },
    { name: 'notes', path: '/student/notes' },
    { name: 'study-timer', path: '/student/study' },
  ];

  for (const theme of ['light', 'dark']) {
    console.log(`\n[Capture] --- Capturing Theme: ${theme.toUpperCase()} ---`);
    for (const r of routes) {
      console.log(`[Capture] Navigating to ${r.path} (${theme})...`);
      await sendCommand('Page.navigate', { url: `http://localhost:5173${r.path}` });

      // Wait for page load and API data settlement
      await new Promise((res) => setTimeout(res, 1200));

      // Force theme in DOM
      await sendCommand('Runtime.evaluate', {
        expression: `
          document.documentElement.setAttribute('data-theme', '${theme}');
          localStorage.setItem('student_hub_theme', '${theme}');
        `,
      });

      // Extra wait for re-rendering Recharts and animations
      await new Promise((res) => setTimeout(res, 800));

      const screenshot = await sendCommand('Page.captureScreenshot', { format: 'png' });
      if (screenshot.result?.data) {
        const filePath = path.join(SCREENSHOT_DIR, `${r.name}-${theme}.png`);
        fs.writeFileSync(filePath, Buffer.from(screenshot.result.data, 'base64'));
        console.log(`[Capture] Saved: ${filePath} (${Math.round(fs.statSync(filePath).size / 1024)} KB)`);
      }
    }
  }

  console.log('\n[Capture] Cleaning up CDP session...');
  ws.close();
  chromeProcess.kill();
  console.log('[Capture] Complete! All screenshots generated.');
}

main().catch((err) => {
  console.error('[Capture Error]', err);
  process.exit(1);
});
