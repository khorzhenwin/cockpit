// Database connection utilities

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl?: boolean;
  poolSize?: number;
  connectionTimeout?: number;
}

export interface DatabaseConnection {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  query<T>(sql: string, params?: any[]): Promise<T[]>;
  transaction<T>(callback: (trx: Transaction) => Promise<T>): Promise<T>;
  healthCheck(): Promise<boolean>;
}

export interface Transaction {
  query<T>(sql: string, params?: any[]): Promise<T[]>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
}

export class DatabaseConnectionManager {
  private connection: DatabaseConnection | null = null;
  private config: DatabaseConfig;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // ms

  constructor(config: DatabaseConfig) {
    this.config = config;
  }

  async getConnection(): Promise<DatabaseConnection> {
    if (!this.connection || !this.connection.isConnected()) {
      await this.connect();
    }
    return this.connection!;
  }

  private async connect(): Promise<void> {
    try {
      // Implementation would depend on chosen database (PostgreSQL, MySQL, etc.)
      // This is a placeholder for the actual database connection logic
      console.log('Connecting to database...');
      
      // Reset reconnect attempts on successful connection
      this.reconnectAttempts = 0;
    } catch (error) {
      console.error('Database connection failed:', error);
      
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        console.log(`Retrying connection (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
        
        await new Promise(resolve => setTimeout(resolve, this.reconnectDelay));
        return this.connect();
      }
      
      throw new Error(`Failed to connect to database after ${this.maxReconnectAttempts} attempts`);
    }
  }

  async disconnect(): Promise<void> {
    if (this.connection) {
      await this.connection.disconnect();
      this.connection = null;
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const connection = await this.getConnection();
      return await connection.healthCheck();
    } catch (error) {
      console.error('Database health check failed:', error);
      return false;
    }
  }
}

// Singleton instance for application-wide use
let dbManager: DatabaseConnectionManager | null = null;

export function initializeDatabase(config: DatabaseConfig): void {
  dbManager = new DatabaseConnectionManager(config);
}

export function getDatabase(): DatabaseConnectionManager {
  if (!dbManager) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return dbManager;
}

// Database utility functions
export async function withTransaction<T>(
  callback: (trx: Transaction) => Promise<T>
): Promise<T> {
  const db = await getDatabase().getConnection();
  return db.transaction(callback);
}

export async function executeQuery<T>(
  sql: string, 
  params?: any[]
): Promise<T[]> {
  const db = await getDatabase().getConnection();
  return db.query<T>(sql, params);
}