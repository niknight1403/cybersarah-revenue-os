module.exports = {
  apps: [{
    name: 'cybersarah',
    script: '/usr/bin/tsx',
    args: 'src/index.ts',
    cwd: '/opt/cybersarah/artifacts/api-server',
    max_memory_restart: '500M',
    interpreter: '/usr/bin/node',
    env: {
      NODE_ENV: 'production',
    }
  }]
};
