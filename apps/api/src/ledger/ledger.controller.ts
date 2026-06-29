import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import {
  RecordCollectionInput,
  recordCollectionSchema,
} from '@moderns-milk/contracts';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { Roles } from '../common/auth/roles.decorator';
import {
  CurrentUser,
  AuthenticatedUser,
} from '../common/auth/current-user.decorator';
import { LedgerService } from './ledger.service';

const ROLES = ['DISTRIBUTOR', 'SALES_OFFICER', 'SALES_HEAD', 'ADMIN'] as const;

@Controller()
export class LedgerController {
  constructor(private readonly ledger: LedgerService) {}

  @Get('customers/:id/ledger')
  @Roles(...ROLES)
  getLedger(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.ledger.getLedger(user, id);
  }

  @Post('collections')
  @Roles(...ROLES)
  record(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(recordCollectionSchema)) body: RecordCollectionInput,
  ) {
    return this.ledger.recordCollection(user, body);
  }
}
