
// This file handles low-level IndexedDB operations

const DB_NAME = 'MadrasatiDB';
const DB_VERSION = 1;

export const STORES = {
  GRADES: 'grades',
  CLASSES: 'classes',
  STUDENTS: 'students',
  ATTENDANCE: 'attendance',
  SETTINGS: 'settings',
  ASSETS: 'assets'
};

export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      console.error("Database error: ", event);
      reject("Error opening database");
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create Stores if they don't exist
      if (!db.objectStoreNames.contains(STORES.GRADES)) {
        db.createObjectStore(STORES.GRADES, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.CLASSES)) {
        db.createObjectStore(STORES.CLASSES, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.STUDENTS)) {
        const studentStore = db.createObjectStore(STORES.STUDENTS, { keyPath: 'id' });
        studentStore.createIndex('classId', 'classId', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORES.ATTENDANCE)) {
        // We use a composite string key manually constructed in dataService (date-studentId)
        // keeping it simple as a key-value store for attendance records
        db.createObjectStore(STORES.ATTENDANCE); 
      }
      if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
        db.createObjectStore(STORES.SETTINGS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.ASSETS)) {
        db.createObjectStore(STORES.ASSETS, { keyPath: 'id' });
      }
    };
  });
};

// Generic Helper to perform a transaction
const performTransaction = <T>(
  storeName: string, 
  mode: IDBTransactionMode, 
  callback: (store: IDBObjectStore) => IDBRequest<T> | void
): Promise<T> => {
  return new Promise(async (resolve, reject) => {
    try {
      const db = await initDB();
      const transaction = db.transaction(storeName, mode);
      const store = transaction.objectStore(storeName);
      
      const request = callback(store);

      transaction.oncomplete = () => {
        if (request && 'result' in request) {
           resolve(request.result);
        } else {
           resolve(undefined as T);
        }
      };

      transaction.onerror = () => reject(transaction.error);
      
    } catch (err) {
      reject(err);
    }
  });
};

export const dbService = {
  getAll: <T>(storeName: string): Promise<T[]> => {
    return performTransaction(storeName, 'readonly', (store) => store.getAll());
  },

  get: <T>(storeName: string, key: string): Promise<T | undefined> => {
    return performTransaction(storeName, 'readonly', (store) => store.get(key));
  },

  put: <T>(storeName: string, data: T, key?: string): Promise<IDBValidKey> => {
    return performTransaction(storeName, 'readwrite', (store) => store.put(data, key));
  },

  delete: (storeName: string, key: string): Promise<void> => {
    return performTransaction(storeName, 'readwrite', (store) => store.delete(key));
  },

  // Bulk put for better performance during imports
  putBulk: (storeName: string, items: any[]): Promise<void> => {
    return new Promise(async (resolve, reject) => {
        try {
            const db = await initDB();
            const transaction = db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            
            items.forEach(item => store.put(item));

            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
        } catch(err) {
            reject(err);
        }
    });
  },
  
  // Clear a store
  clear: (storeName: string): Promise<void> => {
      return performTransaction(storeName, 'readwrite', (store) => store.clear());
  }
};
