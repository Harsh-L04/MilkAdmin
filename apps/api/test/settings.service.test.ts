import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import { SettingsService } from '../src/settings/settings.service';

const mockPrisma = {
  appSetting: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
  },
};

describe('SettingsService', () => {
  let service: SettingsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new SettingsService(mockPrisma as any);
  });

  describe('getOrderDeadline', () => {
    it('returns setting when set', async () => {
      mockPrisma.appSetting.findUnique.mockResolvedValue({
        key: 'orderPlacementDeadline',
        value: '14:00',
      });
      const result = await service.getOrderDeadline();
      expect(result.time).toBe('14:00');
    });

    it('returns null when setting is not set', async () => {
      mockPrisma.appSetting.findUnique.mockResolvedValue(null);
      const result = await service.getOrderDeadline();
      expect(result.time).toBeNull();
    });

    it('returns null when setting value is empty string', async () => {
      mockPrisma.appSetting.findUnique.mockResolvedValue({
        key: 'orderPlacementDeadline',
        value: '',
      });
      const result = await service.getOrderDeadline();
      expect(result.time).toBeNull();
    });
  });

  describe('setOrderDeadline', () => {
    it('upserts the setting', async () => {
      mockPrisma.appSetting.upsert.mockResolvedValue({
        key: 'orderPlacementDeadline',
        value: '16:00',
      });
      const result = await service.setOrderDeadline('16:00');
      expect(result.time).toBe('16:00');
      expect(mockPrisma.appSetting.upsert).toHaveBeenCalledWith({
        where: { key: 'orderPlacementDeadline' },
        create: { key: 'orderPlacementDeadline', value: '16:00' },
        update: { value: '16:00' },
      });
    });

    it('returns null when clearing the deadline', async () => {
      mockPrisma.appSetting.upsert.mockResolvedValue({
        key: 'orderPlacementDeadline',
        value: '',
      });
      const result = await service.setOrderDeadline('');
      expect(result.time).toBeNull();
    });
  });

  describe('assertBeforeOrderDeadline', () => {
    it('passes when no deadline is set', async () => {
      mockPrisma.appSetting.findUnique.mockResolvedValue(null);
      await expect(
        service.assertBeforeOrderDeadline(),
      ).resolves.toBeUndefined();
    });

    it('passes when current time is before deadline', async () => {
      mockPrisma.appSetting.findUnique.mockResolvedValue({
        key: 'orderPlacementDeadline',
        value: '18:00',
      });
      const now = new Date('2026-06-26T10:00:00');
      await expect(
        service.assertBeforeOrderDeadline(now),
      ).resolves.toBeUndefined();
    });

    it('throws ForbiddenException when deadline has passed', async () => {
      mockPrisma.appSetting.findUnique.mockResolvedValue({
        key: 'orderPlacementDeadline',
        value: '09:00',
      });
      const now = new Date('2026-06-26T10:00:00');
      await expect(
        service.assertBeforeOrderDeadline(now),
      ).rejects.toThrow(ForbiddenException);
    });

    it('passes exactly at deadline', async () => {
      mockPrisma.appSetting.findUnique.mockResolvedValue({
        key: 'orderPlacementDeadline',
        value: '10:00',
      });
      const now = new Date('2026-06-26T10:00:00');
      await expect(
        service.assertBeforeOrderDeadline(now),
      ).resolves.toBeUndefined();
    });
  });
});
