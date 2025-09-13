// Encryption utilities for sensitive data

import crypto from 'crypto';
import { config } from '../config/environment';

export interface EncryptionResult {
  encryptedData: string;
  iv: string;
  authTag: string;
}

export interface DecryptionInput {
  encryptedData: string;
  iv: string;
  authTag: string;
}

export class EncryptionService {
  private static readonly ALGORITHM = 'aes-256-cbc';
  private static readonly KEY_LENGTH = 32; // 256 bits
  private static readonly IV_LENGTH = 16; // 128 bits
  private static readonly TAG_LENGTH = 16; // 128 bits

  private static getKey(): Buffer {
    // Derive a consistent key from the environment variable
    return crypto.scryptSync(config.ENCRYPTION_KEY, 'salt', this.KEY_LENGTH);
  }

  static encrypt(plaintext: string): EncryptionResult {
    try {
      const key = this.getKey();
      const iv = crypto.randomBytes(this.IV_LENGTH);
      
      const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
      
      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      return {
        encryptedData: encrypted,
        iv: iv.toString('hex'),
        authTag: '' // Not used with CBC mode
      };
    } catch (error) {
      throw new Error(`Encryption failed: ${error.message}`);
    }
  }

  static decrypt(input: DecryptionInput): string {
    try {
      const key = this.getKey();
      const iv = Buffer.from(input.iv, 'hex');
      
      const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
      
      let decrypted = decipher.update(input.encryptedData, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      throw new Error(`Decryption failed: ${error.message}`);
    }
  }

  static encryptObject(obj: any): string {
    const jsonString = JSON.stringify(obj);
    const result = this.encrypt(jsonString);
    
    // Combine all parts into a single string for storage
    return JSON.stringify(result);
  }

  static decryptObject<T>(encryptedString: string): T {
    const input = JSON.parse(encryptedString) as DecryptionInput;
    const decryptedString = this.decrypt(input);
    
    return JSON.parse(decryptedString) as T;
  }

  static hash(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  static generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  static generateKeyPair(): { publicKey: string; privateKey: string } {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem'
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem'
      }
    });

    return { publicKey, privateKey };
  }

  static verifyIntegrity(data: string, expectedHash: string): boolean {
    const actualHash = this.hash(data);
    return crypto.timingSafeEqual(
      Buffer.from(actualHash, 'hex'),
      Buffer.from(expectedHash, 'hex')
    );
  }
}

// Utility functions for common encryption tasks
export function encryptCredentials(credentials: any): string {
  return EncryptionService.encryptObject(credentials);
}

export function decryptCredentials<T>(encryptedCredentials: string): T {
  return EncryptionService.decryptObject<T>(encryptedCredentials);
}

export function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const actualSalt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, actualSalt, 10000, 64, 'sha512').toString('hex');
  
  return { hash, salt: actualSalt };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  const { hash: computedHash } = hashPassword(password, salt);
  return crypto.timingSafeEqual(
    Buffer.from(hash, 'hex'),
    Buffer.from(computedHash, 'hex')
  );
}

export function generateApiKey(): string {
  return EncryptionService.generateSecureToken(32);
}

export function maskSensitiveData(data: string, visibleChars: number = 4): string {
  if (data.length <= visibleChars * 2) {
    return '*'.repeat(data.length);
  }
  
  const start = data.substring(0, visibleChars);
  const end = data.substring(data.length - visibleChars);
  const middle = '*'.repeat(data.length - visibleChars * 2);
  
  return start + middle + end;
}