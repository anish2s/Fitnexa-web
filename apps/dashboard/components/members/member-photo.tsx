'use client';

import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Camera, Trash2 } from 'lucide-react';
import { Avatar, Button, Spinner, useToast } from '@fitnexa/ui';
import type { MemberDetail } from '@fitnexa/api-client';
import { useAuth } from '@/lib/auth';
import { actionMessage } from '@/lib/errors';

const TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 5 * 1024 * 1024;

/**
 * Member photo with change/remove. Upload goes browser → Cloudinary directly with a signature from
 * the API (the API picks the file path), then the API is told which upload to attach.
 */
export function MemberPhoto({ member, editable }: { member: MemberDetail; editable: boolean }) {
  const { api } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const saved = (m: MemberDetail) => {
    queryClient.setQueryData(['member', m.id], m);
    void queryClient.invalidateQueries({ queryKey: ['members'] });
  };

  async function upload(file: File) {
    if (!TYPES.includes(file.type)) return toast.show({ tone: 'error', title: 'Use a JPG, PNG or WebP image' });
    if (file.size > MAX_BYTES) return toast.show({ tone: 'error', title: 'That photo is too large', description: 'Choose one under 5 MB.' });
    setBusy(true);
    try {
      const { data: sig } = await api.post('/api/v1/uploads/signature', { body: { purpose: 'member_photo', memberId: member.id } });
      const form = new FormData();
      for (const [k, v] of Object.entries(sig.fields)) form.append(k, v);
      form.append('file', file);
      const res = await fetch(sig.uploadUrl, { method: 'POST', body: form });
      if (!res.ok) throw new Error('upload failed');
      const { data } = await api.put('/api/v1/members/{id}/photo', { params: { id: member.id }, body: { publicId: sig.publicId } });
      saved(data);
      toast.show({ tone: 'success', title: 'Photo updated' });
    } catch (err) {
      toast.show({ tone: 'error', title: 'Couldn’t update the photo', description: err instanceof Error && err.message === 'upload failed' ? 'The upload didn’t go through. Please try again.' : actionMessage(err) });
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  }

  async function remove() {
    setBusy(true);
    try {
      const { data } = await api.delete('/api/v1/members/{id}/photo', { params: { id: member.id } });
      saved(data);
      toast.show({ tone: 'success', title: 'Photo removed' });
    } catch (err) {
      toast.show({ tone: 'error', title: 'Couldn’t remove the photo', description: actionMessage(err) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex shrink-0 flex-col items-center gap-2">
      <div className="relative">
        <Avatar name={member.name} src={member.photoUrl} size={88} className="text-2xl" />
        {busy && (
          <span className="absolute inset-0 flex items-center justify-center rounded-full bg-overlay text-white">
            <Spinner className="size-5" />
          </span>
        )}
        {editable && !busy && (
          <button
            type="button"
            onClick={() => input.current?.click()}
            className="absolute -right-1 -bottom-1 flex size-8 items-center justify-center rounded-full border border-border bg-surface text-muted shadow-2 hover:text-fg"
            aria-label={member.photoUrl ? 'Change photo' : 'Add photo'}
            title={member.photoUrl ? 'Change photo' : 'Add photo'}
          >
            <Camera className="size-4" />
          </button>
        )}
      </div>
      {editable && member.photoUrl && !busy && (
        <Button variant="ghost" size="sm" onClick={remove} leftIcon={<Trash2 className="size-3.5" />} className="h-7 text-xs text-muted">
          Remove
        </Button>
      )}
      <input ref={input} type="file" accept={TYPES.join(',')} className="hidden" onChange={(e) => e.target.files?.[0] && void upload(e.target.files[0])} />
    </div>
  );
}
