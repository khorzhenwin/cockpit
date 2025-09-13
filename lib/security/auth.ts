// Authentication and authorization utilities

import * as jwt from 'jsonwebtoken';
import { config } from '../config/environment';

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  permissions: string[];
  iat?: number;
  exp?: number;
}

export interface AuthResult {
  success: boolean;
  user?: {
    id: string;
    email: string;
    role: string;
    permissions: string[];
  };
  token?: string;
  error?: string;
}

export interface SessionData {
  userId: string;
  email: string;
  role: string;
  permissions: string[];
  lastActivity: Date;
  ipAddress?: string;
  userAgent?: string;
}

export class AuthService {
  static generateToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
    try {
      return jwt.sign(payload, config.JWT_SECRET, {
        expiresIn: config.JWT_EXPIRES_IN as string,
        issuer: 'cockpit-app',
        audience: 'cockpit-users'
      } as jwt.SignOptions);
    } catch (error: any) {
      throw new Error(`Token generation failed: ${error.message}`);
    }
  }

  static verifyToken(token: string): JWTPayload {
    try {
      return jwt.verify(token, config.JWT_SECRET, {
        issuer: 'cockpit-app',
        audience: 'cockpit-users'
      }) as JWTPayload;
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Token has expired');
      } else if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid token');
      } else {
        throw new Error(`Token verification failed: ${error.message}`);
      }
    }
  }

  static refreshToken(token: string): string {
    try {
      const payload = this.verifyToken(token);
      
      // Remove JWT-specific fields before regenerating
      const { iat, exp, aud, iss, ...userPayload } = payload;
      
      return this.generateToken(userPayload);
    } catch (error) {
      throw new Error(`Token refresh failed: ${error.message}`);
    }
  }

  static extractTokenFromHeader(authHeader: string): string | null {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    
    return authHeader.substring(7); // Remove 'Bearer ' prefix
  }

  static hasPermission(userPermissions: string[], requiredPermission: string): boolean {
    return userPermissions.includes(requiredPermission) || userPermissions.includes('admin');
  }

  static hasAnyPermission(userPermissions: string[], requiredPermissions: string[]): boolean {
    return requiredPermissions.some(permission => this.hasPermission(userPermissions, permission));
  }

  static hasAllPermissions(userPermissions: string[], requiredPermissions: string[]): boolean {
    return requiredPermissions.every(permission => this.hasPermission(userPermissions, permission));
  }
}

// Permission constants
export const PERMISSIONS = {
  // Data permissions
  READ_OWN_DATA: 'read:own_data',
  WRITE_OWN_DATA: 'write:own_data',
  DELETE_OWN_DATA: 'delete:own_data',
  
  // Insights permissions
  READ_INSIGHTS: 'read:insights',
  GENERATE_INSIGHTS: 'generate:insights',
  
  // Data source permissions
  CONNECT_DATA_SOURCES: 'connect:data_sources',
  MANAGE_DATA_SOURCES: 'manage:data_sources',
  
  // MCP permissions
  USE_MCP: 'use:mcp',
  CONFIGURE_MCP: 'configure:mcp',
  
  // Admin permissions
  ADMIN: 'admin',
  MANAGE_USERS: 'manage:users',
  VIEW_SYSTEM_METRICS: 'view:system_metrics'
} as const;

// Role definitions
export const ROLES = {
  USER: 'user',
  PREMIUM_USER: 'premium_user',
  ADMIN: 'admin'
} as const;

const USER_PERMISSIONS = [
  PERMISSIONS.READ_OWN_DATA,
  PERMISSIONS.WRITE_OWN_DATA,
  PERMISSIONS.READ_INSIGHTS,
  PERMISSIONS.CONNECT_DATA_SOURCES,
  PERMISSIONS.USE_MCP
];

export const ROLE_PERMISSIONS = {
  [ROLES.USER]: USER_PERMISSIONS,
  [ROLES.PREMIUM_USER]: [
    ...USER_PERMISSIONS,
    PERMISSIONS.DELETE_OWN_DATA,
    PERMISSIONS.GENERATE_INSIGHTS,
    PERMISSIONS.MANAGE_DATA_SOURCES,
    PERMISSIONS.CONFIGURE_MCP
  ],
  [ROLES.ADMIN]: [
    PERMISSIONS.ADMIN,
    PERMISSIONS.MANAGE_USERS,
    PERMISSIONS.VIEW_SYSTEM_METRICS
  ]
};

// Middleware helpers
export function requireAuth(requiredPermissions: string[] = []) {
  return (req: any, res: any, next?: any) => {
    try {
      const authHeader = req.headers.authorization;
      const token = AuthService.extractTokenFromHeader(authHeader);
      
      if (!token) {
        return res.status(401).json({ error: 'No token provided' });
      }
      
      const payload = AuthService.verifyToken(token);
      
      // Check permissions if required
      if (requiredPermissions.length > 0) {
        const hasPermission = AuthService.hasAnyPermission(payload.permissions, requiredPermissions);
        if (!hasPermission) {
          return res.status(403).json({ error: 'Insufficient permissions' });
        }
      }
      
      // Add user info to request
      req.user = {
        id: payload.userId,
        email: payload.email,
        role: payload.role,
        permissions: payload.permissions
      };
      
      if (next) {
        next();
      }
    } catch (error: any) {
      return res.status(401).json({ error: error.message });
    }
  };
}

export function requirePermissions(...permissions: string[]) {
  return requireAuth(permissions);
}

export function requireRole(role: string) {
  return (req: any, res: any, next: any) => {
    if (!req.user || req.user.role !== role) {
      return res.status(403).json({ error: 'Insufficient role' });
    }
    next();
  };
}

// Session management
export class SessionManager {
  private static sessions = new Map<string, SessionData>();
  private static readonly SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

  static createSession(sessionId: string, data: SessionData): void {
    this.sessions.set(sessionId, {
      ...data,
      lastActivity: new Date()
    });
  }

  static getSession(sessionId: string): SessionData | null {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      return null;
    }
    
    // Check if session has expired
    const now = new Date();
    const timeSinceLastActivity = now.getTime() - session.lastActivity.getTime();
    
    if (timeSinceLastActivity > this.SESSION_TIMEOUT) {
      this.sessions.delete(sessionId);
      return null;
    }
    
    // Update last activity
    session.lastActivity = now;
    this.sessions.set(sessionId, session);
    
    return session;
  }

  static updateSession(sessionId: string, updates: Partial<SessionData>): boolean {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      return false;
    }
    
    this.sessions.set(sessionId, {
      ...session,
      ...updates,
      lastActivity: new Date()
    });
    
    return true;
  }

  static destroySession(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }

  static cleanupExpiredSessions(): number {
    const now = new Date();
    let cleanedCount = 0;
    
    for (const [sessionId, session] of this.sessions.entries()) {
      const timeSinceLastActivity = now.getTime() - session.lastActivity.getTime();
      
      if (timeSinceLastActivity > this.SESSION_TIMEOUT) {
        this.sessions.delete(sessionId);
        cleanedCount++;
      }
    }
    
    return cleanedCount;
  }

  static getActiveSessions(): number {
    return this.sessions.size;
  }
}

// Start periodic session cleanup
setInterval(() => {
  const cleaned = SessionManager.cleanupExpiredSessions();
  if (cleaned > 0) {
    console.log(`Cleaned up ${cleaned} expired sessions`);
  }
}, 5 * 60 * 1000); // Every 5 minutes