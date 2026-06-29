import { Controller, Get } from '@nestjs/common';
import { Roles } from '../common/auth/roles.decorator';
import {
  CurrentUser,
  AuthenticatedUser,
} from '../common/auth/current-user.decorator';
import { AdminService } from './admin.service';

@Controller('admin')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('dashboard')
  @Roles('ADMIN', 'SALES_HEAD', 'DISTRIBUTOR', 'SALES_OFFICER')
  dashboard(@CurrentUser() user: AuthenticatedUser) {
    return this.admin.dashboard(user);
  }

  @Get('distributors')
  @Roles('ADMIN', 'SALES_HEAD')
  listDistributors() {
    return this.admin.listDistributors();
  }

  @Get('retailers')
  @Roles('ADMIN', 'SALES_HEAD')
  listRetailers() {
    return this.admin.listRetailers();
  }
}
