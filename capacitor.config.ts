
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  // تغيير المعرف ليكون فريداً جداً (اسم المطور + اسم المشروع + الوظيفة)
  appId: 'com.walid.madrasati.manager.v2', 
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
