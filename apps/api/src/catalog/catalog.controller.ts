import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import {
  ListProductsQuery,
  UpdateProductInput,
  UpsertProductInput,
  listProductsQuerySchema,
  updateProductSchema,
  upsertProductSchema,
} from '@moderns-milk/contracts';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { Roles } from '../common/auth/roles.decorator';
import { CatalogService } from './catalog.service';

// The product catalog is HQ-global, so only head-office roles may edit it.
const CATALOG_ADMINS = ['ADMIN', 'SALES_HEAD'] as const;

@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get('products')
  listProducts(
    @Query(new ZodValidationPipe(listProductsQuerySchema))
    query: ListProductsQuery,
  ) {
    return this.catalog.listProducts(query);
  }

  @Post('products')
  @Roles(...CATALOG_ADMINS)
  createProduct(
    @Body(new ZodValidationPipe(upsertProductSchema)) body: UpsertProductInput,
  ) {
    return this.catalog.createProduct(body);
  }

  @Patch('products/:id')
  @Roles(...CATALOG_ADMINS)
  updateProduct(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateProductSchema)) body: UpdateProductInput,
  ) {
    return this.catalog.updateProduct(id, body);
  }
}
