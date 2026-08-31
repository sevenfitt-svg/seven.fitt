import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  health() {
    return { ok: true, service: 'sevenfitt-backend', version: '1.1.0' };
  }
}
