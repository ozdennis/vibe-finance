import { defineConfig, devices } from '@playwright/test';

const PLAYWRIGHT_PORT = Number(process.env.PLAYWRIGHT_PORT || 3100);
const PLAYWRIGHT_HOST = process.env.PLAYWRIGHT_HOST || '127.0.0.1';
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || `http://${PLAYWRIGHT_HOST}:${PLAYWRIGHT_PORT}`;

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 6,
  reporter: [['html', { open: 'never' }], ['list']],

  timeout: 60000, // Increase timeout to 60s

  use: {
    baseURL: BASE_URL,
    headless: true,
    trace: 'off',
    video: 'off',
    screenshot: 'only-on-failure',
    launchOptions: {
      args: [
        '--disable-gpu',
        '--use-angle=swiftshader',
        '--disable-gpu-compositing',
      ],
    },
  },

  projects: [
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Desktop Chrome',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    // Use standalone server directly to avoid `next start` standalone warning.
    command: 'node scripts/start-standalone-server.js',
    url: BASE_URL,
    reuseExistingServer: false,
    timeout: 120000,
  },
});
