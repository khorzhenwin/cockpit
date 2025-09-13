// Database migration utilities

import { TableSchema, generateCreateTableSQL, ALL_SCHEMAS } from './schema';
import { DatabaseConnection } from './connection';

export interface Migration {
  id: string;
  name: string;
  version: number;
  up: (db: DatabaseConnection) => Promise<void>;
  down: (db: DatabaseConnection) => Promise<void>;
  createdAt: Date;
}

export interface MigrationRecord {
  id: string;
  name: string;
  version: number;
  executed_at: Date;
  checksum: string;
}

export class MigrationManager {
  private db: DatabaseConnection;
  private migrations: Migration[] = [];

  constructor(db: DatabaseConnection) {
    this.db = db;
    this.initializeMigrations();
  }

  private initializeMigrations(): void {
    // Initial schema migration
    this.migrations.push({
      id: '001',
      name: 'create_initial_schema',
      version: 1,
      up: async (db: DatabaseConnection) => {
        // Create migrations table first
        await db.query(`
          CREATE TABLE IF NOT EXISTS migrations (
            id VARCHAR(255) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            version INTEGER NOT NULL,
            executed_at TIMESTAMP DEFAULT NOW(),
            checksum VARCHAR(255) NOT NULL
          );
        `);

        // Create all core tables
        for (const schema of ALL_SCHEMAS) {
          const sql = generateCreateTableSQL(schema);
          await db.query(sql);
          
          // Create indexes
          for (const index of schema.indexes) {
            const indexType = index.type ? `USING ${index.type}` : '';
            const unique = index.unique ? 'UNIQUE' : '';
            const indexSql = `
              CREATE ${unique} INDEX ${index.name} 
              ON ${schema.name} ${indexType} (${index.columns.join(', ')});
            `;
            await db.query(indexSql);
          }
          
          // Add constraints
          for (const constraint of schema.constraints) {
            const constraintSql = `
              ALTER TABLE ${schema.name} 
              ADD CONSTRAINT ${constraint.name} ${constraint.definition};
            `;
            await db.query(constraintSql);
          }
        }
      },
      down: async (db: DatabaseConnection) => {
        // Drop tables in reverse order to handle foreign key constraints
        const tableNames = ALL_SCHEMAS.map(schema => schema.name).reverse();
        for (const tableName of tableNames) {
          await db.query(`DROP TABLE IF EXISTS ${tableName} CASCADE;`);
        }
        await db.query('DROP TABLE IF EXISTS migrations;');
      },
      createdAt: new Date()
    });

    // Add indexes for performance optimization
    this.migrations.push({
      id: '002',
      name: 'add_performance_indexes',
      version: 2,
      up: async (db: DatabaseConnection) => {
        // Additional composite indexes for common query patterns
        await db.query(`
          CREATE INDEX IF NOT EXISTS idx_life_data_user_timestamp_domain 
          ON life_data (user_id, timestamp DESC, domain);
        `);
        
        await db.query(`
          CREATE INDEX IF NOT EXISTS idx_insights_user_generated_impact 
          ON insights (user_id, generated_at DESC, impact);
        `);
        
        await db.query(`
          CREATE INDEX IF NOT EXISTS idx_recommendations_insight_priority_status 
          ON recommendations (insight_id, priority, status);
        `);
      },
      down: async (db: DatabaseConnection) => {
        await db.query('DROP INDEX IF EXISTS idx_life_data_user_timestamp_domain;');
        await db.query('DROP INDEX IF EXISTS idx_insights_user_generated_impact;');
        await db.query('DROP INDEX IF EXISTS idx_recommendations_insight_priority_status;');
      },
      createdAt: new Date()
    });

    // Add data retention and archival support
    this.migrations.push({
      id: '003',
      name: 'add_data_retention_support',
      version: 3,
      up: async (db: DatabaseConnection) => {
        // Add archived flag to life_data
        await db.query(`
          ALTER TABLE life_data 
          ADD COLUMN archived BOOLEAN DEFAULT FALSE;
        `);
        
        // Add retention policy to data_sources
        await db.query(`
          ALTER TABLE data_sources 
          ADD COLUMN retention_days INTEGER DEFAULT 365;
        `);
        
        // Create archived data index
        await db.query(`
          CREATE INDEX idx_life_data_archived 
          ON life_data (archived, created_at);
        `);
      },
      down: async (db: DatabaseConnection) => {
        await db.query('DROP INDEX IF EXISTS idx_life_data_archived;');
        await db.query('ALTER TABLE data_sources DROP COLUMN IF EXISTS retention_days;');
        await db.query('ALTER TABLE life_data DROP COLUMN IF EXISTS archived;');
      },
      createdAt: new Date()
    });
  }

  async runMigrations(): Promise<void> {
    console.log('Starting database migrations...');
    
    // Get executed migrations
    const executedMigrations = await this.getExecutedMigrations();
    const executedIds = new Set(executedMigrations.map(m => m.id));
    
    // Run pending migrations
    for (const migration of this.migrations) {
      if (!executedIds.has(migration.id)) {
        console.log(`Running migration: ${migration.name}`);
        
        try {
          await this.db.transaction(async (trx) => {
            await migration.up(this.db);
            
            // Record migration
            await trx.query(`
              INSERT INTO migrations (id, name, version, checksum) 
              VALUES (?, ?, ?, ?)
            `, [
              migration.id,
              migration.name,
              migration.version,
              this.calculateChecksum(migration)
            ]);
          });
          
          console.log(`Migration completed: ${migration.name}`);
        } catch (error) {
          console.error(`Migration failed: ${migration.name}`, error);
          throw error;
        }
      }
    }
    
    console.log('All migrations completed successfully');
  }

  async rollbackMigration(migrationId: string): Promise<void> {
    const migration = this.migrations.find(m => m.id === migrationId);
    if (!migration) {
      throw new Error(`Migration not found: ${migrationId}`);
    }
    
    console.log(`Rolling back migration: ${migration.name}`);
    
    try {
      await this.db.transaction(async (trx) => {
        await migration.down(this.db);
        
        // Remove migration record
        await trx.query('DELETE FROM migrations WHERE id = ?', [migrationId]);
      });
      
      console.log(`Migration rolled back: ${migration.name}`);
    } catch (error) {
      console.error(`Migration rollback failed: ${migration.name}`, error);
      throw error;
    }
  }

  async getExecutedMigrations(): Promise<MigrationRecord[]> {
    try {
      return await this.db.query<MigrationRecord>(`
        SELECT id, name, version, executed_at, checksum 
        FROM migrations 
        ORDER BY version ASC
      `);
    } catch (error) {
      // If migrations table doesn't exist, return empty array
      return [];
    }
  }

  async getMigrationStatus(): Promise<{
    executed: MigrationRecord[];
    pending: Migration[];
    total: number;
  }> {
    const executed = await this.getExecutedMigrations();
    const executedIds = new Set(executed.map(m => m.id));
    const pending = this.migrations.filter(m => !executedIds.has(m.id));
    
    return {
      executed,
      pending,
      total: this.migrations.length
    };
  }

  private calculateChecksum(migration: Migration): string {
    // Simple checksum calculation - in production, use a proper hash function
    const content = migration.name + migration.version + migration.up.toString();
    return Buffer.from(content).toString('base64').substring(0, 32);
  }

  async validateMigrations(): Promise<{
    valid: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];
    const executed = await this.getExecutedMigrations();
    
    for (const executedMigration of executed) {
      const migration = this.migrations.find(m => m.id === executedMigration.id);
      
      if (!migration) {
        errors.push(`Executed migration not found in code: ${executedMigration.id}`);
        continue;
      }
      
      const currentChecksum = this.calculateChecksum(migration);
      if (currentChecksum !== executedMigration.checksum) {
        errors.push(`Migration checksum mismatch: ${migration.id}`);
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
}

// Utility functions for migration management
export async function initializeDatabase(db: DatabaseConnection): Promise<void> {
  const migrationManager = new MigrationManager(db);
  await migrationManager.runMigrations();
}

export async function getMigrationStatus(db: DatabaseConnection) {
  const migrationManager = new MigrationManager(db);
  return migrationManager.getMigrationStatus();
}

export async function validateDatabase(db: DatabaseConnection) {
  const migrationManager = new MigrationManager(db);
  return migrationManager.validateMigrations();
}