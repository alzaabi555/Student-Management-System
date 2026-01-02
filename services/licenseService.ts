
// هذا المفتاح السري يجب أن يكون محفوظاً لديك فقط لإنشاء أكواد التفعيل
const SECRET_SALT = 'MADRASATI_SECURE_2024_V2';

const STORAGE_KEYS = {
    DEVICE_ID: 'madrasati_device_id',
    LICENSE_KEY: 'madrasati_license_key'
};

/**
 * الحصول على بصمة الجهاز
 * في بيئة الويب، نقوم بتوليد معرف فريد وتخزينه في LocalStorage
 * هذا يضمن عدم حدوث أخطاء عند البناء للموقع
 */
export const getDeviceFingerprint = (): string => {
    let deviceId = localStorage.getItem(STORAGE_KEYS.DEVICE_ID);
    if (!deviceId) {
        // توليد معرف عشوائي فريد
        const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
        const timestampPart = Date.now().toString(36).toUpperCase().substring(4);
        deviceId = `DEV-${randomPart}-${timestampPart}`;
        localStorage.setItem(STORAGE_KEYS.DEVICE_ID, deviceId);
    }
    return deviceId;
};

/**
 * دالة التشفير (المعادلة الرياضية)
 * هذه الدالة تستخدمها أنت (خارج البرنامج) لتوليد الكود
 * ويستخدمها البرنامج (داخلياً) للتحقق من الكود
 */
export const generateExpectedKey = (deviceId: string): string => {
    const text = deviceId + SECRET_SALT;
    let hash = 0;
    
    // خوارزمية تشفير بسيطة وقوية وسريعة (DJB2 variant)
    for (let i = 0; i < text.length; i++) {
        const char = text.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    
    // تحويل الرقم الناتج إلى نص سداسي عشري وتنسيقه
    const rawCode = Math.abs(hash).toString(16).toUpperCase().padStart(12, 'X');
    
    // التنسيق النهائي: XXXX-XXXX-XXXX
    return `${rawCode.substring(0, 4)}-${rawCode.substring(4, 8)}-${rawCode.substring(8, 12)}`;
};

export const validateLicense = (inputKey: string): boolean => {
    if (!inputKey) return false;
    const deviceId = getDeviceFingerprint();
    const expectedKey = generateExpectedKey(deviceId);
    return inputKey.trim().toUpperCase() === expectedKey;
};

export const saveLicense = (key: string) => {
    localStorage.setItem(STORAGE_KEYS.LICENSE_KEY, key);
};

export const isAppActivated = (): boolean => {
    const savedKey = localStorage.getItem(STORAGE_KEYS.LICENSE_KEY);
    if (!savedKey) return false;
    return validateLicense(savedKey);
};
