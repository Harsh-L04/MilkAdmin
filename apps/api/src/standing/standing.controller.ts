import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import {
  UpsertStandingOrderInput,
  upsertStandingOrderSchema,
} from '@moderns-milk/contracts';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { Roles } from '../common/auth/roles.decorator';
import {
  CurrentUser,
  AuthenticatedUser,
} from '../common/auth/current-user.decorator';
import { StandingService } from './standing.service';

const ROLES = ['DISTRIBUTOR', 'SALES_OFFICER', 'SALES_HEAD', 'ADMIN'] as const;

@Controller('standing-orders')
export class StandingController {
  constructor(private readonly standing: StandingService) {}

  @Get()
  @Roles(...ROLES)
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.standing.list(user);
  }

  @Post()
  @Roles(...ROLES)
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(upsertStandingOrderSchema)) body: UpsertStandingOrderInput,
  ) {
    return this.standing.create(user, body);
  }

  @Patch(':id')
  @Roles(...ROLES)
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(upsertStandingOrderSchema)) body: UpsertStandingOrderInput,
  ) {
    return this.standing.update(user, id, body);
  }

  @Delete(':id')
  @Roles(...ROLES)
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.standing.remove(user, id);
  }
}
