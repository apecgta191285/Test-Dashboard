import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditLogsService {
    constructor(private prisma: PrismaService) { }

    async createLog(data: {
        userId?: string;
        action: string;
        resource: string;
        details?: any;
        ipAddress?: string;
        userAgent?: string;
    }) {
        try {
            await this.prisma.auditLog.create({
                data: {
                    ...data,
                    details: data.details ? JSON.stringify(data.details) : null,
                },
            });
        } catch (error) {
            console.error('Failed to create audit log:', error);
            // Don't throw error to prevent blocking the main request
        }
    }
}
