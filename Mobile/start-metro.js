const Metro = require('metro');
const path = require('path');

const config = {
  projectRoot: __dirname,
  port: parseInt(process.argv[2] || '8081', 10),
  watchFolders: [__dirname],
  transformer: {
    babelTransformerPath: require.resolve('@react-native/metro-babel-transformer'),
  },
};

async function start() {
  try {
    const metroConfig = await Metro.loadConfig({ config: config }, config);
    const server = await Metro.runServer(metroConfig, {
      host: '127.0.0.1',
      port: config.port,
      secure: false,
      watch: true,
    });
    console.log(`Metro server started on http://localhost:${config.port}`);
  } catch (err) {
    console.error('Failed to start Metro:', err);
    process.exit(1);
  }
}

start();
