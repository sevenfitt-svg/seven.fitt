import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { ProgramsService } from './programs.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.OWNER, Role.ADMIN, Role.COACH)
@Controller('programs')
export class ProgramsController {
  constructor(private readonly programs: ProgramsService) {}

  @Get()
  list(@Req() req: any) {
    return this.programs.list(req.user.sub);
  }

  @Get('draft/athlete/:athleteId')
  latestDraft(@Req() req: any, @Param('athleteId') athleteId: string) {
    return this.programs.latestDraft(req.user.sub, athleteId);
  }

  @Post('draft')
  saveDraft(@Req() req: any, @Body() body: any) {
    return this.programs.saveDraft(req.user.sub, body);
  }
}
