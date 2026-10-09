import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  /** For the host's health check and the uptime pinger that keeps a free instance awake. */
  @Get('health')
  health(): { status: string } {
    return { status: 'ok' };
  }
}
