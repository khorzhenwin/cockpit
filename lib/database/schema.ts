// Database schema definitions

export interface TableSchema {
  name: string;
  columns: ColumnDefinition[];
  indexes: IndexDefinition[];
  constraints: ConstraintDefinition[];
}

export interface ColumnDefinition {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue?: any;
  primaryKey?: boolean;
  unique?: boolean;
  references?: {
    table: string;
    column: string;
  };
}

export interface IndexDefinition {
  name: string;
  columns: string[];
  unique: boolean;
  type?: 'btree' | 'hash' | 'gin' | 'gist';
}

export interface ConstraintDefinition {
  name: string;
  type: 'foreign_key' | 'check' | 'unique';
  definition: string;
}

// Core table schemas
export const USER_TABLE: TableSchema = {
  name: 'users',
  columns: [
    { name: 'id', type: 'UUID', nullable: false, primaryKey: true },
    { name: 'profile', type: 'JSONB', nullable: false },
    { name: 'preferences', type: 'JSONB', nullable: false },
    { name: 'privacy_settings', type: 'JSONB', nullable: false },
    { name: 'created_at', type: 'TIMESTAMP', nullable: false, defaultValue: 'NOW()' },
    { name: 'last_active', type: 'TIMESTAMP', nullable: false, defaultValue: 'NOW()' },
    { name: 'updated_at', type: 'TIMESTAMP', nullable: false, defaultValue: 'NOW()' }
  ],
  indexes: [
    { name: 'idx_users_last_active', columns: ['last_active'], unique: false },
    { name: 'idx_users_created_at', columns: ['created_at'], unique: false }
  ],
  constraints: []
};

export const DATA_SOURCES_TABLE: TableSchema = {
  name: 'data_sources',
  columns: [
    { name: 'id', type: 'UUID', nullable: false, primaryKey: true },
    { name: 'user_id', type: 'UUID', nullable: false, references: { table: 'users', column: 'id' } },
    { name: 'type', type: 'VARCHAR(50)', nullable: false },
    { name: 'name', type: 'VARCHAR(255)', nullable: false },
    { name: 'provider', type: 'VARCHAR(255)', nullable: false },
    { name: 'status', type: 'VARCHAR(50)', nullable: false },
    { name: 'credentials', type: 'TEXT', nullable: true }, // Encrypted
    { name: 'sync_frequency', type: 'VARCHAR(50)', nullable: false },
    { name: 'data_types', type: 'JSONB', nullable: false },
    { name: 'last_sync', type: 'TIMESTAMP', nullable: true },
    { name: 'next_sync', type: 'TIMESTAMP', nullable: true },
    { name: 'error_message', type: 'TEXT', nullable: true },
    { name: 'created_at', type: 'TIMESTAMP', nullable: false, defaultValue: 'NOW()' },
    { name: 'updated_at', type: 'TIMESTAMP', nullable: false, defaultValue: 'NOW()' }
  ],
  indexes: [
    { name: 'idx_data_sources_user_id', columns: ['user_id'], unique: false },
    { name: 'idx_data_sources_type', columns: ['type'], unique: false },
    { name: 'idx_data_sources_status', columns: ['status'], unique: false },
    { name: 'idx_data_sources_next_sync', columns: ['next_sync'], unique: false }
  ],
  constraints: [
    {
      name: 'fk_data_sources_user_id',
      type: 'foreign_key',
      definition: 'FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE'
    }
  ]
};

export const LIFE_DATA_TABLE: TableSchema = {
  name: 'life_data',
  columns: [
    { name: 'id', type: 'UUID', nullable: false, primaryKey: true },
    { name: 'user_id', type: 'UUID', nullable: false, references: { table: 'users', column: 'id' } },
    { name: 'domain', type: 'VARCHAR(50)', nullable: false },
    { name: 'timestamp', type: 'TIMESTAMP', nullable: false },
    { name: 'data', type: 'JSONB', nullable: false },
    { name: 'source_id', type: 'UUID', nullable: false, references: { table: 'data_sources', column: 'id' } },
    { name: 'confidence', type: 'DECIMAL(3,2)', nullable: false },
    { name: 'tags', type: 'JSONB', nullable: false, defaultValue: '[]' },
    { name: 'metadata', type: 'JSONB', nullable: true },
    { name: 'created_at', type: 'TIMESTAMP', nullable: false, defaultValue: 'NOW()' }
  ],
  indexes: [
    { name: 'idx_life_data_user_id', columns: ['user_id'], unique: false },
    { name: 'idx_life_data_domain', columns: ['domain'], unique: false },
    { name: 'idx_life_data_timestamp', columns: ['timestamp'], unique: false },
    { name: 'idx_life_data_user_domain_timestamp', columns: ['user_id', 'domain', 'timestamp'], unique: false },
    { name: 'idx_life_data_tags', columns: ['tags'], unique: false, type: 'gin' },
    { name: 'idx_life_data_data', columns: ['data'], unique: false, type: 'gin' }
  ],
  constraints: [
    {
      name: 'fk_life_data_user_id',
      type: 'foreign_key',
      definition: 'FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE'
    },
    {
      name: 'fk_life_data_source_id',
      type: 'foreign_key',
      definition: 'FOREIGN KEY (source_id) REFERENCES data_sources(id) ON DELETE CASCADE'
    },
    {
      name: 'chk_life_data_confidence',
      type: 'check',
      definition: 'CHECK (confidence >= 0 AND confidence <= 1)'
    }
  ]
};

export const INSIGHTS_TABLE: TableSchema = {
  name: 'insights',
  columns: [
    { name: 'id', type: 'UUID', nullable: false, primaryKey: true },
    { name: 'user_id', type: 'UUID', nullable: false, references: { table: 'users', column: 'id' } },
    { name: 'type', type: 'VARCHAR(50)', nullable: false },
    { name: 'title', type: 'VARCHAR(255)', nullable: false },
    { name: 'description', type: 'TEXT', nullable: false },
    { name: 'impact', type: 'VARCHAR(50)', nullable: false },
    { name: 'confidence', type: 'DECIMAL(3,2)', nullable: false },
    { name: 'supporting_data_ids', type: 'JSONB', nullable: false },
    { name: 'generated_at', type: 'TIMESTAMP', nullable: false, defaultValue: 'NOW()' },
    { name: 'expires_at', type: 'TIMESTAMP', nullable: true },
    { name: 'domain', type: 'VARCHAR(50)', nullable: false },
    { name: 'cross_domain_effects', type: 'JSONB', nullable: true },
    { name: 'tags', type: 'JSONB', nullable: false, defaultValue: '[]' },
    { name: 'metadata', type: 'JSONB', nullable: true },
    { name: 'status', type: 'VARCHAR(50)', nullable: false, defaultValue: 'active' }
  ],
  indexes: [
    { name: 'idx_insights_user_id', columns: ['user_id'], unique: false },
    { name: 'idx_insights_type', columns: ['type'], unique: false },
    { name: 'idx_insights_domain', columns: ['domain'], unique: false },
    { name: 'idx_insights_generated_at', columns: ['generated_at'], unique: false },
    { name: 'idx_insights_expires_at', columns: ['expires_at'], unique: false },
    { name: 'idx_insights_status', columns: ['status'], unique: false },
    { name: 'idx_insights_tags', columns: ['tags'], unique: false, type: 'gin' }
  ],
  constraints: [
    {
      name: 'fk_insights_user_id',
      type: 'foreign_key',
      definition: 'FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE'
    },
    {
      name: 'chk_insights_confidence',
      type: 'check',
      definition: 'CHECK (confidence >= 0 AND confidence <= 1)'
    }
  ]
};

export const RECOMMENDATIONS_TABLE: TableSchema = {
  name: 'recommendations',
  columns: [
    { name: 'id', type: 'UUID', nullable: false, primaryKey: true },
    { name: 'insight_id', type: 'UUID', nullable: false, references: { table: 'insights', column: 'id' } },
    { name: 'action', type: 'TEXT', nullable: false },
    { name: 'reasoning', type: 'TEXT', nullable: false },
    { name: 'priority', type: 'VARCHAR(50)', nullable: false },
    { name: 'estimated_effort', type: 'VARCHAR(50)', nullable: false },
    { name: 'expected_outcome', type: 'TEXT', nullable: false },
    { name: 'cross_domain_impacts', type: 'JSONB', nullable: false },
    { name: 'timeline', type: 'JSONB', nullable: true },
    { name: 'prerequisites', type: 'JSONB', nullable: true },
    { name: 'risks', type: 'JSONB', nullable: true },
    { name: 'alternatives', type: 'JSONB', nullable: true },
    { name: 'metrics', type: 'JSONB', nullable: true },
    { name: 'status', type: 'VARCHAR(50)', nullable: false, defaultValue: 'pending' },
    { name: 'created_at', type: 'TIMESTAMP', nullable: false, defaultValue: 'NOW()' },
    { name: 'updated_at', type: 'TIMESTAMP', nullable: false, defaultValue: 'NOW()' }
  ],
  indexes: [
    { name: 'idx_recommendations_insight_id', columns: ['insight_id'], unique: false },
    { name: 'idx_recommendations_priority', columns: ['priority'], unique: false },
    { name: 'idx_recommendations_status', columns: ['status'], unique: false },
    { name: 'idx_recommendations_created_at', columns: ['created_at'], unique: false }
  ],
  constraints: [
    {
      name: 'fk_recommendations_insight_id',
      type: 'foreign_key',
      definition: 'FOREIGN KEY (insight_id) REFERENCES insights(id) ON DELETE CASCADE'
    }
  ]
};

export const PATTERNS_TABLE: TableSchema = {
  name: 'patterns',
  columns: [
    { name: 'id', type: 'UUID', nullable: false, primaryKey: true },
    { name: 'user_id', type: 'UUID', nullable: false, references: { table: 'users', column: 'id' } },
    { name: 'domain', type: 'VARCHAR(50)', nullable: false },
    { name: 'pattern_type', type: 'VARCHAR(100)', nullable: false },
    { name: 'timeframe_start', type: 'TIMESTAMP', nullable: false },
    { name: 'timeframe_end', type: 'TIMESTAMP', nullable: false },
    { name: 'confidence', type: 'DECIMAL(3,2)', nullable: false },
    { name: 'significance', type: 'DECIMAL(3,2)', nullable: false },
    { name: 'pattern_data', type: 'JSONB', nullable: false },
    { name: 'trends', type: 'JSONB', nullable: false },
    { name: 'anomalies', type: 'JSONB', nullable: false },
    { name: 'created_at', type: 'TIMESTAMP', nullable: false, defaultValue: 'NOW()' },
    { name: 'updated_at', type: 'TIMESTAMP', nullable: false, defaultValue: 'NOW()' }
  ],
  indexes: [
    { name: 'idx_patterns_user_id', columns: ['user_id'], unique: false },
    { name: 'idx_patterns_domain', columns: ['domain'], unique: false },
    { name: 'idx_patterns_type', columns: ['pattern_type'], unique: false },
    { name: 'idx_patterns_timeframe', columns: ['timeframe_start', 'timeframe_end'], unique: false },
    { name: 'idx_patterns_confidence', columns: ['confidence'], unique: false },
    { name: 'idx_patterns_data', columns: ['pattern_data'], unique: false, type: 'gin' }
  ],
  constraints: [
    {
      name: 'fk_patterns_user_id',
      type: 'foreign_key',
      definition: 'FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE'
    },
    {
      name: 'chk_patterns_confidence',
      type: 'check',
      definition: 'CHECK (confidence >= 0 AND confidence <= 1)'
    },
    {
      name: 'chk_patterns_significance',
      type: 'check',
      definition: 'CHECK (significance >= 0 AND significance <= 1)'
    }
  ]
};

// Export all schemas for migration purposes
export const ALL_SCHEMAS: TableSchema[] = [
  USER_TABLE,
  DATA_SOURCES_TABLE,
  LIFE_DATA_TABLE,
  INSIGHTS_TABLE,
  RECOMMENDATIONS_TABLE,
  PATTERNS_TABLE
];

// Schema validation utilities
export function validateSchema(schema: TableSchema): string[] {
  const errors: string[] = [];
  
  if (!schema.name) {
    errors.push('Table name is required');
  }
  
  if (!schema.columns || schema.columns.length === 0) {
    errors.push('At least one column is required');
  }
  
  const primaryKeys = schema.columns.filter(col => col.primaryKey);
  if (primaryKeys.length === 0) {
    errors.push('At least one primary key column is required');
  }
  
  // Check for duplicate column names
  const columnNames = schema.columns.map(col => col.name);
  const duplicates = columnNames.filter((name, index) => columnNames.indexOf(name) !== index);
  if (duplicates.length > 0) {
    errors.push(`Duplicate column names: ${duplicates.join(', ')}`);
  }
  
  return errors;
}

export function generateCreateTableSQL(schema: TableSchema): string {
  let columns = schema.columns.map(col => {
    let sql = `${col.name} ${col.type}`;
    
    if (!col.nullable) {
      sql += ' NOT NULL';
    }
    
    if (col.defaultValue !== undefined) {
      sql += ` DEFAULT ${col.defaultValue}`;
    }
    
    if (col.unique) {
      sql += ' UNIQUE';
    }
    
    return sql;
  }).join(',\n  ');
  
  const primaryKeys = schema.columns.filter(col => col.primaryKey).map(col => col.name);
  if (primaryKeys.length > 0) {
    columns += `,\n  PRIMARY KEY (${primaryKeys.join(', ')})`;
  }
  
  return `CREATE TABLE ${schema.name} (\n  ${columns}\n);`;
}