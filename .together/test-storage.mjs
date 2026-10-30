// A local storage adapter for preview and isolated Worker tests; never deployed.
export class MemoryStorage {
  constructor(entries = []) { this.data = new Map(entries); this.queue = Promise.resolve(); this.alarmTime = null; }
  async get(key) { return structuredClone(this.data.get(key)); }
  async put(key, value) { this.data.set(key, structuredClone(value)); }
  async delete(key) { if (Array.isArray(key)) { for (const entry of key) this.data.delete(entry); } else this.data.delete(key); }
  async list({ prefix = '', limit = 1000 } = {}) { return new Map([...this.data].filter(([key]) => key.startsWith(prefix)).slice(0, limit).map(([key,value]) => [key, structuredClone(value)])); }
  async getAlarm() { return this.alarmTime; }
  async setAlarm(time) { this.alarmTime = time; }
  transaction(callback) {
    const operation = this.queue.then(async () => {
      const snapshot = structuredClone([...this.data]);
      try { return await callback(this); }
      catch (error) { this.data = new Map(snapshot); throw error; }
    });
    this.queue = operation.catch(() => {});
    return operation;
  }
}
