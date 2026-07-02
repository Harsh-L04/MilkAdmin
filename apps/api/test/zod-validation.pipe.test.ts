import { describe, it, expect } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import { ZodValidationPipe } from '../src/common/pipes/zod-validation.pipe';

const testSchema = z.object({
  name: z.string().min(1),
  age: z.number().int().positive(),
});

describe('ZodValidationPipe', () => {
  const pipe = new ZodValidationPipe(testSchema);

  it('passes through valid input', () => {
    const result = pipe.transform({ name: 'John', age: 30 });
    expect(result).toEqual({ name: 'John', age: 30 });
  });

  it('strips unknown keys from valid input', () => {
    const result = pipe.transform({ name: 'John', age: 30, extra: 'field' });
    expect(result).toEqual({ name: 'John', age: 30 });
    expect((result as any).extra).toBeUndefined();
  });

  it('throws BadRequestException for invalid input', () => {
    expect(() => pipe.transform({ name: '', age: -1 })).toThrow(
      BadRequestException,
    );
  });

  it('throws BadRequestException for missing required fields', () => {
    expect(() => pipe.transform({ name: 'John' })).toThrow(
      BadRequestException,
    );
  });

  it('throws BadRequestException for null input', () => {
    expect(() => pipe.transform(null)).toThrow(BadRequestException);
  });

  it('throws BadRequestException for undefined input', () => {
    expect(() => pipe.transform(undefined)).toThrow(BadRequestException);
  });

  it('throws BadRequestException for empty object', () => {
    expect(() => pipe.transform({})).toThrow(BadRequestException);
  });

  it('includes validation issues in error response', () => {
    try {
      pipe.transform({ name: '', age: -1 });
    } catch (e) {
      const error = e as BadRequestException;
      const response = error.getResponse() as any;
      expect(response.issues).toBeDefined();
      expect(response.issues.length).toBeGreaterThan(0);
      expect(response.issues[0]).toHaveProperty('path');
      expect(response.issues[0]).toHaveProperty('message');
    }
  });

  it('passes through valid transformed values', () => {
    const result = pipe.transform({ name: 'Jane', age: 25 });
    expect(result.name).toBe('Jane');
    expect(result.age).toBe(25);
  });
});
