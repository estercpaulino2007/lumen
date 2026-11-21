import fs from 'fs';
import path from 'path';
import { encrypt, decrypt } from './crypto';

// Abstracción de almacenamiento: hoy disco local privado (fuera de /public) y cifrado AES-256-GCM.
// Para piloto: implementar la misma interfaz con almacenamiento S3-compatible + cifrado del lado servidor/KMS.
export interface Storage { put(key: string, data: Buffer): Promise<string>; get(key: string): Promise<Buffer>; }
const ROOT = path.join(process.cwd(), 'storage', 'results');

class LocalEncryptedStorage implements Storage {
  async put(key: string, data: Buffer) {
    fs.mkdirSync(ROOT, { recursive: true });
    const safe = key.replace(/[^a-zA-Z0-9_-]/g, '');
    fs.writeFileSync(path.join(ROOT, safe + '.enc'), encrypt(data));
    return 'local://' + safe + '.enc';
  }
  async get(storagePath: string) {
    const name = storagePath.replace('local://', '').replace(/[^a-zA-Z0-9_.-]/g, '');
    return decrypt(fs.readFileSync(path.join(ROOT, name)));
  }
}
export const storage: Storage = new LocalEncryptedStorage();
export function clearStorage() { if (fs.existsSync(ROOT)) for (const f of fs.readdirSync(ROOT)) if (f.endsWith('.enc')) fs.unlinkSync(path.join(ROOT, f)); }
