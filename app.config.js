const fs = require('fs');
const path = require('path');

/**
 * Extends app.json. Kept separate so push notifications can be switched on by
 * dropping Firebase's google-services.json next to this file — without it the
 * build still works, just with no push notifications.
 */
module.exports = ({ config }) => {
  const googleServicesFile = './google-services.json';
  const hasFirebase = fs.existsSync(path.join(__dirname, googleServicesFile));

  return {
    ...config,
    android: {
      ...config.android,
      ...(hasFirebase ? { googleServicesFile } : {}),
    },
    plugins: [
      ...(config.plugins || []),
      [
        'expo-notifications',
        {
          color: '#0B192C',
          defaultChannel: 'jobs',
        },
      ],
    ],
  };
};
