import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.madrasati.app',
  appName: 'مدرستي',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    // يمكن إضافة إعدادات الإضافات هنا مستقبلاً
  }
};

export default config;