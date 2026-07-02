import { z } from 'zod';

export const uploadFileResponseSchema = z.object({
  key: z.string(),
  url: z.string(),
  originalName: z.string(),
  mimeType: z.string(),
  size: z.number(),
});
export type UploadFileResponse = z.infer<typeof uploadFileResponseSchema>;

export const presignedUrlSchema = z.object({
  url: z.string(),
  expiresIn: z.number(),
});
export type PresignedUrlResponse = z.infer<typeof presignedUrlSchema>;
