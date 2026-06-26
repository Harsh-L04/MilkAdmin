import { Body, Controller, Get, Patch, Post } from '@nestjs/common';
import {
  CreateCustomerInput,
  UpdateProfileInput,
  createCustomerSchema,
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
  @Roles('DISTRIBUTOR')
  getProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.distributor.getProfile(user);
  }

  @Patch('me/profile')
  @Roles('DISTRIBUTOR')
  updateProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(updateProfileSchema)) body: UpdateProfileInput,
  ) {
    return this.distributor.updateProfile(user, body);
  }

  @Get('customers')
  @Roles('DISTRIBUTOR')
  listCustomers(@CurrentUser() user: AuthenticatedUser) {
    return this.distributor.listCustomers(user);
  }

  @Post('customers')
  @Roles('DISTRIBUTOR')
  createCustomer(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createCustomerSchema)) body: CreateCustomerInput,
  ) {
    return this.distributor.createCustomer(user, body);
  }
}
