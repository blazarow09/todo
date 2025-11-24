import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.todo.widget',
  appName: 'My Tasks',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#0a0e1a',
      showSpinner: false
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_icon',
      iconColor: '#667eea'
    }
  },
  android: {
    allowMixedContent: true
  }
};

export default config;

