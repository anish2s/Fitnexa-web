'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { useToast } from '@fitexaa/ui';
import { useAuth } from '@/lib/auth';
import { RequirePermission } from '@/components/require-permission';
import { PageHeader } from '@/components/page-header';
import { MemberForm, toCreateBody } from '@/components/members/member-form';

function NewMember() {
  const { api } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-5">
      <Link href="/members" className="inline-flex w-fit items-center gap-1.5 text-sm text-muted hover:text-fg"><ArrowLeft className="size-4" /> Members</Link>
      <PageHeader title="Add member" description="Register a new member at the front desk." />
      <MemberForm
        cancelHref="/members"
        onSubmit={async (values) => {
          const { data } = await api.post('/api/v1/members', { body: toCreateBody(values) });
          queryClient.setQueryData(['member', data.id], data);
          void queryClient.invalidateQueries({ queryKey: ['members'] });
          void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
          toast.show({ tone: 'success', title: `${data.name} added`, description: `Member code ${data.memberCode}` });
          router.push(`/members/${data.id}`);
        }}
      />
    </div>
  );
}

export default function NewMemberPage() {
  return (
    <RequirePermission permission="members:create">
      <NewMember />
    </RequirePermission>
  );
}
