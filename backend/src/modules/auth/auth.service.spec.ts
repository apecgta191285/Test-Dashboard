/**
 * Auth Service Unit Tests
 * @module auth.service.spec
 * @description Comprehensive tests for authentication including:
 *   - Login success/failure
 *   - Account lockout mechanism
 *   - Token refresh with rotation
 *   - Security field updates (lastLoginAt, lastLoginIp, failedLoginCount)
 */

import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthRepository } from './auth.repository';
import { UsersRepository } from '../users/users.repository';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

// =============================================================================
// Mock Data
// =============================================================================

const mockTenant = {
    id: 'tenant-001',
    name: 'Test Company',
    createdAt: new Date(),
    updatedAt: new Date(),
};

const createMockUser = (overrides = {}) => ({
    id: 'user-001',
    email: 'test@rga.com',
    password: bcrypt.hashSync('correct-password', 10),
    name: 'Test User',
    role: UserRole.ADMIN,
    tenantId: 'tenant-001',
    tenant: mockTenant,
    isActive: true,
    failedLoginCount: 0,
    lockedUntil: null,
    lastLoginAt: null,
    lastLoginIp: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
});

const mockRequest = {
    ip: '127.0.0.1',
    socket: { remoteAddress: '127.0.0.1' },
    headers: { 'user-agent': 'Jest Test Agent' },
} as any;

// =============================================================================
// Mock Implementations
// =============================================================================

const mockAuthRepository = {
    createTenantAndUser: jest.fn(),
    saveRefreshToken: jest.fn(),
    deleteRefreshToken: jest.fn(),
    revokeAllUserSessions: jest.fn(),
    findSessionByToken: jest.fn(),
};

const mockUsersRepository = {
    findByEmail: jest.fn(),
};

const mockJwtService = {
    signAsync: jest.fn().mockResolvedValue('mock-token'),
    verifyAsync: jest.fn(),
};

const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: string) => {
        const config: Record<string, string> = {
            JWT_SECRET: 'test-secret',
            JWT_REFRESH_SECRET: 'test-refresh-secret',
            JWT_ACCESS_EXPIRY: '15m',
            JWT_REFRESH_EXPIRY: '7d',
        };
        return config[key] || defaultValue;
    }),
};

const mockAuditLogsService = {
    createLog: jest.fn(),
};

const mockPrismaService = {
    user: {
        update: jest.fn(),
    },
    session: {
        create: jest.fn(),
        findUnique: jest.fn(),
        deleteMany: jest.fn(),
    },
};

// =============================================================================
// Test Suite
// =============================================================================

describe('AuthService', () => {
    let service: AuthService;
    let usersRepository: typeof mockUsersRepository;
    let prismaService: typeof mockPrismaService;

    beforeEach(async () => {
        jest.clearAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthService,
                { provide: AuthRepository, useValue: mockAuthRepository },
                { provide: UsersRepository, useValue: mockUsersRepository },
                { provide: JwtService, useValue: mockJwtService },
                { provide: ConfigService, useValue: mockConfigService },
                { provide: AuditLogsService, useValue: mockAuditLogsService },
                { provide: PrismaService, useValue: mockPrismaService },
            ],
        }).compile();

        service = module.get<AuthService>(AuthService);
        usersRepository = mockUsersRepository;
        prismaService = mockPrismaService;
    });

    // ===========================================================================
    // Login Tests
    // ===========================================================================

    describe('login', () => {
        // -------------------------------------------------------------------------
        // AUTH-001: Login Success
        // -------------------------------------------------------------------------
        describe('AUTH-001: Login with valid credentials', () => {
            it('should return accessToken, refreshToken, and user data', async () => {
                const mockUser = createMockUser();
                usersRepository.findByEmail.mockResolvedValue(mockUser);
                prismaService.user.update.mockResolvedValue(mockUser);
                mockJwtService.signAsync
                    .mockResolvedValueOnce('access-token-123')
                    .mockResolvedValueOnce('refresh-token-456');

                const result = await service.login(
                    { email: 'test@rga.com', password: 'correct-password' },
                    mockRequest,
                );

                expect(result).toHaveProperty('accessToken', 'access-token-123');
                expect(result).toHaveProperty('refreshToken', 'refresh-token-456');
                expect(result).toHaveProperty('user');
                expect(result.user.email).toBe('test@rga.com');
            });

            it('should reset failedLoginCount to 0 on successful login', async () => {
                const mockUser = createMockUser({ failedLoginCount: 3 });
                usersRepository.findByEmail.mockResolvedValue(mockUser);
                prismaService.user.update.mockResolvedValue(mockUser);

                await service.login(
                    { email: 'test@rga.com', password: 'correct-password' },
                    mockRequest,
                );

                expect(prismaService.user.update).toHaveBeenCalledWith(
                    expect.objectContaining({
                        data: expect.objectContaining({
                            failedLoginCount: 0,
                            lockedUntil: null,
                        }),
                    }),
                );
            });

            it('should update lastLoginAt on successful login', async () => {
                const mockUser = createMockUser();
                usersRepository.findByEmail.mockResolvedValue(mockUser);
                prismaService.user.update.mockResolvedValue(mockUser);

                await service.login(
                    { email: 'test@rga.com', password: 'correct-password' },
                    mockRequest,
                );

                expect(prismaService.user.update).toHaveBeenCalledWith(
                    expect.objectContaining({
                        data: expect.objectContaining({
                            lastLoginAt: expect.any(Date),
                        }),
                    }),
                );
            });

            it('should update lastLoginIp on successful login', async () => {
                const mockUser = createMockUser();
                usersRepository.findByEmail.mockResolvedValue(mockUser);
                prismaService.user.update.mockResolvedValue(mockUser);

                await service.login(
                    { email: 'test@rga.com', password: 'correct-password' },
                    mockRequest,
                );

                expect(prismaService.user.update).toHaveBeenCalledWith(
                    expect.objectContaining({
                        data: expect.objectContaining({
                            lastLoginIp: '127.0.0.1',
                        }),
                    }),
                );
            });
        });

        // -------------------------------------------------------------------------
        // AUTH-002: Wrong Password
        // -------------------------------------------------------------------------
        describe('AUTH-002: Login with wrong password', () => {
            it('should throw UnauthorizedException', async () => {
                const mockUser = createMockUser();
                usersRepository.findByEmail.mockResolvedValue(mockUser);
                prismaService.user.update.mockResolvedValue({
                    ...mockUser,
                    failedLoginCount: 1,
                });

                await expect(
                    service.login(
                        { email: 'test@rga.com', password: 'wrong-password' },
                        mockRequest,
                    ),
                ).rejects.toThrow(UnauthorizedException);
            });

            it('should increment failedLoginCount', async () => {
                const mockUser = createMockUser({ failedLoginCount: 0 });
                usersRepository.findByEmail.mockResolvedValue(mockUser);
                prismaService.user.update.mockResolvedValue({
                    ...mockUser,
                    failedLoginCount: 1,
                });

                try {
                    await service.login(
                        { email: 'test@rga.com', password: 'wrong-password' },
                        mockRequest,
                    );
                } catch (e) {
                    // Expected
                }

                expect(prismaService.user.update).toHaveBeenCalledWith(
                    expect.objectContaining({
                        data: expect.objectContaining({
                            failedLoginCount: 1,
                        }),
                    }),
                );
            });

            it('should increment failedLoginCount progressively', async () => {
                const mockUser = createMockUser({ failedLoginCount: 2 });
                usersRepository.findByEmail.mockResolvedValue(mockUser);
                prismaService.user.update.mockResolvedValue({
                    ...mockUser,
                    failedLoginCount: 3,
                });

                try {
                    await service.login(
                        { email: 'test@rga.com', password: 'wrong-password' },
                        mockRequest,
                    );
                } catch (e) {
                    // Expected
                }

                expect(prismaService.user.update).toHaveBeenCalledWith(
                    expect.objectContaining({
                        data: expect.objectContaining({
                            failedLoginCount: 3,
                        }),
                    }),
                );
            });
        });

        // -------------------------------------------------------------------------
        // AUTH-003: Non-existent Email
        // -------------------------------------------------------------------------
        describe('AUTH-003: Login with non-existent email', () => {
            it('should throw UnauthorizedException with generic message', async () => {
                usersRepository.findByEmail.mockResolvedValue(null);

                await expect(
                    service.login(
                        { email: 'nonexistent@rga.com', password: 'any-password' },
                        mockRequest,
                    ),
                ).rejects.toThrow(UnauthorizedException);
            });

            it('should not leak information about email existence', async () => {
                usersRepository.findByEmail.mockResolvedValue(null);

                try {
                    await service.login(
                        { email: 'nonexistent@rga.com', password: 'any-password' },
                        mockRequest,
                    );
                } catch (e: any) {
                    // Message should be generic, not "User not found"
                    expect(e.message).toBe('Invalid credentials');
                }
            });
        });

        // -------------------------------------------------------------------------
        // AUTH-004: Account Lockout After 5 Attempts
        // -------------------------------------------------------------------------
        describe('AUTH-004: Account lockout after 5 failed attempts', () => {
            it('should set lockedUntil after 5th failed attempt', async () => {
                const mockUser = createMockUser({ failedLoginCount: 4 });
                usersRepository.findByEmail.mockResolvedValue(mockUser);
                prismaService.user.update.mockResolvedValue({
                    ...mockUser,
                    failedLoginCount: 5,
                    lockedUntil: new Date(Date.now() + 30 * 60 * 1000),
                });

                try {
                    await service.login(
                        { email: 'test@rga.com', password: 'wrong-password' },
                        mockRequest,
                    );
                } catch (e) {
                    // Expected
                }

                expect(prismaService.user.update).toHaveBeenCalledWith(
                    expect.objectContaining({
                        data: expect.objectContaining({
                            failedLoginCount: 5,
                            lockedUntil: expect.any(Date),
                        }),
                    }),
                );
            });

            it('should not set lockedUntil before 5th attempt', async () => {
                const mockUser = createMockUser({ failedLoginCount: 3 });
                usersRepository.findByEmail.mockResolvedValue(mockUser);
                prismaService.user.update.mockResolvedValue({
                    ...mockUser,
                    failedLoginCount: 4,
                });

                try {
                    await service.login(
                        { email: 'test@rga.com', password: 'wrong-password' },
                        mockRequest,
                    );
                } catch (e) {
                    // Expected
                }

                expect(prismaService.user.update).toHaveBeenCalledWith(
                    expect.objectContaining({
                        data: expect.objectContaining({
                            failedLoginCount: 4,
                            lockedUntil: null,
                        }),
                    }),
                );
            });
        });

        // -------------------------------------------------------------------------
        // AUTH-005: Login While Account Locked
        // -------------------------------------------------------------------------
        describe('AUTH-005: Login while account is locked', () => {
            it('should throw UnauthorizedException with lock message', async () => {
                const lockedUntil = new Date(Date.now() + 10 * 60 * 1000); // Locked for 10 more mins
                const mockUser = createMockUser({
                    failedLoginCount: 5,
                    lockedUntil,
                });
                usersRepository.findByEmail.mockResolvedValue(mockUser);

                await expect(
                    service.login(
                        { email: 'test@rga.com', password: 'correct-password' },
                        mockRequest,
                    ),
                ).rejects.toThrow(/Account is locked/);
            });

            it('should include remaining lockout time in error message', async () => {
                const lockedUntil = new Date(Date.now() + 10 * 60 * 1000);
                const mockUser = createMockUser({
                    failedLoginCount: 5,
                    lockedUntil,
                });
                usersRepository.findByEmail.mockResolvedValue(mockUser);

                try {
                    await service.login(
                        { email: 'test@rga.com', password: 'correct-password' },
                        mockRequest,
                    );
                } catch (e: any) {
                    expect(e.message).toMatch(/\d+ minutes/);
                }
            });

            it('should not call password validation when locked', async () => {
                const lockedUntil = new Date(Date.now() + 10 * 60 * 1000);
                const mockUser = createMockUser({
                    failedLoginCount: 5,
                    lockedUntil,
                });
                usersRepository.findByEmail.mockResolvedValue(mockUser);

                try {
                    await service.login(
                        { email: 'test@rga.com', password: 'correct-password' },
                        mockRequest,
                    );
                } catch (e) {
                    // Expected
                }

                // prismaService.user.update should NOT be called because we rejected early
                expect(prismaService.user.update).not.toHaveBeenCalled();
            });
        });

        // -------------------------------------------------------------------------
        // AUTH-006: Login After Lockout Expires
        // -------------------------------------------------------------------------
        describe('AUTH-006: Login after lockout expires', () => {
            it('should allow login with correct password after lockout expires', async () => {
                const expiredLock = new Date(Date.now() - 1000); // Lockout expired 1 second ago
                const mockUser = createMockUser({
                    failedLoginCount: 5,
                    lockedUntil: expiredLock,
                });
                usersRepository.findByEmail.mockResolvedValue(mockUser);
                prismaService.user.update.mockResolvedValue({
                    ...mockUser,
                    failedLoginCount: 0,
                    lockedUntil: null,
                });

                const result = await service.login(
                    { email: 'test@rga.com', password: 'correct-password' },
                    mockRequest,
                );

                expect(result).toHaveProperty('accessToken');
            });
        });

        // -------------------------------------------------------------------------
        // AUTH-007: Inactive User
        // -------------------------------------------------------------------------
        describe('Inactive user login', () => {
            it('should reject login for inactive users', async () => {
                const mockUser = createMockUser({ isActive: false });
                usersRepository.findByEmail.mockResolvedValue(mockUser);

                await expect(
                    service.login(
                        { email: 'test@rga.com', password: 'correct-password' },
                        mockRequest,
                    ),
                ).rejects.toThrow(UnauthorizedException);
            });
        });
    });

    // ===========================================================================
    // Token Refresh Tests
    // ===========================================================================

    describe('refreshToken', () => {
        // -------------------------------------------------------------------------
        // AUTH-007 (Token): Token Refresh Success
        // -------------------------------------------------------------------------
        describe('AUTH-007: Token refresh with valid token', () => {
            it('should return new accessToken and refreshToken', async () => {
                const mockUser = createMockUser();
                mockJwtService.verifyAsync.mockResolvedValue({
                    sub: 'user-001',
                    email: 'test@rga.com',
                });
                mockAuthRepository.findSessionByToken.mockResolvedValue({
                    userId: 'user-001',
                });
                mockAuthRepository.deleteRefreshToken.mockResolvedValue(undefined);
                usersRepository.findByEmail.mockResolvedValue(mockUser);
                mockJwtService.signAsync
                    .mockResolvedValueOnce('new-access-token')
                    .mockResolvedValueOnce('new-refresh-token');

                const result = await service.refreshToken(
                    'valid-refresh-token',
                    mockRequest,
                );

                expect(result).toHaveProperty('accessToken', 'new-access-token');
                expect(result).toHaveProperty('refreshToken', 'new-refresh-token');
            });

            it('should delete old refresh token (rotation)', async () => {
                const mockUser = createMockUser();
                mockJwtService.verifyAsync.mockResolvedValue({
                    sub: 'user-001',
                    email: 'test@rga.com',
                });
                mockAuthRepository.findSessionByToken.mockResolvedValue({
                    userId: 'user-001',
                });
                usersRepository.findByEmail.mockResolvedValue(mockUser);

                await service.refreshToken('valid-refresh-token', mockRequest);

                expect(mockAuthRepository.deleteRefreshToken).toHaveBeenCalledWith(
                    'valid-refresh-token',
                );
            });

            it('should save new refresh token', async () => {
                const mockUser = createMockUser();
                mockJwtService.verifyAsync.mockResolvedValue({
                    sub: 'user-001',
                    email: 'test@rga.com',
                });
                mockAuthRepository.findSessionByToken.mockResolvedValue({
                    userId: 'user-001',
                });
                usersRepository.findByEmail.mockResolvedValue(mockUser);
                mockJwtService.signAsync
                    .mockResolvedValueOnce('new-access')
                    .mockResolvedValueOnce('new-refresh');

                await service.refreshToken('valid-refresh-token', mockRequest);

                expect(mockAuthRepository.saveRefreshToken).toHaveBeenCalledWith(
                    'user-001',
                    'new-refresh',
                    expect.any(String),
                    expect.any(String),
                );
            });
        });

        // -------------------------------------------------------------------------
        // AUTH-008: Expired Refresh Token
        // -------------------------------------------------------------------------
        describe('AUTH-008: Token refresh with expired token', () => {
            it('should throw UnauthorizedException', async () => {
                mockJwtService.verifyAsync.mockRejectedValue(
                    new Error('jwt expired'),
                );

                await expect(
                    service.refreshToken('expired-refresh-token', mockRequest),
                ).rejects.toThrow(UnauthorizedException);
            });
        });

        // -------------------------------------------------------------------------
        // AUTH-009: Invalid/Revoked Refresh Token
        // -------------------------------------------------------------------------
        describe('AUTH-009: Token refresh with revoked token', () => {
            it('should throw UnauthorizedException when token not in database', async () => {
                mockJwtService.verifyAsync.mockResolvedValue({
                    sub: 'user-001',
                    email: 'test@rga.com',
                });
                mockAuthRepository.findSessionByToken.mockResolvedValue(null);

                await expect(
                    service.refreshToken('revoked-token', mockRequest),
                ).rejects.toThrow(UnauthorizedException);
            });

            it('should throw with "Invalid refresh token" message for revoked token', async () => {
                mockJwtService.verifyAsync.mockResolvedValue({
                    sub: 'user-001',
                    email: 'test@rga.com',
                });
                mockAuthRepository.findSessionByToken.mockResolvedValue(null);

                try {
                    await service.refreshToken('revoked-token', mockRequest);
                    fail('Expected exception was not thrown');
                } catch (e: any) {
                    // Service catches 'Token has been revoked' and re-throws as 'Invalid refresh token'
                    expect(e.message).toBe('Invalid refresh token');
                }
            });
        });
    });

    // ===========================================================================
    // Logout Tests
    // ===========================================================================

    describe('logout', () => {
        it('should delete refresh token', async () => {
            await service.logout('user-001', 'refresh-token-123');

            expect(mockAuthRepository.deleteRefreshToken).toHaveBeenCalledWith(
                'refresh-token-123',
            );
        });

        it('should create audit log', async () => {
            await service.logout('user-001', 'refresh-token-123');

            expect(mockAuditLogsService.createLog).toHaveBeenCalledWith(
                expect.objectContaining({
                    userId: 'user-001',
                    action: 'LOGOUT',
                }),
            );
        });
    });

    describe('logoutAll', () => {
        it('should revoke all user sessions', async () => {
            await service.logoutAll('user-001');

            expect(mockAuthRepository.revokeAllUserSessions).toHaveBeenCalledWith(
                'user-001',
            );
        });
    });
});
