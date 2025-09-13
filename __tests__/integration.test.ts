import { describe, it, expect, beforeEach } from 'vitest';
import { AuthService, ROLES, ROLE_PERMISSIONS } from '../lib/security/auth';
import { hashPassword, verifyPassword } from '../lib/security/encryption';

// Simple integration test to verify the authentication flow works
describe('Authentication Integration', () => {
  it('should complete full authentication flow', async () => {
    // 1. Hash a password (simulating registration)
    const password = 'testpassword123';
    const { hash, salt } = hashPassword(password);
    
    expect(hash).toBeDefined();
    expect(salt).toBeDefined();
    
    // 2. Verify password (simulating login)
    const isValid = verifyPassword(password, hash, salt);
    expect(isValid).toBe(true);
    
    // 3. Generate JWT token
    const userPayload = {
      userId: 'test-user-123',
      email: 'test@example.com',
      role: ROLES.USER,
      permissions: ROLE_PERMISSIONS[ROLES.USER]
    };
    
    const token = AuthService.generateToken(userPayload);
    expect(token).toBeDefined();
    expect(typeof token).toBe('string');
    
    // 4. Verify JWT token
    const decoded = AuthService.verifyToken(token);
    expect(decoded.userId).toBe(userPayload.userId);
    expect(decoded.email).toBe(userPayload.email);
    expect(decoded.role).toBe(userPayload.role);
    expect(decoded.permissions).toEqual(userPayload.permissions);
    
    // 5. Check permissions
    const hasReadPermission = AuthService.hasPermission(
      decoded.permissions, 
      'read:own_data'
    );
    expect(hasReadPermission).toBe(true);
    
    const hasAdminPermission = AuthService.hasPermission(
      decoded.permissions, 
      'admin'
    );
    expect(hasAdminPermission).toBe(false);
  });

  it('should handle invalid credentials properly', () => {
    const password = 'testpassword123';
    const wrongPassword = 'wrongpassword';
    const { hash, salt } = hashPassword(password);
    
    // Should reject wrong password
    const isValid = verifyPassword(wrongPassword, hash, salt);
    expect(isValid).toBe(false);
    
    // Should reject invalid token
    expect(() => {
      AuthService.verifyToken('invalid.jwt.token');
    }).toThrow();
  });

  it('should handle user roles and permissions correctly', () => {
    // Test user permissions
    const userPermissions = ROLE_PERMISSIONS[ROLES.USER];
    expect(userPermissions).toContain('read:own_data');
    expect(userPermissions).toContain('write:own_data');
    expect(userPermissions).not.toContain('admin');
    
    // Test premium user permissions
    const premiumPermissions = ROLE_PERMISSIONS[ROLES.PREMIUM_USER];
    expect(premiumPermissions).toContain('delete:own_data');
    expect(premiumPermissions).toContain('generate:insights');
    
    // Test admin permissions
    const adminPermissions = ROLE_PERMISSIONS[ROLES.ADMIN];
    expect(adminPermissions).toContain('admin');
    expect(adminPermissions).toContain('manage:users');
  });
});