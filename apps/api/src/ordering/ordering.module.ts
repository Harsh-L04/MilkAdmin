import { Module } from '@nestjs/common';
import { LedgerModule } from '../ledger/ledger.module';
import { SettingsModule } from '../settings/settings.module';
import { OrderingController } from './ordering.controller';
import { OrderingService } from './ordering.service';
import { CutoffSchedulerService } from './cutoff-scheduler.service';

@Module({
  imports: [LedgerModule, SettingsModule],
  controllers: [OrderingController],
  providers: [OrderingService, CutoffSchedulerService],
  exports: [OrderingService],
})
export class OrderingModule {}
