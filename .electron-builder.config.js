if (process.env.VITE_APP_VERSION === undefined) {
  const now = new Date();
  process.env.VITE_APP_VERSION = `${now.getUTCFullYear() - 2000}.${
    now.getUTCMonth() + 1
  }.${now.getUTCDate()}-${now.getUTCHours() * 60 + now.getUTCMinutes()}`;
}

/**
 * @type {import('electron-builder').Configuration}
 * @see https://www.electron.build/configuration/configuration
 */
const config = {
  productName: 'MegaRack',
  appId: 'com.ratstudio.MegaRack',
  directories: {
    output: 'dist',
    buildResources: 'buildResources',
  },
  files: ['packages/**/dist/**'],
  extraMetadata: {
    version: process.env.VITE_APP_VERSION,
  },
  linux: {
    target: 'tar.bz2',
  },
  mac: {
    // Build for both Apple Silicon and Intel Macs.
    target: [
      { target: 'dmg', arch: ['arm64', 'x64'] },
      { target: 'zip', arch: ['arm64', 'x64'] },
    ],
    category: 'public.app-category.music',
    // Local/unsigned build: electron-builder skips code signing so it builds
    // without an Apple Developer certificate. The app runs locally (first launch:
    // right-click -> Open to get past Gatekeeper). For distribution, set up a
    // Developer ID identity + notarization instead of `identity: null`.
    identity: null,
  },
};

module.exports = config;
