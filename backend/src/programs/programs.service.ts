import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ProgramStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProgramsService {
  constructor(private readonly prisma: PrismaService) {}

  private async ownedAthlete(coachId: string, athleteId: string) {
    const athlete = await this.prisma.athleteProfile.findUnique({ where: { id: athleteId } });
    if (!athlete) throw new NotFoundException('ATHLETE_NOT_FOUND');
    if (athlete.ownerCoachId !== coachId) throw new ForbiddenException('ATHLETE_NOT_OWNED');
    return athlete;
  }

  async list(coachId: string) {
    return this.prisma.program.findMany({
      where: { coachId },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true, title: true, status: true, createdAt: true, updatedAt: true,
        athlete: { select: { id: true, name: true, source: true } },
      },
    });
  }

  async latestDraft(coachId: string, athleteId: string) {
    await this.ownedAthlete(coachId, athleteId);
    return this.prisma.program.findFirst({
      where: { coachId, athleteId, status: ProgramStatus.DRAFT },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async saveDraft(coachId: string, body: any) {
    const athleteId = String(body?.athleteId || '');
    if (!athleteId || !body?.draftData || typeof body.draftData !== 'object') {
      throw new BadRequestException('ATHLETE_AND_DRAFT_REQUIRED');
    }
    const athlete = await this.ownedAthlete(coachId, athleteId);
    const title = String(body?.title || `برنامه ${athlete.name}`).trim() || `برنامه ${athlete.name}`;
    const programId = String(body?.programId || '').trim();

    if (programId) {
      const current = await this.prisma.program.findUnique({ where: { id: programId } });
      if (!current) throw new NotFoundException('PROGRAM_NOT_FOUND');
      if (current.coachId !== coachId) throw new ForbiddenException('PROGRAM_NOT_OWNED');
      if (current.status !== ProgramStatus.DRAFT) throw new BadRequestException('PROGRAM_IS_NOT_DRAFT');
      return this.prisma.program.update({
        where: { id: programId },
        data: { athleteId, title, draftData: body.draftData },
      });
    }

    return this.prisma.program.create({
      data: { coachId, athleteId, title, status: ProgramStatus.DRAFT, draftData: body.draftData },
    });
  }
}
