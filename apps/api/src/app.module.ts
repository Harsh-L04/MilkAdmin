import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { validateEnv } from './config/env.validation';
import { CommonModule } from './common/common.module';
import { JwtAuthGuard } from './common/auth/jwt-auth.guard';
import { RolesGuard } from './common/auth/roles.guard';
import { ThrottleGuard } from './common/throttle/throttle.guard';
import { IdempotencyInterceptor } from './common/idempotency/idempotency.interceptor';
import { AuthModule } from './auth/auth.module';
import { CatalogModule } from './catalog/catalog.module';
import { OrderingModule } from './ordering/ordering.module';
import { DistributorModule } from './distributor/distributor.module';
import { AdminModule } from './admin/admin.module';
import { SalesVisitModule } from './sales-visit/sales-visit.module';
import { StandingModule } from './standing/standing.module';
import { LedgerModule } from './ledger/ledger.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    CommonModule,
    AuthModule,
    CatalogModule,
    OrderingModule,
    DistributorModule,
    AdminModule,
    SalesVisitModule,
    StandingModule,
    LedgerModule,
  ],
  controllers: [HealthController],
  providers: [
    // Rate limit first (covers unauthenticated brute force), then auth
    // (populates request.user), then role checks.
    { provide: APP_GUARD, useClass: ThrottleGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    // Opt-in per route via @Idempotent(); no-ops elsewhere.
    { provide: APP_INTERCEPTOR, useClass: IdempotencyInterceptor },
  ],
})
export class AppModule {}
