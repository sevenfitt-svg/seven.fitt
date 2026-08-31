import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AthletesService } from './athletes.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.OWNER, Role.ADMIN, Role.COACH)
@Controller('athletes')
export class AthletesController {
  constructor(private readonly athletes: AthletesService) {}

  @Get()
  list(@Req() req: any) {
    return this.athletes.list(req.user.sub);
  }

  @Post()
  create(@Req() req: any, @Body() body: any) {
    return this.athletes.create(req.user, body);
  }

  @Get(':id')
  get(@Req() req: any, @Param('id') id: string) {
    return this.athletes.getOwned(req.user.sub, id);
  }

  @Patch(':id')
  update(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    return this.athletes.update(req.user.sub, id, body);
  }
}
