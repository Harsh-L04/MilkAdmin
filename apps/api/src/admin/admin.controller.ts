import { Controller, Get } from '@nestjs/common';
import { Roles } from '../common/auth/roles.decorator';
import { AdminService } from './admin.service';

@Controller('admin')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

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
