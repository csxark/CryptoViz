import { DomainOperationResult } from './domainOperationState';
import { AuditLogEntry } from './serverBoundary';

export interface StorageEngine {
  read(key: string): Promise<string | null>;
  write(key: string, value: string): Promise<void>;
  clear(): Promise<void>;
}

// Dynamically retrieve node built-in modules to bypass Webpack bundling issues in browser
const getFs = () => {
  if (typeof window === 'undefined') {
    return eval("require('fs')");
  }
  return null;
};

const getFsPromises = () => {
  if (typeof window === 'undefined') {
    return eval("require('fs/promises')");
  }
  return null;
};

const getPath = () => {
  if (typeof window === 'undefined') {
    return eval("require('path')");
  }
  return null;
};

export class FileStorageEngine implements StorageEngine {
  private dbPath: string;

  constructor(dbFilename = 'domain_db.json') {
    const fs = getFs();
    const path = getPath();
    if (fs && path) {
      const kairoDir = path.join(process.cwd(), '.kairo');
      if (!fs.existsSync(kairoDir)) {
        try {
          fs.mkdirSync(kairoDir, { recursive: true });
        } catch {}
      }
      this.dbPath = path.join(kairoDir, dbFilename);
    } else {
      this.dbPath = '';
    }
  }

  private async readAll(): Promise<Record<string, string>> {
    if (typeof window !== 'undefined') return {};
    const fsPromises = getFsPromises();
    try {
      const data = await fsPromises.readFile(this.dbPath, 'utf-8');
      return JSON.parse(data);
    } catch {
      return {};
    }
  }

  private async writeAll(data: Record<string, string>): Promise<void> {
    if (typeof window !== 'undefined') return;
    const fsPromises = getFsPromises();
    await fsPromises.writeFile(this.dbPath, JSON.stringify(data, null, 2), 'utf-8');
  }

  async read(key: string): Promise<string | null> {
    const data = await this.readAll();
    return data[key] ?? null;
  }

  async write(key: string, value: string): Promise<void> {
    const data = await this.readAll();
    data[key] = value;
    await this.writeAll(data);
  }

  async clear(): Promise<void> {
    await this.writeAll({});
  }
}

export class LocalStorageEngine implements StorageEngine {
  async read(key: string): Promise<string | null> {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key);
    }
    return null;
  }

  async write(key: string, value: string): Promise<void> {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
    }
  }

  async clear(): Promise<void> {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.clear();
    }
  }
}

export class ConcurrencyLock {
  private activeLocks = new Map<string, Promise<void>>();

  async acquire(key: string): Promise<() => void> {
    while (this.activeLocks.has(key)) {
      await this.activeLocks.get(key);
    }
    let resolveLock: () => void;
    const lockPromise = new Promise<void>((resolve) => {
      resolveLock = resolve;
    });
    this.activeLocks.set(key, lockPromise);
    return () => {
      this.activeLocks.delete(key);
      resolveLock();
    };
  }
}

export interface IDomainOperationRepository {
  save(operation: DomainOperationResult): Promise<void>;
  findById(id: string): Promise<DomainOperationResult | null>;
  findByIdempotencyKey(key: string): Promise<DomainOperationResult | null>;
  findAll(): Promise<DomainOperationResult[]>;
  clear(): Promise<void>;
}

export interface IAuditLogRepository {
  save(entry: AuditLogEntry): Promise<void>;
  findAll(): Promise<AuditLogEntry[]>;
  clear(): Promise<void>;
}

export class PersistentDomainOperationRepository implements IDomainOperationRepository {
  private lock = new ConcurrencyLock();

  constructor(private storage: StorageEngine) {}

  private getOperationKey(id: string): string {
    return `operation:${id}`;
  }

  private getIdempotencyKeyMapping(key: string): string {
    return `idem_key:${key}`;
  }

  async save(operation: DomainOperationResult): Promise<void> {
    const unlock = await this.lock.acquire(operation.id);
    try {
      const opKey = this.getOperationKey(operation.id);
      await this.storage.write(opKey, JSON.stringify(operation));

      if (operation.idempotencyKey) {
        const idemKey = this.getIdempotencyKeyMapping(operation.idempotencyKey);
        await this.storage.write(idemKey, operation.id);
      }
    } finally {
      unlock();
    }
  }

  async findById(id: string): Promise<DomainOperationResult | null> {
    const raw = await this.storage.read(this.getOperationKey(id));
    if (!raw) return null;
    return JSON.parse(raw);
  }

  async findByIdempotencyKey(key: string): Promise<DomainOperationResult | null> {
    const targetId = await this.storage.read(this.getIdempotencyKeyMapping(key));
    if (!targetId) return null;
    return this.findById(targetId);
  }

  async findAll(): Promise<DomainOperationResult[]> {
    if (typeof window === 'undefined') {
      // Node.js FileStorageEngine optimization
      // We can query all keys starting with "operation:"
      const allOps: DomainOperationResult[] = [];
      const fs = getFs();
      const path = getPath();
      if (fs && path) {
        const dbPath = path.join(process.cwd(), '.kairo', 'domain_db.json');
        if (fs.existsSync(dbPath)) {
          try {
            const rawData = fs.readFileSync(dbPath, 'utf-8');
            const data = JSON.parse(rawData);
            for (const key of Object.keys(data)) {
              if (key.startsWith('operation:')) {
                allOps.push(JSON.parse(data[key]));
              }
            }
          } catch {}
        }
      }
      return allOps.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    } else {
      // Browser LocalStorageEngine optimization
      const allOps: DomainOperationResult[] = [];
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (key && key.startsWith('operation:')) {
          const raw = window.localStorage.getItem(key);
          if (raw) {
            allOps.push(JSON.parse(raw));
          }
        }
      }
      return allOps.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }
  }

  async clear(): Promise<void> {
    const all = await this.findAll();
    for (const op of all) {
      await this.storage.write(this.getOperationKey(op.id), '');
      if (op.idempotencyKey) {
        await this.storage.write(this.getIdempotencyKeyMapping(op.idempotencyKey), '');
      }
    }
  }
}

export class PersistentAuditLogRepository implements IAuditLogRepository {
  private lock = new ConcurrencyLock();

  constructor(private storage: StorageEngine) {}

  private async getLogs(): Promise<AuditLogEntry[]> {
    const raw = await this.storage.read('audit_logs');
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  async save(entry: AuditLogEntry): Promise<void> {
    const unlock = await this.lock.acquire('audit_logs');
    try {
      const logs = await this.getLogs();
      logs.unshift(entry); // Newest first
      await this.storage.write('audit_logs', JSON.stringify(logs));
    } finally {
      unlock();
    }
  }

  async findAll(): Promise<AuditLogEntry[]> {
    return this.getLogs();
  }

  async clear(): Promise<void> {
    const unlock = await this.lock.acquire('audit_logs');
    try {
      await this.storage.write('audit_logs', JSON.stringify([]));
    } finally {
      unlock();
    }
  }
}

// Export default repository factory helper to get appropriate storage automatically
export function getPersistentRepositories(): {
  operationRepository: IDomainOperationRepository;
  auditLogRepository: IAuditLogRepository;
} {
  const isNode = typeof window === 'undefined';
  const storage = isNode ? new FileStorageEngine() : new LocalStorageEngine();
  return {
    operationRepository: new PersistentDomainOperationRepository(storage),
    auditLogRepository: new PersistentAuditLogRepository(storage),
  };
}
