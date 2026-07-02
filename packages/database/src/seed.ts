import { PrismaClient, ProductCategory, Role, Uom } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const DEFAULT_HASH = bcrypt.hashSync('Moderns@2026', 10);

type ProductSeed = {
  sku: string;
  name: string;
  category: ProductCategory;
  uom: Uom;
  packSize: string; // in base unit (litres for milk, kg/pieces for dairy)
  taxRate: string;
  isReturnablePack?: boolean;
  shelfLifeDays?: number;
};

const PRODUCTS: ProductSeed[] = [
  // --- Milk (fresh milk is GST-exempt in India) ---
  { sku: 'GOLD-500', name: 'Gold Milk 500ml', category: 'MILK', uom: 'LITRE', packSize: '0.500', taxRate: '0', shelfLifeDays: 2 },
  { sku: 'GOLD-1000', name: 'Gold Milk 1L', category: 'MILK', uom: 'LITRE', packSize: '1.000', taxRate: '0', shelfLifeDays: 2 },
  { sku: 'TOND-500', name: 'Tond Milk 500ml', category: 'MILK', uom: 'LITRE', packSize: '0.500', taxRate: '0', shelfLifeDays: 2 },
  { sku: 'TOND-145', name: 'Tond Milk 145ml', category: 'MILK', uom: 'LITRE', packSize: '0.145', taxRate: '0', shelfLifeDays: 2 },
  { sku: 'DTOND-165', name: 'Double Tond Milk 165ml', category: 'MILK', uom: 'LITRE', packSize: '0.165', taxRate: '0', shelfLifeDays: 2 },
  { sku: 'DTOND-500', name: 'Double Tond Milk 500ml', category: 'MILK', uom: 'LITRE', packSize: '0.500', taxRate: '0', shelfLifeDays: 2 },
  { sku: 'TEA-1000', name: 'Tea Special 1L', category: 'MILK', uom: 'LITRE', packSize: '1.000', taxRate: '0', shelfLifeDays: 2 },
  { sku: 'TEA-500', name: 'Tea Special 500ml', category: 'MILK', uom: 'LITRE', packSize: '0.500', taxRate: '0', shelfLifeDays: 2 },
  { sku: 'TEA-150', name: 'Tea Special 150ml', category: 'MILK', uom: 'LITRE', packSize: '0.150', taxRate: '0', shelfLifeDays: 2 },
  { sku: 'COW-1000', name: 'Cow Milk 1L', category: 'MILK', uom: 'LITRE', packSize: '1.000', taxRate: '0', shelfLifeDays: 2 },
  { sku: 'COW-500', name: 'Cow Milk 500ml', category: 'MILK', uom: 'LITRE', packSize: '0.500', taxRate: '0', shelfLifeDays: 2 },
  { sku: 'COW-145', name: 'Cow Milk 145ml', category: 'MILK', uom: 'LITRE', packSize: '0.145', taxRate: '0', shelfLifeDays: 2 },
  { sku: 'SKIM-500', name: 'Skimmed Milk', category: 'MILK', uom: 'LITRE', packSize: '0.500', taxRate: '0', shelfLifeDays: 2 },

  // --- Dairy products (processed/branded: GST applies, 5% typical) ---
  { sku: 'CHHACH-PLAIN', name: 'Plain Chhach', category: 'DAIRY', uom: 'POUCH', packSize: '1.000', taxRate: '5', shelfLifeDays: 3 },
  { sku: 'CHHACH-MASALA', name: 'Masala Chhach', category: 'DAIRY', uom: 'POUCH', packSize: '1.000', taxRate: '5', shelfLifeDays: 3 },
  { sku: 'DAHI-POUCH', name: 'Dahi Pouch', category: 'DAIRY', uom: 'POUCH', packSize: '1.000', taxRate: '5', shelfLifeDays: 5 },
  { sku: 'DAHI-BUCKET', name: 'Dahi Bucket', category: 'DAIRY', uom: 'KG', packSize: '5.000', taxRate: '5', isReturnablePack: true, shelfLifeDays: 7 },
  { sku: 'DAHI-CUP', name: 'Dahi Cup', category: 'DAIRY', uom: 'PIECE', packSize: '1.000', taxRate: '5', shelfLifeDays: 7 },
  { sku: 'DAHI-SWEET', name: 'Sweet Dahi', category: 'DAIRY', uom: 'PIECE', packSize: '1.000', taxRate: '5', shelfLifeDays: 7 },
  { sku: 'LASSI', name: 'Lassi', category: 'DAIRY', uom: 'POUCH', packSize: '1.000', taxRate: '5', shelfLifeDays: 3 },
  { sku: 'MISHTI-DOI', name: 'Mishti Doi', category: 'DAIRY', uom: 'PIECE', packSize: '1.000', taxRate: '5', shelfLifeDays: 7 },
];

// Indicative retail prices (₹) — placeholders until real price master is loaded.
const RETAIL_PRICES: Record<string, string> = {
  'GOLD-500': '34', 'GOLD-1000': '68', 'TOND-500': '28', 'TOND-145': '9',
  'DTOND-165': '9', 'DTOND-500': '26', 'TEA-1000': '60', 'TEA-500': '30',
  'TEA-150': '10', 'COW-1000': '56', 'COW-500': '28', 'COW-145': '9',
  'SKIM-500': '24', 'CHHACH-PLAIN': '15', 'CHHACH-MASALA': '18',
  'DAHI-POUCH': '40', 'DAHI-BUCKET': '250', 'DAHI-CUP': '15',
  'DAHI-SWEET': '25', 'LASSI': '20', 'MISHTI-DOI': '30',
};

async function main() {
  console.log('Seeding Moderns Milk...');

  // Catalog
  for (const p of PRODUCTS) {
    await prisma.product.upsert({
      where: { sku: p.sku },
      update: {
        name: p.name,
        category: p.category,
        uom: p.uom,
        packSize: p.packSize,
        taxRate: p.taxRate,
        isReturnablePack: p.isReturnablePack ?? false,
        shelfLifeDays: p.shelfLifeDays,
      },
      create: {
        sku: p.sku,
        name: p.name,
        category: p.category,
        uom: p.uom,
        packSize: p.packSize,
        taxRate: p.taxRate,
        isReturnablePack: p.isReturnablePack ?? false,
        shelfLifeDays: p.shelfLifeDays,
      },
    });
  }
  console.log(`  ${PRODUCTS.length} products`);

  // Retail price list
  const priceList = await prisma.priceList.upsert({
    where: { id: 'seed-retail-pricelist' },
    update: {},
    create: {
      id: 'seed-retail-pricelist',
      name: 'Default Retail Price List',
      customerTier: 'RETAILER',
      validFrom: new Date('2026-01-01'),
    },
  });
  for (const [sku, price] of Object.entries(RETAIL_PRICES)) {
    const product = await prisma.product.findUnique({ where: { sku } });
    if (!product) continue;
    await prisma.priceListItem.upsert({
      where: { priceListId_productId: { priceListId: priceList.id, productId: product.id } },
      update: { price },
      create: { priceListId: priceList.id, productId: product.id, price },
    });
  }
  console.log('  retail price list');

  // Admin
  await prisma.user.upsert({
    where: { phone: '+919000000001' },
    update: { passwordHash: DEFAULT_HASH },
    create: { phone: '+919000000001', name: 'Platform Admin', role: Role.ADMIN, email: 'admin@modernsmilk.com', passwordHash: DEFAULT_HASH },
  });

  // Distributor org + staff user + route
  const distributor = await prisma.distributor.upsert({
    where: { code: 'DIST-001' },
    update: {},
    create: { code: 'DIST-001', name: 'Central Dairy Distributor', region: 'North' },
  });
  await prisma.user.upsert({
    where: { phone: '+919000000002' },
    update: { distributorId: distributor.id, passwordHash: DEFAULT_HASH },
    create: { phone: '+919000000002', name: 'Distributor Manager', role: Role.DISTRIBUTOR, distributorId: distributor.id, passwordHash: DEFAULT_HASH },
  });
  const route = await prisma.route.upsert({
    where: { distributorId_name: { distributorId: distributor.id, name: 'Route A' } },
    update: {},
    create: { distributorId: distributor.id, name: 'Route A', sequence: 1 },
  });

  // Sales team (field reps who bring outlets into the network).
  const salesReps = [
    { phone: '+919000000010', name: 'Amit Verma' },
    { phone: '+919000000011', name: 'Priya Nair' },
  ];
  for (const rep of salesReps) {
    await prisma.user.upsert({
      where: { phone: rep.phone },
      update: { distributorId: distributor.id, passwordHash: DEFAULT_HASH },
      create: {
        phone: rep.phone,
        name: rep.name,
        role: Role.SALES_OFFICER,
        distributorId: distributor.id,
        passwordHash: DEFAULT_HASH,
      },
    });
  }

  // Retailer user + retailer + account
  const retailerUser = await prisma.user.upsert({
    where: { phone: '+919000000003' },
    update: { passwordHash: DEFAULT_HASH },
    create: { phone: '+919000000003', name: 'Sharma General Store', role: Role.RETAILER, passwordHash: DEFAULT_HASH },
  });
  const retailer = await prisma.retailer.upsert({
    where: { userId: retailerUser.id },
    update: {},
    create: {
      userId: retailerUser.id,
      distributorId: distributor.id,
      routeId: route.id,
      shopName: 'Sharma General Store',
    },
  });
  await prisma.retailerAccount.upsert({
    where: { retailerId: retailer.id },
    update: {},
    create: { retailerId: retailer.id, balance: '0', creditLimit: '20000' },
  });

  // Open order window so retailers can place orders out of the box.
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  const farCutoff = new Date(tomorrow);
  farCutoff.setFullYear(farCutoff.getFullYear() + 1);
  await prisma.orderWindow.upsert({
    where: { id: 'seed-open-window' },
    update: { deliveryDate: tomorrow, cutoffAt: farCutoff, status: 'OPEN' },
    create: {
      id: 'seed-open-window',
      distributorId: distributor.id,
      routeId: route.id,
      deliveryDate: tomorrow,
      cutoffAt: farCutoff,
      status: 'OPEN',
    },
  });
  console.log('  open order window (seed-open-window)');

  console.log('Seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
