/**
 * Starts Next.js standalone server for Playwright webServer.
 * Avoids `next start` warning when `output: 'standalone'` is enabled.
 */

const port = process.env.PLAYWRIGHT_PORT || process.env.PORT || '3100';
const host = process.env.PLAYWRIGHT_HOST || process.env.HOSTNAME || '127.0.0.1';

process.env.PORT = String(port);
process.env.HOSTNAME = host;

await import('../.next/standalone/server.js');
