import { Body, Controller, Get, Put } from '@nestjs/common';
import { OrderDeadlineInput, orderDeadlineSchema } from '@moderns-milk/contracts';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { Roles } from '../common/auth/roles.decorator';
import { SettingsService } from './settings.service';

/** Admin-managed global settings (spec §8). */
@Controller('settings')
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  // Everyone may read the deadline (the app shows it); only admin sets it.
  @Get('order-deadline')
  getOrderDeadline() {
    return this.settings.getOrderDeadline();
  }

  @Put('order-deadline')
  @Roles('ADMIN')
  setOrderDeadline(
    @Body(new ZodValidationPipe(orderDeadlineSchema)) body: OrderDeadlineInput,
  ) {
    return this.settings.setOrderDeadline(body.time);
  }
}
