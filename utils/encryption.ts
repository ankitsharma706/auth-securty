import crypto from 'crypto';

// The key used for encryption must be exactly 32 bytes (256 bits).
// We hash the ENCRYPTION_KEY using SHA-256 to guarantee we have a 32-byte key.
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-secret-key-32-chars-long!!';
const hashKey = (key: string): Buffer => {
  return crypto.createHash('sha256').update(key).digest();
};

const algorithm = 'aes-256-cbc';

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(16); // IV size is 16 bytes for AES-256-CBC
  const key = hashKey(ENCRYPTION_KEY);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  // Format: iv_hex:encrypted_hex
  return iv.toString('hex') + ':' + encrypted;
}

export function decrypt(ciphertext: string): string {
  try {
    if (!ciphertext) return '';
    
    // Support fallback for old CryptoJS strings if they don't contain ":"
    if (!ciphertext.includes(':')) {
      return 'Stale encryption format';
    }
    
    const [ivHex, encryptedHex] = ciphertext.split(':');
    if (!ivHex || !encryptedHex) {
      return '';
    }
    const iv = Buffer.from(ivHex, 'hex');
    const encryptedText = Buffer.from(encryptedHex, 'hex');
    const key = hashKey(ENCRYPTION_KEY);
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString('utf8');
  } catch (err) {
    console.error('Decryption failed:', err);
    return 'Decryption Error (Key Mismatch)';
  }
}

