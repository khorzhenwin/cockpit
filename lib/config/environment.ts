// Environment configuration and validation

export interface EnvironmentConfig {
  // Application settings
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: number;
  HOST: string;
  
  // Database configuration
  DATABASE_URL: string;
  DATABASE_HOST: string;
  DATABASE_PORT: number;
  DATABASE_NAME: string;
  DATABASE_USER: string;
  DATABASE_PASSWORD: string;
  DATABASE_SSL: boolean;
  DATABASE_POOL_SIZE: number;
  
  // Security settings
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  ENCRYPTION_KEY: string;
  SESSION_SECRET: string;
  
  // MCP configuration
  MCP_SERVER_URL: string;
  MCP_API_KEY: string;
  MCP_TIMEOUT: number;
  
  // External API keys
  FINANCIAL_API_KEY?: string;
  CALENDAR_API_KEY?: string;
  HEALTH_API_KEY?: string;
  
  // Logging and monitoring
  LOG_LEVEL: 'error' | 'warn' | 'info' | 'debug';
  ENABLE_METRICS: boolean;
  SENTRY_DSN?: string;
  
  // Rate limiting
  RATE_LIMIT_WINDOW: number;
  RATE_LIMIT_MAX_REQUESTS: number;
  
  // Data retention
  DATA_RETENTION_DAYS: number;
  CLEANUP_INTERVAL_HOURS: number;
}

class EnvironmentValidator {
  private static requiredVars = [
    'DATABASE_URL',
    'JWT_SECRET',
    'ENCRYPTION_KEY',
    'SESSION_SECRET',
    'MCP_SERVER_URL'
  ];

  static validate(): EnvironmentConfig {
    const errors: string[] = [];
    
    // Check required variables
    for (const varName of this.requiredVars) {
      if (!process.env[varName]) {
        errors.push(`Missing required environment variable: ${varName}`);
      }
    }
    
    // Validate JWT secret strength
    if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
      errors.push('JWT_SECRET must be at least 32 characters long');
    }
    
    // Validate encryption key
    if (process.env.ENCRYPTION_KEY && process.env.ENCRYPTION_KEY.length < 32) {
      errors.push('ENCRYPTION_KEY must be at least 32 characters long');
    }
    
    if (errors.length > 0) {
      throw new Error(`Environment validation failed:\n${errors.join('\n')}`);
    }
    
    return this.parseConfig();
  }
  
  private static parseConfig(): EnvironmentConfig {
    return {
      // Application settings
      NODE_ENV: (process.env.NODE_ENV as any) || 'development',
      PORT: parseInt(process.env.PORT || '3000', 10),
      HOST: process.env.HOST || 'localhost',
      
      // Database configuration
      DATABASE_URL: process.env.DATABASE_URL!,
      DATABASE_HOST: process.env.DATABASE_HOST || 'localhost',
      DATABASE_PORT: parseInt(process.env.DATABASE_PORT || '5432', 10),
      DATABASE_NAME: process.env.DATABASE_NAME || 'cockpit',
      DATABASE_USER: process.env.DATABASE_USER || 'cockpit_user',
      DATABASE_PASSWORD: process.env.DATABASE_PASSWORD || '',
      DATABASE_SSL: process.env.DATABASE_SSL === 'true',
      DATABASE_POOL_SIZE: parseInt(process.env.DATABASE_POOL_SIZE || '10', 10),
      
      // Security settings
      JWT_SECRET: process.env.JWT_SECRET!,
      JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',
      ENCRYPTION_KEY: process.env.ENCRYPTION_KEY!,
      SESSION_SECRET: process.env.SESSION_SECRET!,
      
      // MCP configuration
      MCP_SERVER_URL: process.env.MCP_SERVER_URL!,
      MCP_API_KEY: process.env.MCP_API_KEY || '',
      MCP_TIMEOUT: parseInt(process.env.MCP_TIMEOUT || '30000', 10),
      
      // External API keys
      FINANCIAL_API_KEY: process.env.FINANCIAL_API_KEY,
      CALENDAR_API_KEY: process.env.CALENDAR_API_KEY,
      HEALTH_API_KEY: process.env.HEALTH_API_KEY,
      
      // Logging and monitoring
      LOG_LEVEL: (process.env.LOG_LEVEL as any) || 'info',
      ENABLE_METRICS: process.env.ENABLE_METRICS === 'true',
      SENTRY_DSN: process.env.SENTRY_DSN,
      
      // Rate limiting
      RATE_LIMIT_WINDOW: parseInt(process.env.RATE_LIMIT_WINDOW || '900000', 10), // 15 minutes
      RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
      
      // Data retention
      DATA_RETENTION_DAYS: parseInt(process.env.DATA_RETENTION_DAYS || '365', 10),
      CLEANUP_INTERVAL_HOURS: parseInt(process.env.CLEANUP_INTERVAL_HOURS || '24', 10)
    };
  }
}

// Export validated configuration
export const config = EnvironmentValidator.validate();

// Environment-specific configurations
export const isDevelopment = config.NODE_ENV === 'development';
export const isProduction = config.NODE_ENV === 'production';
export const isTest = config.NODE_ENV === 'test';

// Database configuration object
export const databaseConfig = {
  host: config.DATABASE_HOST,
  port: config.DATABASE_PORT,
  database: config.DATABASE_NAME,
  username: config.DATABASE_USER,
  password: config.DATABASE_PASSWORD,
  ssl: config.DATABASE_SSL,
  poolSize: config.DATABASE_POOL_SIZE
};

// Security configuration object
export const securityConfig = {
  jwtSecret: config.JWT_SECRET,
  jwtExpiresIn: config.JWT_EXPIRES_IN,
  encryptionKey: config.ENCRYPTION_KEY,
  sessionSecret: config.SESSION_SECRET,
  rateLimitWindow: config.RATE_LIMIT_WINDOW,
  rateLimitMaxRequests: config.RATE_LIMIT_MAX_REQUESTS
};

// MCP configuration object
export const mcpConfig = {
  serverUrl: config.MCP_SERVER_URL,
  apiKey: config.MCP_API_KEY,
  timeout: config.MCP_TIMEOUT
};