import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { MockDataSeederService } from './mock-data-seeder.service';
import { DevController } from './dev.controller';

@Module({
    imports: [PrismaModule],
    controllers: [DevController],
    providers: [MockDataSeederService],
    exports: [MockDataSeederService],
})
export class MockDataModule { }
