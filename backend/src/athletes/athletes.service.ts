import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AthleteSource, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AthletesService {
  constructor(private readonly prisma: PrismaService) {}

  private num(v: any): number | null {
    if (v === '' || v === null || v === undefined) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  private payload(body: any) {
    return {
      name: String(body?.name || '').trim(),
      age: this.num(body?.age) === null ? null : Math.round(this.num(body?.age) as number),
      gender: String(body?.gender || '').trim() || null,
      phone: String(body?.phone || '').trim() || null,
      sport: String(body?.sport || '').trim() || null,
      level: String(body?.level || '').trim() || null,
      goal: String(body?.goal || '').trim() || null,
      height: this.num(body?.height),
      weight: this.num(body?.weight),
      history: String(body?.history || '').trim() || null,
      health: String(body?.health || '').trim() || null,
      note: String(body?.note || '').trim() || null,
    };
  }

  async list(coachId: string) {
    return this.prisma.athleteProfile.findMany({
      where: { ownerCoachId: coachId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getOwned(coachId: string, id: string) {
    const athlete = await this.prisma.athleteProfile.findUnique({ where: { id } });
    if (!athlete) throw new NotFoundException('ATHLETE_NOT_FOUND');
    if (athlete.ownerCoachId !== coachId) throw new ForbiddenException('ATHLETE_NOT_OWNED');
    return athlete;
  }

  async create(coach: any, body: any) {
    const data = this.payload(body);
    if (!data.name) throw new NotFoundException('ATHLETE_NAME_REQUIRED');
    const source = coach.role === Role.OWNER ? AthleteSource.DIRECT : AthleteSource.COACH_CLIENT;
    return this.prisma.athleteProfile.create({
      data: { ...data, ownerCoachId: coach.sub, source },
    });
  }

  async update(coachId: string, id: string, body: any) {
    await this.getOwned(coachId, id);
    const data = this.payload(body);
    if (!data.name) throw new NotFoundException('ATHLETE_NAME_REQUIRED');
    return this.prisma.athleteProfile.update({ where: { id }, data });
  }
}
