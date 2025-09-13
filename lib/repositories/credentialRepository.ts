// Credential Repository implementation

import { StoredCredential, CredentialRepository as ICredentialRepository } from '../security/credentialStorage';
import { v4 as uuidv4 } from 'uuid';

// Mock implementation - in production this would use a real database
export class CredentialRepository implements ICredentialRepository {
  private credentials: Map<string, StoredCredential> = new Map();

  async create(credential: StoredCredential): Promise<void> {
    this.credentials.set(credential.id, credential);
  }

  async findById(id: string): Promise<StoredCredential | null> {
    return this.credentials.get(id) || null;
  }

  async findByUserId(userId: string): Promise<StoredCredential[]> {
    return Array.from(this.credentials.values()).filter(cred => cred.userId === userId);
  }

  async update(id: string, updates: Partial<StoredCredential>): Promise<void> {
    const credential = this.credentials.get(id);
    if (credential) {
      Object.assign(credential, updates);
      this.credentials.set(id, credential);
    }
  }

  async delete(id: string): Promise<void> {
    this.credentials.delete(id);
  }
}