const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..', '..');

test('bootstrap assets needed by the landing page and extension exist', async () => {
  const manifestPath = path.join(projectRoot, 'extension', 'manifest.json');
  const iconPath = path.join(projectRoot, 'src', 'app', 'icon.svg');
  const screenshotDir = path.join(projectRoot, 'public', 'screenshots');

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  expect(manifest.manifest_version).toBe(3);
  expect(manifest.background.service_worker).toBe('background.js');
  expect(fs.existsSync(iconPath)).toBe(true);
  expect(fs.existsSync(screenshotDir)).toBe(true);
});
