import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  Res,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Role } from '@prisma/client';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { LabResultStorageService } from './lab-result-storage.service';
import { LabService } from './lab.service';

@Controller('lab')
export class LabController {
  constructor(
    private readonly lab: LabService,
    private readonly storage: LabResultStorageService,
  ) {}

  @Get('catalog')
  catalog() {
    return this.lab.catalog();
  }

  @Post('requests')
  createRequest(@Body() body: any) {
    return this.lab.createPublicRequest(body);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.OWNER, Role.ADMIN, Role.LAB_STAFF)
  @Get('athletes')
  athletes(@Query('q') q: string) {
    return this.lab.searchAthletes(q);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.OWNER, Role.ADMIN, Role.LAB_STAFF)
  @Get('requests')
  requests() {
    return this.lab.listRequests();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.OWNER, Role.ADMIN, Role.LAB_STAFF)
  @Get('requests/:id')
  request(@Param('id') id: string) {
    return this.lab.getRequest(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.OWNER, Role.ADMIN, Role.LAB_STAFF)
  @Patch('requests/:id')
  updateRequest(@Param('id') id: string, @Body() body: any) {
    return this.lab.updateRequest(id, body);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.OWNER, Role.ADMIN, Role.LAB_STAFF)
  @Post('requests/:id/attach-athlete')
  attachAthlete(@Param('id') id: string, @Body() body: any) {
    return this.lab.attachAthlete(id, String(body?.athleteId || ''));
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.OWNER, Role.ADMIN, Role.LAB_STAFF)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 15 * 1024 * 1024 } }))
  @Post('requests/:id/result')
  uploadResult(
    @Param('id') id: string,
    @Body() body: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.lab.uploadResult(id, body, file);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.OWNER, Role.ADMIN, Role.LAB_STAFF)
  @Post('results/:id/release')
  release(@Param('id') id: string, @Req() req: any) {
    return this.lab.releaseResult(id, req.user.sub);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ATHLETE)
  @Get('my-results')
  myResults(@Req() req: any) {
    return this.lab.myResults(req.user.sub);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.OWNER, Role.ADMIN, Role.LAB_STAFF, Role.COACH, Role.ATHLETE)
  @Get('results/:id/pdf')
  async downloadPdf(@Param('id') id: string, @Req() req: any, @Res() res: Response) {
    const result = await this.lab.resultForDownload(id, req.user);
    const fallback = `sevenfitt-result-${id.slice(0, 8)}.pdf`;
    const rawName = (result.pdfOriginalName || fallback).replace(/[\r\n"\\]/g, '_');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(rawName)}`);
    this.storage.stream(result.pdfKey).pipe(res);
  }
}
