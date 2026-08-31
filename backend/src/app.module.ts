import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { AthletesModule } from './athletes/athletes.module';
import { ProgramsModule } from './programs/programs.module';
import { LabModule } from './lab/lab.module';
import { HealthController } from './health.controller';

@Module({
  controllers: [HealthController],
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    AthletesModule,
    ProgramsModule,
    LabModule,
  ],
})
export class AppModule {}
