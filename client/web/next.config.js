const withPWA = require('next-pwa');
const runtimeCaching = require('next-pwa/cache');

module.exports = withPWA({
  output: 'export',
  pwa: {
    dest: 'public',
    register: true,
    skipWaiting: true,
    runtimeCaching,
    disable: process.env.NODE_ENV === "development",
  },
});
