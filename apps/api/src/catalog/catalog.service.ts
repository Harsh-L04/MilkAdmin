import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Product } from '@prisma/client';
import {
  ListProductsQuery,
  ProductDto,
  UpdateProductInput,
  UpsertProductInput,
} from '@moderns-milk/contracts';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async listProducts(query: ListProductsQuery): Promise<ProductDto[]> {
    const products = await this.prisma.product.findMany({
      where: {
        category: query.category,
        active: query.active ?? true,
      },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });

    return products.map((p) => this.toDto(p));
  }

  async createProduct(input: UpsertProductInput): Promise<ProductDto> {
    try {
      const created = await this.prisma.product.create({
        data: {
          sku: input.sku,
          name: input.name,
          category: input.category,
          uom: input.uom,
          packSize: input.packSize,
          taxRate: input.taxRate,
          hsnCode: input.hsnCode ?? null,
          shelfLifeDays: input.shelfLifeDays ?? null,
          isReturnablePack: input.isReturnablePack,
          active: input.active,
        },
      });
      return this.toDto(created);
    } catch (err) {
      throw this.mapWriteError(err);
    }
  }

  async updateProduct(
    id: string,
    input: UpdateProductInput,
  ): Promise<ProductDto> {
    try {
      const updated = await this.prisma.product.update({
        where: { id },
        // Only the keys present in `input` are written (partial PATCH).
        data: {
          sku: input.sku,
          name: input.name,
          category: input.category,
          uom: input.uom,
          packSize: input.packSize,
          taxRate: input.taxRate,
          hsnCode: input.hsnCode,
          shelfLifeDays: input.shelfLifeDays,
          isReturnablePack: input.isReturnablePack,
          active: input.active,
        },
      });
      return this.toDto(updated);
    } catch (err) {
      throw this.mapWriteError(err, id);
    }
  }

  private toDto(p: Product): ProductDto {
    return {
      id: p.id,
      sku: p.sku,
      name: p.name,
      category: p.category,
      uom: p.uom,
      packSize: p.packSize.toString(),
      taxRate: p.taxRate.toString(),
      hsnCode: p.hsnCode,
      shelfLifeDays: p.shelfLifeDays,
      isReturnablePack: p.isReturnablePack,
      active: p.active,
    };
  }

  /** Translate Prisma write errors into friendly HTTP exceptions. */
  private mapWriteError(err: unknown, id?: string): Error {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === 'P2002') {
        return new ConflictException('A product with this SKU already exists');
      }
      if (err.code === 'P2025') {
        return new NotFoundException(`Product ${id ?? ''} not found`.trim());
      }
    }
    return err as Error;
  }
}
