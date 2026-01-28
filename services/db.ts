
import { Applicant, EvaluationStatus } from '../types';

const DB_NAME = 'LIVIGUI_DB_V4';
const DB_VERSION = 4;
const STORE_NAME = 'applicants';

const initialData: Omit<Applicant, 'id'>[] = [
  {
    firstName: 'Demo',
    lastName: 'Admin',
    email: 'admin@livigui.com',
    phone: '999888777',
    downloadLink: 'https://docs.google.com/spreadsheets/d/example_admin',
    status: EvaluationStatus.PENDING,
  },
  {
    firstName: 'Juan',
    lastName: 'Pérez',
    email: 'juan@example.com',
    phone: '987654321',
    downloadLink: 'https://docs.google.com/spreadsheets/d/example_juan',
    status: EvaluationStatus.PENDING,
  }
];

export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject('Error al abrir la base de datos');
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = async (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      const seedKey = `livigui_db_v4_seeded`;
      if (!localStorage.getItem(seedKey)) {
        const count = await new Promise<number>((res) => {
          const tx = db.transaction(STORE_NAME, 'readonly');
          const store = tx.objectStore(STORE_NAME);
          const req = store.count();
          req.onsuccess = () => res(req.result);
        });

        if (count === 0) {
          const tx = db.transaction(STORE_NAME, 'readwrite');
          const store = tx.objectStore(STORE_NAME);
          for (const item of initialData) {
            const newApp = {
              ...item,
              id: Math.random().toString(36).substr(2, 9),
              isSuspended: false
            };
            store.add(newApp);
          }
          tx.oncomplete = () => {
            localStorage.setItem(seedKey, 'true');
            resolve(db);
          };
        } else {
          resolve(db);
        }
      } else {
        resolve(db);
      }
    };
  });
};

export const getAllApplicantsDB = (db: IDBDatabase): Promise<Applicant[]> => {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject('Error al obtener registros');
  });
};

export const getApplicantByIdDB = (db: IDBDatabase, id: string): Promise<Applicant | undefined> => {
  return new Promise((resolve) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result);
  });
};

export const addApplicantDB = (db: IDBDatabase, applicant: Omit<Applicant, 'id' | 'status'>): Promise<Applicant> => {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const newApplicant: Applicant = {
      ...applicant,
      id: Math.random().toString(36).substr(2, 9),
      status: EvaluationStatus.PENDING,
      isSuspended: false
    };
    store.add(newApplicant);
    transaction.oncomplete = () => resolve(newApplicant);
    transaction.onerror = () => reject('Error al añadir postulante');
  });
};

export const updateApplicantDB = (db: IDBDatabase, id: string, updates: Partial<Applicant>): Promise<Applicant | null> => {
  return new Promise(async (resolve, reject) => {
    const current = await getApplicantByIdDB(db, id);
    if (!current) return resolve(null);

    const updated = { ...current, ...updates };
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    store.put(updated);
    transaction.oncomplete = () => resolve(updated);
    transaction.onerror = () => reject('Error al actualizar postulante');
  });
};

export const deleteApplicantDB = (db: IDBDatabase, id: string): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    try {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      // Intentamos la eliminación
      const deleteRequest = store.delete(id);
      
      deleteRequest.onsuccess = () => {
        console.debug(`Solicitud de eliminación exitosa para el ID: ${id}`);
      };

      deleteRequest.onerror = () => {
        console.error(`Error en la solicitud de eliminación para el ID: ${id}`);
        reject(false);
      };

      transaction.oncomplete = () => {
        console.debug(`Transacción de eliminación completada para el ID: ${id}`);
        resolve(true);
      };

      transaction.onerror = (e) => {
        console.error('Error en la transacción de eliminación:', e);
        reject(false);
      };
    } catch (err) {
      console.error('Error crítico al intentar eliminar:', err);
      reject(false);
    }
  });
};
