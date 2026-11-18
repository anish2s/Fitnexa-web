'use client';

import Link from 'next/link';
import { useRef, useState, type DragEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CheckCircle2, Download, FileSpreadsheet, RotateCcw, Upload } from 'lucide-react';
import { Badge, Button, buttonClasses, Card, CardBody, CardHeader, Checkbox, Spinner, Table, TBody, TD, TH, THead, TR, cn } from '@fitexaa/ui';
import { ApiError, type ImportReport } from '@fitexaa/api-client';
import { useAuth } from '@/lib/auth';
import { errorMessage, errorRef } from '@/lib/errors';
import { num } from '@/lib/format';
import { FormAlert } from '@/components/form-alert';
import { PageHeader } from '@/components/page-header';

const MAX_BYTES = 1024 * 1024;

const COLUMNS: { name: string; note: string; required?: boolean }[] = [
  { name: 'name', note: 'Full name', required: true },
  { name: 'phone', note: '10-digit mobile, or with +91. Column may be called “mobile”.', required: true },
  { name: 'email', note: 'Gives the member access to the member app' },
  { name: 'gender', note: 'male, female, other or undisclosed' },
  { name: 'date_of_birth', note: 'DD/MM/YYYY or YYYY-MM-DD. Column may be called “dob”.' },
  { name: 'join_date', note: 'DD/MM/YYYY or YYYY-MM-DD. Empty = today.' },
  { name: 'emergency_contact_name', note: '' },
  { name: 'emergency_contact_phone', note: '' },
  { name: 'emergency_contact_relation', note: '' },
  { name: 'notes', note: 'Staff-only notes' },
];

const TEMPLATE =
  'name,phone,email,gender,date_of_birth,join_date,emergency_contact_name,emergency_contact_phone,emergency_contact_relation,notes\n' +
  'Asha Verma,9876543210,asha@example.com,female,14/02/1995,01/04/2026,Ravi Verma,9876500000,Husband,\n';

type Step =
  | { kind: 'pick' }
  | { kind: 'checking'; fileName: string }
  | { kind: 'report'; fileName: string; csv: string; report: ImportReport }
  | { kind: 'done'; report: ImportReport };

function downloadTemplate() {
  const url = URL.createObjectURL(new Blob([TEMPLATE], { type: 'text/csv' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = 'members-template.csv';
  a.click();
  URL.revokeObjectURL(url);
}

/** The API's generic "missing value" wording, said the way a spreadsheet user would. */
function problem(message: string): string {
  return /received undefined|^required$/i.test(message) ? 'This cell is empty' : message;
}

function ErrorTable({ report }: { report: ImportReport }) {
  const shown = report.errors.length;
  return (
    <Card className="overflow-hidden">
      <CardHeader
        title="Rows to fix"
        description={`Row numbers match your spreadsheet (the header is row 1).${report.errorCount > shown ? ` Showing the first ${num(shown)} of ${num(report.errorCount)} problems.` : ''}`}
      />
      <div className="max-h-[420px] overflow-auto">
        <Table>
          <THead className="sticky top-0 z-[1]">
            <tr>
              <TH className="w-20">Row</TH>
              <TH className="w-48">Column</TH>
              <TH>Problem</TH>
            </tr>
          </THead>
          <TBody>
            {report.errors.map((e, i) => (
              <TR key={`${e.row}-${e.field}-${i}`}>
                <TD className="tabular-nums">{e.row}</TD>
                <TD>{e.field ? <code className="rounded-xs bg-surface-2 px-1.5 py-0.5 text-xs">{e.field}</code> : <span className="text-subtle">—</span>}</TD>
                <TD className="text-muted">{problem(e.message)}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </div>
    </Card>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: 'success' | 'danger' }) {
  return (
    <div className="rounded-lg border border-border bg-surface-2 p-4">
      <p className="text-sm text-muted">{label}</p>
      <p className={cn('mt-1 text-2xl font-semibold tabular-nums', tone === 'success' && 'text-success-text', tone === 'danger' && 'text-danger-text')}>{num(value)}</p>
    </div>
  );
}

export function MemberImport() {
  const { api } = useAuth();
  const queryClient = useQueryClient();
  const input = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>({ kind: 'pick' });
  const [dragging, setDragging] = useState(false);
  const [consent, setConsent] = useState(false);
  const [consentError, setConsentError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [failure, setFailure] = useState<{ message: string; ref?: string } | null>(null);

  function reset() {
    setStep({ kind: 'pick' });
    setConsent(false);
    setConsentError(null);
    setFailure(null);
    if (input.current) input.current.value = '';
  }

  /** Dry run: the API validates every row and writes nothing. */
  async function check(file: File) {
    setFailure(null);
    if (!/\.(csv|txt)$/i.test(file.name) && file.type !== 'text/csv') {
      setFailure({ message: 'Choose a .csv file. In Excel or Google Sheets use File → Save as / Download → CSV.' });
      return;
    }
    if (file.size > MAX_BYTES) {
      setFailure({ message: 'This file is over 1 MB. Split it into smaller files (up to 2,000 members each).' });
      return;
    }
    setStep({ kind: 'checking', fileName: file.name });
    try {
      const csv = await file.text();
      const { data } = await api.post('/api/v1/members/import', { query: { dryRun: 'true' }, rawBody: { contentType: 'text/csv', data: csv } });
      setConsent(false);
      setStep({ kind: 'report', fileName: file.name, csv, report: data });
    } catch (err) {
      setStep({ kind: 'pick' });
      setFailure({ message: errorMessage(err), ref: errorRef(err) });
    }
  }

  async function runImport(csv: string, fileName: string) {
    if (!consent) {
      setConsentError('Confirm consent before importing');
      return;
    }
    setImporting(true);
    setFailure(null);
    try {
      const { data } = await api.post('/api/v1/members/import', { query: { dryRun: 'false', consentConfirmed: 'true' }, rawBody: { contentType: 'text/csv', data: csv } });
      void queryClient.invalidateQueries({ queryKey: ['members'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setStep({ kind: 'done', report: data });
    } catch (err) {
      // Something changed since the check (e.g. a member was added meanwhile): show the new report.
      if (err instanceof ApiError && err.code === 'IMPORT_INVALID' && err.details) {
        setStep({ kind: 'report', fileName, csv, report: err.details as ImportReport });
        setFailure({ message: 'Some rows now clash with members added since the check. Nothing was imported.' });
      } else {
        setFailure({ message: errorMessage(err), ref: errorRef(err) });
      }
    } finally {
      setImporting(false);
    }
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void check(file);
  };

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-5">
      <Link href="/members" className="inline-flex w-fit items-center gap-1.5 text-sm text-muted hover:text-fg"><ArrowLeft className="size-4" /> Members</Link>
      <PageHeader
        title="Import members"
        description="Bring in your existing members from a spreadsheet. We check the whole file first; nothing is saved until you confirm."
        actions={step.kind !== 'done' && <Button variant="secondary" leftIcon={<Download className="size-4" />} onClick={downloadTemplate}>Download template</Button>}
      />

      {failure && <FormAlert tone="danger" message={failure.message} reference={failure.ref} />}

      {(step.kind === 'pick' || step.kind === 'checking') && (
        <>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={cn('flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed bg-surface px-6 py-12 text-center transition-colors', dragging ? 'border-accent bg-accent-soft' : 'border-border-strong')}
          >
            {step.kind === 'checking' ? (
              <>
                <Spinner className="size-6 text-accent-text" />
                <p className="font-medium">Checking {step.fileName}…</p>
                <p className="text-sm text-muted">Validating every row. Nothing is saved yet.</p>
              </>
            ) : (
              <>
                <span className="flex size-12 items-center justify-center rounded-xl bg-accent-soft text-accent-text"><FileSpreadsheet className="size-6" /></span>
                <div>
                  <p className="font-medium">Drop a CSV file here</p>
                  <p className="mt-1 text-sm text-muted">Up to 2,000 members and 1 MB per file. Excel and Google Sheets CSV exports work.</p>
                </div>
                <Button leftIcon={<Upload className="size-4" />} onClick={() => input.current?.click()}>Choose file</Button>
              </>
            )}
            <input ref={input} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => e.target.files?.[0] && void check(e.target.files[0])} />
          </div>

          <Card className="overflow-hidden">
            <CardHeader title="Columns" description="The first row must be a header. Columns can be in any order; unknown columns are ignored." />
            <Table>
              <THead><tr><TH className="w-64">Column</TH><TH>What to put in it</TH></tr></THead>
              <TBody>
                {COLUMNS.map((c) => (
                  <TR key={c.name}>
                    <TD><code className="rounded-xs bg-surface-2 px-1.5 py-0.5 text-xs">{c.name}</code>{c.required && <Badge tone="accent" className="ml-2">Required</Badge>}</TD>
                    <TD className="text-muted">{c.note || '—'}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </Card>
        </>
      )}

      {step.kind === 'report' && (
        <>
          <Card>
            <CardHeader
              title={step.report.errorCount === 0 ? 'Ready to import' : 'Some rows need fixing'}
              description={step.fileName}
              action={<Button variant="ghost" size="sm" leftIcon={<RotateCcw className="size-4" />} onClick={reset}>Choose another file</Button>}
            />
            <CardBody className="grid gap-3 sm:grid-cols-3">
              <Stat label="Rows in file" value={step.report.total} />
              <Stat label="Ready" value={step.report.valid} tone="success" />
              <Stat label="Rows with problems" value={step.report.total - step.report.valid} tone={step.report.total - step.report.valid ? 'danger' : undefined} />
            </CardBody>
          </Card>

          {step.report.errorCount > 0 ? (
            <>
              <FormAlert tone="info" message="Imports are all or nothing. Fix these rows in your spreadsheet, save it as CSV again and upload it. No members were added." />
              <ErrorTable report={step.report} />
            </>
          ) : (
            <Card className="border-accent-ring/50">
              <CardBody className="flex flex-col gap-4 p-5 sm:p-6">
                <Checkbox
                  checked={consent}
                  onChange={(e) => { setConsent(e.target.checked); setConsentError(null); }}
                  label={`All ${num(step.report.total)} members in this file agreed to the gym storing their details`}
                  description="The same consent the front desk records when registering a member. It is stored with today’s date and your name."
                  error={consentError ?? undefined}
                />
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <Button variant="secondary" onClick={reset} disabled={importing}>Cancel</Button>
                  <Button leftIcon={<Upload className="size-4" />} loading={importing} onClick={() => runImport(step.csv, step.fileName)}>
                    Import {num(step.report.total)} {step.report.total === 1 ? 'member' : 'members'}
                  </Button>
                </div>
              </CardBody>
            </Card>
          )}
        </>
      )}

      {step.kind === 'done' && (
        <Card>
          <CardBody className="flex flex-col items-center gap-3 px-6 py-12 text-center">
            <span className="flex size-12 items-center justify-center rounded-xl bg-success-soft text-success-text"><CheckCircle2 className="size-6" /></span>
            <h2 className="text-xl font-semibold">{num(step.report.created)} {step.report.created === 1 ? 'member' : 'members'} imported</h2>
            {step.report.firstCode && (
              <p className="text-sm text-muted">
                Member codes {step.report.firstCode}{step.report.lastCode && step.report.lastCode !== step.report.firstCode ? ` to ${step.report.lastCode}` : ''}.
                Members with an email can now sign in to the member app.
              </p>
            )}
            <div className="mt-2 flex flex-wrap justify-center gap-2">
              <Link href="/members" className={buttonClasses()}>View members</Link>
              <Button variant="secondary" onClick={reset}>Import another file</Button>
            </div>
          </CardBody>
        </Card>
      )}

    </div>
  );
}
