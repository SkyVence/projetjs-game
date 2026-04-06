export class IndexedDB {
  private db: IDBDatabase | null = null;
  private ready: Promise<IDBDatabase>;

  constructor(dbName: string, version: number) {
    this.ready = new Promise((resolve, reject) => {
      if (!window.indexedDB) {
        reject(new Error("IndexedDB is not supported"));
        return;
      }

      const request = window.indexedDB.open(dbName, version);

      request.onerror = () => {
        reject(request.error ?? new Error("Failed to open database"));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };
    });
  }

  async getDatabase(): Promise<IDBDatabase> {
    return this.ready;
  }
}
