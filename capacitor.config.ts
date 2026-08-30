import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.maya.ai.assistant',
  appName: 'Maya AI',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    // For development - load from dev server
    // url: 'http://10.0.2.2:5173',
    // cleartext: true,
  },
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#00d4ff',
    },
    Haptics: {
      // Enable haptic feedback
    },
    Browser: {
      // Open links in external browser
    },
  },
  android: {
    // Android specific settings
    allowMixedContent: true,
    buildOptions: {
      keystorePath: undefined,
      keystoreAlias: undefined,
    },
  },
};

export default config;
