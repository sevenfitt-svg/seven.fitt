import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { LabController } from './lab.controller';
import { LabService } from './lab.service';
import { LabResultStorageService } from './lab-result-storage.service';
import { LabNotificationService } from './lab-notification.service';

@Module({
  imports: [AuthModule],
  controllers: [LabController],
  providers: [LabService, LabResultStorageService, LabNotificationService],
})
export class LabModule {}
