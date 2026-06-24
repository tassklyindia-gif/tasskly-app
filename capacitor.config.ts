import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.tasskly.app',
  appName: 'Tasskly',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
