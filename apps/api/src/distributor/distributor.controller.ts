import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import {
  CreateCustomerInput,
  UpdateCustomerInput,
  UpdateProfileInput,
  createCustomerSchema,
  updateCustomerSchema,
  updateProfileSchema,
} from '@moderns-milk/contracts';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { Roles } from '../common/auth/roles.decorator';
import {
  CurrentUser,
  AuthenticatedUser,
} from '../common/auth/current-user.decorator';
import { DistributorService } from './distributor.service';

@Controller()
export class DistributorController {
  constructor(private readonly distributor: DistributorService) {}

  @Get('me/profile')
  @Roles('DISTRIBUTOR', 'SALES_OFFICER')
  getProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.distributor.getProfile(user);
  }

  @Patch('me/profile')
  @Roles('DISTRIBUTOR', 'SALES_OFFICER')
  updateProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(updateProfileSchema)) body: UpdateProfileInput,
  ) {
    return this.distributor.updateProfile(user, body);
  }

  @Get('customers')
  @Roles('DISTRIBUTOR', 'SALES_OFFICER')
  listCustomers(@CurrentUser() user: AuthenticatedUser) {
    return this.distributor.listCustomers(user);
  }

  @Get('sales-team')
  @Roles('DISTRIBUTOR', 'SALES_OFFICER')
  listSalesTeam(@CurrentUser() user: AuthenticatedUser) {
    return this.distributor.listSalesTeam(user);
  }

  @Post('customers')
  @Roles('DISTRIBUTOR', 'SALES_OFFICER')
  createCustomer(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createCustomerSchema)) body: CreateCustomerInput,
  ) {
    return this.distributor.createCustomer(user, body);
  }

  // HQ roles may edit any outlet; distributor reps only their own (enforced in
  // the service). Also performs deactivate/restore via { status }.
  @Patch('customers/:id')
  @Roles('ADMIN', 'SALES_HEAD', 'DISTRIBUTOR', 'SALES_OFFICER')
  updateCustomer(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateCustomerSchema)) body: UpdateCustomerInput,
  ) {
    return this.distributor.updateCustomer(user, id, body);
  }
}
