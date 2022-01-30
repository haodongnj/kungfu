const fs = require('fs-extra');
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

exports.getKungfuBuildInfo = () => {
  try {
    const buildInfoRaw = fs.readFileSync(
      require.resolve(
        '@kungfu-trader/kungfu-core/dist/kfc/kungfubuildinfo.json',
      ),
      'utf-8',
    );
    const buildInfo = JSON.parse(buildInfoRaw);
    const pyVersion = buildInfo.pythonVersion;
    const gitCommitVersion = buildInfo.git.revision;
    const buildTimeStamp = buildInfo.build.timestamp;

    return {
      pyVersion,
      gitCommitVersion,
      buildTimeStamp,
    };
  } catch (err) {
    console.error(err);
    throw err;
  }
};

exports.getPagesConfig = (argv) => {
  const appDir = this.getAppDir();
  const pagesDir = path.resolve(appDir, 'src', 'renderer', 'pages');
  const files = fs.readdirSync(pagesDir);
  let entry = {},
    plugins = [];
  files
    .filter((file) => {
      const filePath = path.join(pagesDir, file);
      const stats = fs.statSync(filePath);
      return stats.isDirectory();
    })
    .forEach((dir) => {
      entry[dir] = path.resolve(pagesDir, dir, 'main.ts');
      plugins.push(
        new HtmlWebpackPlugin({
          title: '功夫交易系统',
          filename: `${dir}.html`,
          template: path.resolve(appDir, 'public', 'index.ejs'),
          minify: {
            collapseWhitespace: true,
            removeAttributeQuotes: true,
            removeComments: true,
          },
          chunks: [dir],
          nodeModules: !this.isProduction(argv)
            ? path.resolve(appDir, 'node_modules')
            : false,
        }),
      );
    });

  return {
    entry,
    plugins,
  };
};

exports.getComponentsConfig = () => {
  const appDir = this.getAppDir();
  const componentsDir = path.resolve(appDir, 'src', 'components', 'modules');
  const files = fs.readdirSync(componentsDir);
  let entry = {};

  files
    .filter((file) => {
      const filePath = path.join(componentsDir, file);
      const stats = fs.statSync(filePath);
      return stats.isDirectory();
    })
    .forEach((dir) => {
      entry[dir] = path.resolve(componentsDir, dir, 'index.ts');
    });

  return entry;
};

exports.getWebpackExternals = () => {
  const appPackageJSONPath = require.resolve(
    '@kungfu-trader/kungfu-app/package.json',
  );
  const apiPackageJSONPath = require.resolve(
    '@kungfu-trader/kungfu-js-api/package.json',
  );
  const appPackageJSON = fs.readJSONSync(appPackageJSONPath);
  const apiPackageJSON = fs.readJSONSync(apiPackageJSONPath);
  return [
    ...Object.keys(appPackageJSON.dependencies),
    ...Object.keys(apiPackageJSON.dependencies),
  ].filter((item) => !item.includes('kungfu-js-api'));
};

exports.getAppDefaultDistDir = () => {
  return path.resolve(this.getAppDir(), 'dist');
};

exports.getAppDir = () => {
  return path.dirname(
    require.resolve('@kungfu-trader/kungfu-app/package.json'),
  );
};

exports.getApiDir = () => {
  return path.dirname(
    require.resolve('@kungfu-trader/kungfu-js-api/package.json'),
  );
};

exports.getCoreDir = () => {
  return path.dirname(
    require.resolve('@kungfu-trader/kungfu-core/package.json'),
  );
};

exports.getKfcDir = () => {
  return path.join(
    path.dirname(require.resolve('@kungfu-trader/kungfu-core/package.json')),
    'dist',
    'kfc',
  );
};

exports.isProduction = (argv) => argv.mode === 'production';