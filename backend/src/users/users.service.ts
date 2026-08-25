import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {

  constructor(
    private prisma: PrismaService
  ) {}

  create(data: any) {
    return this.prisma.user.create({
      data: {
        phone: data.phone,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role,
      },
    });
  }

}
