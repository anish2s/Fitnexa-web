'use client';

import { useState } from 'react';
import { Wallet } from 'lucide-react';
import { Button, Input, Modal, Select, useToast } from '@fitexaa/ui';

export function RecordPaymentForm() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Input label="Amount (₹)" defaultValue="2,500" inputMode="decimal" required hint="Balance due ₹5,000" />
      <Select
        label="Method"
        required
        defaultValue="upi"
        options={[
          { value: 'cash', label: 'Cash' },
          { value: 'upi', label: 'UPI' },
          { value: 'card', label: 'Card' },
          { value: 'bank_transfer', label: 'Bank transfer' },
        ]}
      />
      <Input label="Reference" placeholder="UPI ref / last 4 digits" wrapperClassName="sm:col-span-2" />
    </div>
  );
}

export function ModalDemo() {
  const [open, setOpen] = useState(false);
  const toast = useToast();
  return (
    <>
      <Button variant="secondary" leftIcon={<Wallet className="size-4" />} onClick={() => setOpen(true)}>Open modal</Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Record payment"
        description="Kabir Singh · Yearly membership"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              onClick={() => {
                setOpen(false);
                toast.show({ tone: 'success', title: 'Payment recorded', description: '₹2,500 UPI · RCPT/2026-27/0419' });
              }}
            >
              Record ₹2,500
            </Button>
          </>
        }
      >
        <RecordPaymentForm />
      </Modal>
    </>
  );
}

export function ToastDemo() {
  const toast = useToast();
  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="secondary" size="sm" onClick={() => toast.show({ tone: 'success', title: 'Member added', description: 'Tanvi Desai · M0413' })}>Success</Button>
      <Button variant="secondary" size="sm" onClick={() => toast.show({ tone: 'error', title: 'Check-in refused', description: 'Membership expired on 10 Nov 2026' })}>Error</Button>
      <Button variant="secondary" size="sm" onClick={() => toast.show({ tone: 'warning', title: 'Email not configured', description: 'Sign-in links will send once email is set up.' })}>Warning</Button>
      <Button variant="secondary" size="sm" onClick={() => toast.show({ tone: 'info', title: 'Import validated', description: '214 rows ready, 0 errors' })}>Info</Button>
    </div>
  );
}
