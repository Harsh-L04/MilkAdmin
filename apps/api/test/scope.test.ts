import { describe, it, expect } from 'vitest';
import {
  canAccessDistributorResource,
  canAccessRetailerResource,
  type ActorScope,
} from '../src/common/authz/scope';

const admin: ActorScope = { role: 'ADMIN' };
const salesHead: ActorScope = { role: 'SALES_HEAD' };
const distA: ActorScope = { role: 'DISTRIBUTOR', distributorId: 'A' };
const distB: ActorScope = { role: 'DISTRIBUTOR', distributorId: 'B' };
const distNoOrg: ActorScope = { role: 'DISTRIBUTOR' };
const salesOffA: ActorScope = { role: 'SALES_OFFICER', distributorId: 'A' };
const salesOffB: ActorScope = { role: 'SALES_OFFICER', distributorId: 'B' };
const salesOffNoOrg: ActorScope = { role: 'SALES_OFFICER' };
const retailerA1: ActorScope = { role: 'RETAILER', retailerId: 'r1', distributorId: 'A' };
const retailerA2: ActorScope = { role: 'RETAILER', retailerId: 'r2', distributorId: 'A' };
const retailerNoId: ActorScope = { role: 'RETAILER' };

describe('canAccessDistributorResource', () => {
  it('allows ADMIN for any distributor', () => {
    expect(canAccessDistributorResource(admin, 'A')).toBe(true);
    expect(canAccessDistributorResource(admin, 'B')).toBe(true);
  });

  it('allows SALES_HEAD for any distributor', () => {
    expect(canAccessDistributorResource(salesHead, 'A')).toBe(true);
    expect(canAccessDistributorResource(salesHead, 'B')).toBe(true);
  });

  it('allows DISTRIBUTOR same org', () => {
    expect(canAccessDistributorResource(distA, 'A')).toBe(true);
  });

  it('blocks DISTRIBUTOR different org', () => {
    expect(canAccessDistributorResource(distA, 'B')).toBe(false);
  });

  it('blocks DISTRIBUTOR with no distributorId', () => {
    expect(canAccessDistributorResource(distNoOrg, 'A')).toBe(false);
  });

  it('allows SALES_OFFICER same org', () => {
    expect(canAccessDistributorResource(salesOffA, 'A')).toBe(true);
  });

  it('blocks SALES_OFFICER different org', () => {
    expect(canAccessDistributorResource(salesOffA, 'B')).toBe(false);
  });

  it('blocks SALES_OFFICER with no distributorId', () => {
    expect(canAccessDistributorResource(salesOffNoOrg, 'A')).toBe(false);
  });

  it('blocks RETAILER from distributor resources', () => {
    expect(canAccessDistributorResource(retailerA1, 'A')).toBe(false);
  });

  it('handles undefined distributorId owner', () => {
    expect(canAccessDistributorResource(distA, undefined as unknown as string)).toBe(false);
  });
});

describe('canAccessRetailerResource', () => {
  it('allows ADMIN for any retailer', () => {
    expect(canAccessRetailerResource(admin, 'r1', 'A')).toBe(true);
  });

  it('allows SALES_HEAD for any retailer', () => {
    expect(canAccessRetailerResource(salesHead, 'r1', 'B')).toBe(true);
  });

  it('allows RETAILER owns resource', () => {
    expect(canAccessRetailerResource(retailerA1, 'r1', 'A')).toBe(true);
  });

  it('blocks RETAILER not owner', () => {
    expect(canAccessRetailerResource(retailerA1, 'r2', 'A')).toBe(false);
  });

  it('blocks RETAILER with no retailerId', () => {
    expect(canAccessRetailerResource(retailerNoId, 'r1', 'A')).toBe(false);
  });

  it('allows DISTRIBUTOR same org', () => {
    expect(canAccessRetailerResource(distA, 'r1', 'A')).toBe(true);
  });

  it('blocks DISTRIBUTOR different org', () => {
    expect(canAccessRetailerResource(distA, 'r1', 'B')).toBe(false);
  });

  it('blocks DISTRIBUTOR with no distributorId', () => {
    expect(canAccessRetailerResource(distNoOrg, 'r1', 'A')).toBe(false);
  });

  it('allows SALES_OFFICER same org', () => {
    expect(canAccessRetailerResource(salesOffA, 'r1', 'A')).toBe(true);
  });

  it('blocks SALES_OFFICER different org', () => {
    expect(canAccessRetailerResource(salesOffA, 'r1', 'B')).toBe(false);
  });

  it('handles undefined retailerId', () => {
    expect(canAccessRetailerResource(retailerA1, undefined as unknown as string, 'A')).toBe(false);
  });
});
