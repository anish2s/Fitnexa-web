/** Which pages a site + signed-in role may open (server guards in page-guard.ts; pure, unit-tested). */

export type SessionRole =
  | { scope: 'tenant'; role: 'owner' | 'staff' | 'member' }
  | { scope: 'platform'; role: 'super_admin' };

export interface PageRule {
  /** On a gym host: who may open it (absent = the page doesn't exist on gym hosts). */
  gym?: 'owner';
  /** Exists on the platform host (super admins only). */
  platform?: boolean;
}

/** Pure decision, unit-tested: may this site + session see a page with this rule? */
export function allowed(rule: PageRule, site: 'gym' | 'platform', session: SessionRole | null): boolean {
  if (site === 'gym') {
    if (!rule.gym) return false;
    return !session || (session.scope === 'tenant' && session.role === rule.gym);
  }
  if (!rule.platform) return false;
  return !session || session.scope === 'platform';
}

/** Owner-only gym pages and platform-only console pages, guarded on the server. */
export const PAGE_RULES = {
  staff: { gym: 'owner' },
  auditLog: { gym: 'owner', platform: true },
  gyms: { platform: true },
} as const satisfies Record<string, PageRule>;

/** The rule for a page path, if it is guarded (sub-pages included: /gyms/new, /gyms/:id). */
export function ruleFor(pathname: string): PageRule | undefined {
  const top = pathname.split('/')[1];
  return top === 'staff' ? PAGE_RULES.staff : top === 'audit-log' ? PAGE_RULES.auditLog : top === 'gyms' ? PAGE_RULES.gyms : undefined;
}
