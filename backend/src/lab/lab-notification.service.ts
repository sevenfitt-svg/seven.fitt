import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationStatus, NotificationType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LabNotificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async queueResultReady(params: {
    userId?: string | null;
    labResultId: string;
    phone: string;
    athleteName: string;
  }) {
    const appBase = (this.config.get<string>('PUBLIC_APP_URL') || 'https://sevenfitt.com').replace(/\/$/, '');
    const targetUrl = `${appBase}/student/index.html#results`;
    const message = `نتیجه ارزیابی شما در Seven.fitt آماده است. برای مشاهده و دانلود PDF وارد حساب خود شوید: ${targetUrl}`;

    return this.prisma.notification.create({
      data: {
        userId: params.userId || null,
        labResultId: params.labResultId,
        phone: params.phone,
        type: NotificationType.LAB_RESULT_READY,
        status: NotificationStatus.QUEUED,
        message,
        targetUrl,
        provider: this.config.get<string>('SMS_PROVIDER') || 'not-configured',
      },
    });
  }
}
