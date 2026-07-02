import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import {
  CreatePaymentInput,
  UpdatePaymentStatusInput,
  createPaymentSchema,
  updatePaymentStatusSchema,
} from '@moderns-milk/contracts';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { Roles } from '../common/auth/roles.decorator';
import {
  CurrentUser,
  AuthenticatedUser,
} from '../common/auth/current-user.decorator';
import { PaymentService } from './payment.service';

/**
 * Payment logs (spec §6). Distributors record payments to their sales officer;
 * everyone up the chain views them; only ADMIN flips PENDING -> PAID.
 */
@Controller('payments')
export class PaymentController {
  constructor(private readonly payments: PaymentService) {}

  @Get()
  @Roles('ADMIN', 'SALES_HEAD', 'SALES_OFFICER', 'DISTRIBUTOR')
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query('status') status?: string,
    @Query('distributorId') distributorId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.payments.list(user, { status, distributorId, dateFrom, dateTo });
  }

  @Post()
  @Roles('ADMIN', 'SALES_HEAD', 'SALES_OFFICER', 'DISTRIBUTOR')
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createPaymentSchema)) body: CreatePaymentInput,
  ) {
    return this.payments.create(user, body);
  }

  @Patch(':id/status')
  @Roles('ADMIN')
  updateStatus(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updatePaymentStatusSchema)) body: UpdatePaymentStatusInput,
  ) {
    return this.payments.updateStatus(id, body);
  }
}
