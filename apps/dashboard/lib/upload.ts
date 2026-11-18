'use client';

import type { ApiClient } from '@fitnexa/api-client';

export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const IMAGE_MAX_BYTES = 5 * 1024 * 1024;

/** A plain-language reason the file can't be used, or null if it's fine. */
export function imageProblem(file: File): string | null {
  if (!IMAGE_TYPES.includes(file.type)) return 'Use a JPG, PNG or WebP image.';
  if (file.size > IMAGE_MAX_BYTES) return 'That image is over 5 MB. Choose a smaller one.';
  return null;
}

export class UploadFailed extends Error {
  constructor() {
    super('The upload didn’t go through. Please try again.');
  }
}

type Purpose = { purpose: 'member_photo'; memberId: string } | { purpose: 'gym_logo' } | { purpose: 'gym_icon' };

/**
 * Uploads an image straight from the browser to the image host. The API signs the upload and picks
 * the file's path; the caller then tells the API to use it (publicId for photos, deliveryUrl for
 * branding).
 */
export async function uploadImage(api: ApiClient, target: Purpose, file: File): Promise<{ publicId: string; deliveryUrl: string }> {
  const { data: sig } = await api.post('/api/v1/uploads/signature', { body: target as never });
  const form = new FormData();
  for (const [k, v] of Object.entries(sig.fields)) form.append(k, v);
  form.append('file', file);
  const res = await fetch(sig.uploadUrl, { method: 'POST', body: form }).catch(() => null);
  if (!res?.ok) throw new UploadFailed();
  return { publicId: sig.publicId, deliveryUrl: sig.deliveryUrl };
}
