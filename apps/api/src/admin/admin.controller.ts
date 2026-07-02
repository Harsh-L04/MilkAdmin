import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
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

  @Post('users/:userId/force-logout')
  @Roles('ADMIN', 'SALES_HEAD')
  forceLogout(@Param('userId') userId: string) {
    return this.admin.forceLogout(userId);
  }

  @Get('users/unlinked')
  @Roles('ADMIN', 'SALES_HEAD')
  listUnlinkedUsers() {
    return this.admin.listUnlinkedUsers();
  }

  @Post('users/:userId/link')
  @Roles('ADMIN', 'SALES_HEAD')
  linkUser(
    @Param('userId') userId: string,
    @Body('distributorId') distributorId: string,
  ) {
    return this.admin.linkUser(userId, distributorId);
  }

  @Patch('distributors/:id')
  @Roles('ADMIN', 'SALES_HEAD')
  updateDistributor(
    @Param('id') id: string,
    @Body() body: { name?: string; code?: string; region?: string; address?: string; status?: string },
  ) {
    return this.admin.updateDistributor(id, body);
  }
}
