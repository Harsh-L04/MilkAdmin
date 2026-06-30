import {
  Body,
  Controller,
  Get,
  Param,
  Post,
} from '@nestjs/common';
import {
  AdvanceOrderInput,
  CreateOrderInput,
  ReviewOrderInput,
  advanceOrderSchema,
  createOrderSchema,
  reviewOrderSchema,
} from '@moderns-milk/contracts';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { Roles } from '../common/auth/roles.decorator';
import {
  CurrentUser,
  AuthenticatedUser,
} from '../common/auth/current-user.decorator';
import { Idempotent } from '../common/idempotency/idempotency.decorator';
import { OrderingService } from './ordering.service';

@Controller('orders')
export class OrderingController {
  constructor(private readonly ordering: OrderingService) {}

  @Post()
  @Idempotent()
  @Roles('DISTRIBUTOR', 'RETAILER')
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createOrderSchema)) body: CreateOrderInput,
  ) {
    return this.ordering.createOrder(user, body);
  }

  @Post(':id/submit')
  @Idempotent()
  @Roles('DISTRIBUTOR', 'RETAILER')
  submit(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.ordering.submitOrder(user, id);
  }

  @Post('review')
  @Roles('DISTRIBUTOR', 'SALES_OFFICER', 'SALES_HEAD', 'ADMIN')
  review(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(reviewOrderSchema)) body: ReviewOrderInput,
  ) {
    return this.ordering.reviewOrder(user, body);
  }

  @Post('advance')
  @Roles('DISTRIBUTOR', 'SALES_OFFICER', 'SALES_HEAD', 'ADMIN')
  advance(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(advanceOrderSchema)) body: AdvanceOrderInput,
  ) {
    return this.ordering.advanceOrder(user, body);
  }

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.ordering.listOrders(user);
  }

  // Must be declared before the `:id` route so it is not shadowed by it.
  @Get('windows/current')
  @Roles('DISTRIBUTOR', 'RETAILER')
  currentWindow(@CurrentUser() user: AuthenticatedUser) {
    return this.ordering.getCurrentWindow(user);
  }

  @Get(':id')
  get(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.ordering.getOrder(user, id);
  }
}
