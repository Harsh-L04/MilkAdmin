import { Module } from '@nestjs/common';
import { StandingController } from './standing.controller';
import { StandingService } from './standing.service';

@Module({
  controllers: [StandingController],
  providers: [StandingService],
})
export class StandingModule {}
