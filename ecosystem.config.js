// ecosystem.config.js
module.exports = {
    apps: [
      {
        name: 'bet-app-client',
        script: 'npm',
        args: 'start',
        cwd: './client',
        env: {
          NODE_ENV: 'production',
          http_proxy: 'http://yeyccztb:r7oa3qwnkid7@46.203.47.151:5650',
          https_proxy: 'http://yeyccztb:r7oa3qwnkid7@46.203.47.151:5650',
          HTTP_PROXY: 'http://yeyccztb:r7oa3qwnkid7@46.203.47.151:5650',
          HTTPS_PROXY: 'http://yeyccztb:r7oa3qwnkid7@46.203.47.151:5650',
          no_proxy: 'localhost,127.0.0.1,::1',
          NO_PROXY: 'localhost,127.0.0.1,::1'
        }
      },
      {
        name: 'bet-app-server',
        script: 'src/app.js',
        cwd: './server',
        env: {
          NODE_ENV: 'production',
          http_proxy: 'http://yeyccztb:r7oa3qwnkid7@46.203.47.151:5650',
          https_proxy: 'http://yeyccztb:r7oa3qwnkid7@46.203.47.151:5650',
          HTTP_PROXY: 'http://yeyccztb:r7oa3qwnkid7@46.203.47.151:5650',
          HTTPS_PROXY: 'http://yeyccztb:r7oa3qwnkid7@46.203.47.151:5650',
          no_proxy: 'localhost,127.0.0.1,::1',
          NO_PROXY: 'localhost,127.0.0.1,::1'
        }
      }
    ]
  };