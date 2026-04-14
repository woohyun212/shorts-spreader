const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..', '..');

describe('protocol bootstrap', () => {
  it('keeps the documented root-level server entrypoint and websocket bootstrap dependency', () => {
    const serverSource = fs.readFileSync(path.join(projectRoot, 'server.js'), 'utf8');
    const packageJson = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));

    expect(packageJson.main).toBe('server.js');
    expect(serverSource).toContain("require('next')");
    expect(serverSource).toContain("require('ws')");
    expect(serverSource).toContain('createServer');
    expect(serverSource).toContain('WebSocketServer');
    expect(serverSource).toContain("process.env.NODE_ENV === 'development'");
  });

  it('provides the task-2 protocol module alongside the bootstrap extension package target', () => {
    const publicZipPath = path.join(projectRoot, 'public', 'extension.zip');
    const packageScript = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8')).scripts['package:extension'];
    const protocolModulePath = path.join(projectRoot, 'src', 'lib', 'protocol.js');

    expect(packageScript).toContain('scripts/package-extension.js');
    expect(fs.existsSync(publicZipPath)).toBe(true);
    expect(fs.existsSync(protocolModulePath)).toBe(true);
  });
});
