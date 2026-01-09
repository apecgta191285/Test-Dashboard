import { Module, Global } from '@nestjs/common';
import { AuditLogsService } from './audit-logs.service';
import { PrismaModule } from '../prisma/prisma.module';

@Global()
@Module({
    imports: [PrismaModule],
    providers: [AuditLogsService],
    exports: [AuditLogsService],
})
export class AuditLogsModule { }
