import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto';
import { User, UserRole } from '@prisma/client';

export abstract class AuthRepository {
    abstract createTenantAndUser(dto: RegisterDto, hashedPassword: string): Promise<User>;
    abstract saveRefreshToken(
        userId: string,
        refreshToken: string,
        ipAddress?: string | null,
        userAgent?: string | null,
    ): Promise<void>;
    abstract deleteRefreshToken(token: string): Promise<void>;
    abstract revokeAllUserSessions(userId: string): Promise<void>;
    abstract findSessionByToken(token: string): Promise<{ userId: string } | null>;
}

@Injectable()
export class PrismaAuthRepository implements AuthRepository {
    constructor(private readonly prisma: PrismaService) { }

    async createTenantAndUser(dto: RegisterDto, hashedPassword: string): Promise<User> {
        return this.prisma.$transaction(async (tx) => {
            const tenant = await tx.tenant.create({
                data: { name: dto.companyName },
            });

            return tx.user.create({
                data: {
                    email: dto.email,
                    password: hashedPassword,
                    name: dto.name,
                    role: UserRole.ADMIN,
                    tenantId: tenant.id,
                },
                include: { tenant: true },
            });
        });
    }

    /**
     * Save refresh token with optional IP and UserAgent tracking
     */
    async saveRefreshToken(
        userId: string,
        refreshToken: string,
        ipAddress?: string | null,
        userAgent?: string | null,
    ): Promise<void> {
        await this.prisma.session.create({
            data: {
                userId,
                refreshToken,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                ipAddress: ipAddress || null,
                userAgent: userAgent || null,
            },
        });
    }

    /**
     * ลบ refresh token เฉพาะตัว (Token Rotation)
     */
    async deleteRefreshToken(token: string): Promise<void> {
        await this.prisma.session.deleteMany({
            where: { refreshToken: token },
        });
    }

    /**
     * ลบ sessions ทั้งหมดของ user (Logout All Devices)
     */
    async revokeAllUserSessions(userId: string): Promise<void> {
        await this.prisma.session.deleteMany({
            where: { userId },
        });
    }

    /**
     * หา session จาก refresh token
     */
    async findSessionByToken(token: string): Promise<{ userId: string } | null> {
        return this.prisma.session.findUnique({
            where: { refreshToken: token },
            select: { userId: true },
        });
    }
}
