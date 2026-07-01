import { z } from 'zod';
import { phoneSchema, Role } from './common';

export const requestOtpSchema = z.object({
  phone: phoneSchema,
});
export type RequestOtpInput = z.infer<typeof requestOtpSchema>;

export const verifyOtpSchema = z.object({
  phone: phoneSchema,
  code: z.string().length(6).regex(/^\d{6}$/, 'OTP must be 6 digits'),
});
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;

// refreshToken is optional: native clients send it in the body, while the web
// sends it as an httpOnly cookie (read server-side). The controller requires
// one source or the other.
export const refreshSchema = z.object({
  refreshToken: z.string().min(1).optional(),
});
export type RefreshInput = z.infer<typeof refreshSchema>;

export const loginSchema = z.object({
  phone: phoneSchema,
  password: z.string().min(1, 'Password is required').max(100),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const changePasswordSchema = z.object({
  oldPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(6, 'New password must be at least 6 characters')
    .max(100),
});
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export const authTokensSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresIn: z.number(),
});
export type AuthTokens = z.infer<typeof authTokensSchema>;

export interface JwtPayload {
  sub: string; // user id
  role: Role;
  distributorId?: string;
  retailerId?: string;
}

export interface FileUploadResult {
  key: string;
  url: string;
}
