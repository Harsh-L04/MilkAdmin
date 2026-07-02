import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import {
  CreateSalesVisitInput,
  createSalesVisitSchema,
} from '@moderns-milk/contracts';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { Roles } from '../common/auth/roles.decorator';
import {
  CurrentUser,
  AuthenticatedUser,
} from '../common/auth/current-user.decorator';
import { SalesVisitService } from './sales-visit.service';

const VISIT_ROLES = ['DISTRIBUTOR', 'SALES_OFFICER', 'SALES_HEAD', 'ADMIN'] as const;

@Controller('sales-visits')
export class SalesVisitController {
  constructor(private readonly visits: SalesVisitService) {}

  @Post()
  @Roles(...VISIT_ROLES)
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createSalesVisitSchema)) body: CreateSalesVisitInput,
  ) {
    return this.visits.create(user, body);
  }

  @Get()
  @Roles(...VISIT_ROLES)
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('outletType') outletType?: string,
  ) {
    return this.visits.list(user, { dateFrom, dateTo, outletType });
  }
}
