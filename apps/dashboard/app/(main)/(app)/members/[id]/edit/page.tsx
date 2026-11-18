'use client';

import Link from 'next/link';
import { use } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Archive } from 'lucide-react';
import { buttonClasses, Card, EmptyState, Skeleton, useToast } from '@fitexaa/ui';
import { useAuth } from '@/lib/auth';
import { useMember } from '@/lib/queries';
import { errorMessage } from '@/lib/errors';
import { RequirePermission } from '@/components/require-permission';
import { PageHeader } from '@/components/page-header';
import { MemberForm, toUpdateBody } from '@/components/members/member-form';

function EditMember({ id }: { id: string }) {
  const { api } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();
  const member = useMember(id);
  const back = `/members/${id}`;

  if (member.isError) {
    return <Card className="mx-auto max-w-5xl"><EmptyState title="Couldn’t load this member" description={errorMessage(member.error)} action={<Link href="/members" className={buttonClasses()}>Back to members</Link>} /></Card>;
  }
  if (!member.data) return <div className="mx-auto flex max-w-5xl flex-col gap-4" aria-busy><Skeleton className="h-10 w-64" /><Skeleton className="h-72" /><Skeleton className="h-40" /></div>;
  const m = member.data;
  if (m.archivedAt) {
    return (
      <Card className="mx-auto max-w-5xl">
        <EmptyState icon={<Archive />} title={`${m.name} is archived`} description="Restore the member before editing their details." action={<Link href={back} className={buttonClasses()}>Go to profile</Link>} />
      </Card>
    );
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-5">
      <Link href={back} className="inline-flex w-fit items-center gap-1.5 text-sm text-muted hover:text-fg"><ArrowLeft className="size-4" /> {m.name}</Link>
      <PageHeader title="Edit member" description={`${m.memberCode} · ${m.name}`} />
      <MemberForm
        member={m}
        cancelHref={back}
        onSubmit={async (values, before) => {
          const body = toUpdateBody(values, before);
          if (Object.keys(body).length > 0) {
            const { data } = await api.patch('/api/v1/members/{id}', { params: { id }, body });
            queryClient.setQueryData(['member', id], data);
            void queryClient.invalidateQueries({ queryKey: ['members'] });
            toast.show({ tone: 'success', title: 'Changes saved' });
          }
          router.push(back);
        }}
      />
    </div>
  );
}

export default function EditMemberPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <RequirePermission permission="members:update">
      <EditMember id={id} />
    </RequirePermission>
  );
}
