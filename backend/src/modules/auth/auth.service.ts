import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthRepository } from './auth.repository';
import { UsersRepository } from '../users/users.repository';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { RegisterDto, LoginDto } from './dto';
import * as bcrypt from 'bcryptjs';
import { User, Tenant } from '@prisma/client';

type UserWithTenant = User & { tenant: Tenant };

@Injectable()
export class AuthService {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly usersRepository: UsersRepository,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly auditLogsService: AuditLogsService,
  ) { }

  async register(dto: RegisterDto) {
    const existing = await this.usersRepository.findByEmail(dto.email);

    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = await this.authRepository.createTenantAndUser(dto, hashedPassword) as UserWithTenant;

    const tokens = await this.generateTokens(user.id, user.email);
    await this.authRepository.saveRefreshToken(user.id, tokens.refreshToken);

    await this.auditLogsService.createLog({
      userId: user.id,
      action: 'REGISTER',
      resource: 'User',
      details: { email: user.email, tenantId: user.tenant.id },
    });

    return { user, ...tokens };
  }

  async login(dto: LoginDto) {
    const user = await this.usersRepository.findByEmail(dto.email) as UserWithTenant;

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.generateTokens(user.id, user.email);
    await this.authRepository.saveRefreshToken(user.id, tokens.refreshToken);

    await this.auditLogsService.createLog({
      userId: user.id,
      action: 'LOGIN',
      resource: 'Auth',
      details: { email: user.email },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenant: { id: user.tenant.id, name: user.tenant.name },
      },
      ...tokens,
    };
  }

  /**
   * Refresh token with rotation (ลบ token เก่าก่อนสร้างใหม่)
   */
  async refreshToken(token: string) {
    try {
      // 1. Verify token
      const payload = await this.jwt.verifyAsync(token, {
        secret: this.config.get('JWT_REFRESH_SECRET'),
      });

      // 2. ตรวจสอบว่า token ยังอยู่ใน database
      const session = await this.authRepository.findSessionByToken(token);
      if (!session) {
        throw new UnauthorizedException('Token has been revoked');
      }

      // 3. ลบ token เก่า (Token Rotation)
      await this.authRepository.deleteRefreshToken(token);

      // 4. หา user
      const user = await this.usersRepository.findByEmail(payload.email);
      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      // 5. สร้าง tokens ใหม่
      const tokens = await this.generateTokens(user.id, user.email);
      await this.authRepository.saveRefreshToken(user.id, tokens.refreshToken);

      return tokens;
    } catch (e) {
      // ถ้า token ไม่ valid ลบทิ้งเพื่อความปลอดภัย
      await this.authRepository.deleteRefreshToken(token).catch(() => { });
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  /**
   * Logout - ลบ refresh token
   */
  async logout(userId: string, refreshToken?: string) {
    if (refreshToken) {
      // ลบเฉพาะ session นี้
      await this.authRepository.deleteRefreshToken(refreshToken);
    }

    await this.auditLogsService.createLog({
      userId,
      action: 'LOGOUT',
      resource: 'Auth',
      details: {},
    });

    return { message: 'Logged out successfully' };
  }

  /**
   * Logout from all devices
   */
  async logoutAll(userId: string) {
    await this.authRepository.revokeAllUserSessions(userId);

    await this.auditLogsService.createLog({
      userId,
      action: 'LOGOUT_ALL',
      resource: 'Auth',
      details: {},
    });

    return { message: 'Logged out from all devices' };
  }

  private async generateTokens(userId: string, email: string) {
    const accessExpiry = this.config.get<string>('JWT_ACCESS_EXPIRY', '15m');
    const refreshExpiry = this.config.get<string>('JWT_REFRESH_EXPIRY', '7d');

    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(
        { sub: userId, email },
        { secret: this.config.get('JWT_SECRET'), expiresIn: accessExpiry },
      ),
      this.jwt.signAsync(
        { sub: userId, email },
        { secret: this.config.get('JWT_REFRESH_SECRET'), expiresIn: refreshExpiry },
      ),
    ]);

    return { accessToken, refreshToken };
  }
}
