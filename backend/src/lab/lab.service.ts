import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  LabRequestStatus,
  LabResultStatus,
  LabTestType,
  Role,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { normalizePhone } from '../auth/auth.util';
import { LabResultStorageService } from './lab-result-storage.service';
import { LabNotificationService } from './lab-notification.service';

@Injectable()
export class LabService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: LabResultStorageService,
    private readonly notifications: LabNotificationService,
  ) {}

  catalog() {
    return [
      { code: LabTestType.VO2_GAS_ANALYSIS, title: 'آنالیز گازهای تنفسی / VO₂' },
      { code: LabTestType.WINGATE, title: 'تست Wingate' },
      { code: LabTestType.BODY_COMPOSITION, title: 'ترکیب بدنی' },
      { code: LabTestType.STRENGTH_1RM, title: 'ارزیابی قدرت / 1RM' },
      { code: LabTestType.JUMP_POWER, title: 'پرش و توان انفجاری' },
      { code: LabTestType.SPEED_AGILITY, title: 'سرعت و چابکی' },
      { code: LabTestType.OTHER, title: 'سایر تست‌ها' },
    ];
  }

  private parseType(value: any): LabTestType {
    const v = String(value || '').trim() as LabTestType;
    if (!Object.values(LabTestType).includes(v)) throw new BadRequestException('INVALID_TEST_TYPE');
    return v;
  }

  private dateOrNull(value: any): Date | null {
    if (!value) return null;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) throw new BadRequestException('INVALID_DATE');
    return d;
  }

  async createPublicRequest(body: any) {
    const requesterName = String(body?.name || '').trim();
    const phone = normalizePhone(body?.phone);
    if (requesterName.length < 2) throw new BadRequestException('NAME_REQUIRED');
    if (!/^\+98\d{10}$/.test(phone)) throw new BadRequestException('VALID_IRAN_PHONE_REQUIRED');

    const item = await this.prisma.labTestRequest.create({
      data: {
        requesterName,
        phone,
        testType: this.parseType(body?.testType),
        preferredDate: this.dateOrNull(body?.preferredDate),
        note: String(body?.note || '').trim().slice(0, 2000) || null,
      },
      select: { id: true, status: true, createdAt: true, testType: true },
    });
    return { ...item, requestCode: item.id.slice(0, 8).toUpperCase() };
  }

  async searchAthletes(query: string) {
    const q = String(query || '').trim();
    return this.prisma.athleteProfile.findMany({
      where: q ? {
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { phone: { contains: q } },
        ],
      } : undefined,
      take: 100,
      orderBy: { updatedAt: 'desc' },
      select: { id: true, name: true, phone: true, source: true, userId: true, ownerCoachId: true },
    });
  }

  async listRequests() {
    return this.prisma.labTestRequest.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        athlete: { select: { id: true, name: true, phone: true, userId: true } },
        result: { select: { id: true, status: true, title: true, releasedAt: true } },
      },
    });
  }

  async getRequest(id: string) {
    const row = await this.prisma.labTestRequest.findUnique({
      where: { id },
      include: {
        athlete: { select: { id: true, name: true, phone: true, userId: true, ownerCoachId: true } },
        result: true,
      },
    });
    if (!row) throw new NotFoundException('LAB_REQUEST_NOT_FOUND');
    return row;
  }

  async updateRequest(id: string, body: any) {
    await this.getRequest(id);
    const data: any = {};
    if (body?.status) {
      const s = String(body.status) as LabRequestStatus;
      if (!Object.values(LabRequestStatus).includes(s)) throw new BadRequestException('INVALID_REQUEST_STATUS');
      data.status = s;
      if (s === LabRequestStatus.COMPLETED) data.completedAt = new Date();
    }
    if ('scheduledAt' in (body || {})) data.scheduledAt = this.dateOrNull(body.scheduledAt);
    if ('note' in (body || {})) data.note = String(body.note || '').trim().slice(0, 2000) || null;
    return this.prisma.labTestRequest.update({ where: { id }, data });
  }

  async attachAthlete(requestId: string, athleteId: string) {
    const request = await this.getRequest(requestId);
    const athlete = await this.prisma.athleteProfile.findUnique({ where: { id: athleteId } });
    if (!athlete) throw new NotFoundException('ATHLETE_NOT_FOUND');
    if (request.result && request.result.athleteId !== athleteId) {
      throw new BadRequestException('RESULT_ALREADY_ATTACHED_TO_ANOTHER_ATHLETE');
    }
    return this.prisma.labTestRequest.update({
      where: { id: requestId },
      data: { athleteId },
      include: { athlete: true },
    });
  }

  async uploadResult(requestId: string, body: any, file: Express.Multer.File) {
    const request = await this.getRequest(requestId);
    const athleteId = String(body?.athleteId || request.athleteId || '').trim();
    if (!athleteId) throw new BadRequestException('ATTACH_ATHLETE_FIRST');
    const athlete = await this.prisma.athleteProfile.findUnique({ where: { id: athleteId } });
    if (!athlete) throw new NotFoundException('ATHLETE_NOT_FOUND');

    const stored = await this.storage.savePdf(file);
    const title = String(body?.title || `نتیجه ارزیابی ${request.requesterName}`).trim().slice(0, 250);
    const summary = String(body?.summary || '').trim().slice(0, 5000) || null;

    const result = await this.prisma.labResult.upsert({
      where: { requestId },
      create: {
        requestId,
        athleteId,
        title,
        summary,
        pdfKey: stored.key,
        pdfOriginalName: stored.originalName,
        mimeType: stored.mimeType,
        fileSize: stored.fileSize,
        status: LabResultStatus.DRAFT,
      },
      update: {
        athleteId,
        title,
        summary,
        pdfKey: stored.key,
        pdfOriginalName: stored.originalName,
        mimeType: stored.mimeType,
        fileSize: stored.fileSize,
        status: LabResultStatus.DRAFT,
        releasedAt: null,
        releasedById: null,
      },
    });

    await this.prisma.labTestRequest.update({
      where: { id: requestId },
      data: { athleteId, status: LabRequestStatus.RESULT_DRAFT },
    });
    return result;
  }

  async releaseResult(resultId: string, releasedById: string) {
    const result = await this.prisma.labResult.findUnique({
      where: { id: resultId },
      include: {
        athlete: { include: { user: true } },
        request: true,
      },
    });
    if (!result) throw new NotFoundException('LAB_RESULT_NOT_FOUND');
    if (result.status === LabResultStatus.RELEASED) {
      return { result, notificationQueued: false, alreadyReleased: true };
    }
    await this.storage.stat(result.pdfKey);

    const released = await this.prisma.$transaction(async tx => {
      const out = await tx.labResult.update({
        where: { id: resultId },
        data: { status: LabResultStatus.RELEASED, releasedAt: new Date(), releasedById },
      });
      await tx.labTestRequest.update({
        where: { id: result.requestId },
        data: { status: LabRequestStatus.RESULT_READY },
      });
      return out;
    });

    const phone = normalizePhone(result.athlete.user?.phone || result.athlete.phone || result.request.phone);
    if (/^\+98\d{10}$/.test(phone)) {
      await this.notifications.queueResultReady({
        userId: result.athlete.userId,
        labResultId: result.id,
        phone,
        athleteName: result.athlete.name,
      });
    }
    return { result: released, notificationQueued: /^\+98\d{10}$/.test(phone) };
  }

  async myResults(userId: string) {
    const athlete = await this.prisma.athleteProfile.findUnique({ where: { userId } });
    if (!athlete) return [];
    return this.prisma.labResult.findMany({
      where: { athleteId: athlete.id, status: LabResultStatus.RELEASED },
      orderBy: { releasedAt: 'desc' },
      select: {
        id: true,
        title: true,
        summary: true,
        pdfOriginalName: true,
        fileSize: true,
        releasedAt: true,
        request: { select: { testType: true, completedAt: true } },
      },
    });
  }

  async resultForDownload(resultId: string, user: any) {
    const result = await this.prisma.labResult.findUnique({
      where: { id: resultId },
      include: { athlete: true },
    });
    if (!result) throw new NotFoundException('LAB_RESULT_NOT_FOUND');

    const elevated = [Role.OWNER, Role.ADMIN, Role.LAB_STAFF].includes(user.role);
    const ownAthlete = user.role === Role.ATHLETE && result.athlete.userId === user.sub;
    const ownCoach = user.role === Role.COACH && result.athlete.ownerCoachId === user.sub;
    if (!elevated && !ownAthlete && !ownCoach) throw new ForbiddenException('RESULT_ACCESS_DENIED');
    if (user.role === Role.ATHLETE && result.status !== LabResultStatus.RELEASED) {
      throw new ForbiddenException('RESULT_NOT_RELEASED');
    }
    await this.storage.stat(result.pdfKey);
    return result;
  }
}
