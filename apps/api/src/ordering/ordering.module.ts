import { Module } from '@nestjs/common';
import { LedgerModule } from '../ledger/ledger.module';
import { OrderingController } from './ordering.controller';
import { OrderingService } from './ordering.service';

@Module({
  imports: [LedgerModule],
  controllers: [OrderingController],
  providers: [OrderingService],
  exports: [OrderingService],
})
export class OrderingModule {}
