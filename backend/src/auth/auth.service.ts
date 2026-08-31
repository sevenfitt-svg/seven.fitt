import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AccountStatus, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { normalizePhone } from './auth.util';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  private publicUser(user: any) {
    return {
      id: user.id,
      phone: user.phone,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      status: user.status,
    };
  }

  async login(phoneInput: string, password: string) {
    const phone = normalizePhone(phoneInput);
    const user = await this.prisma.user.findUnique({ where: { phone } });
    if (!user?.passwordHash || !(await bcrypt.compare(String(password || ''), user.passwordHash))) {
      throw new UnauthorizedException('INVALID_CREDENTIALS');
    }
    if (user.status !== AccountStatus.ACTIVE) {
      throw new UnauthorizedException('ACCOUNT_SUSPENDED');
    }
    const token = await this.jwt.signAsync(
      { sub: user.id, role: user.role, phone: user.phone },
      { secret: this.config.get<string>('JWT_SECRET'), expiresIn: '12h' },
    );
    return { accessToken: token, user: this.publicUser(user) };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.status !== AccountStatus.ACTIVE) throw new UnauthorizedException('INVALID_SESSION');
    return this.publicUser(user);
  }

  async bootstrapOwner(data: any) {
    const configuredKey = this.config.get<string>('OWNER_BOOTSTRAP_KEY');
    if (!configuredKey || data?.setupKey !== configuredKey) throw new UnauthorizedException('INVALID_SETUP_KEY');

    const existing = await this.prisma.user.count({ where: { role: Role.OWNER } });
    if (existing > 0) throw new BadRequestException('OWNER_ALREADY_EXISTS');

    const phone = normalizePhone(data?.phone);
    const password = String(data?.password || '');
    if (!phone || password.length < 8) throw new BadRequestException('PHONE_AND_STRONG_PASSWORD_REQUIRED');

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await this.prisma.user.create({
      data: {
        phone,
        passwordHash,
        firstName: String(data?.firstName || '').trim() || null,
        lastName: String(data?.lastName || '').trim() || null,
        role: Role.OWNER,
        coachProfile: { create: {} },
      },
    });
    return this.publicUser(user);
  }
}
