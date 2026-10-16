import type { AnchorHTMLAttributes } from 'react';
import { href, useLocation } from '../router';

export interface LinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  to: string;
  params?: Record<string, string | undefined>;
  /** Mark as current page when the path (and given params) match. */
  matchParams?: boolean;
}

/** A plain anchor to a hash route; sets aria-current="page" when active. */
export function Link({ to, params, matchParams, children, ...rest }: LinkProps) {
  const location = useLocation();
  const target = href(to, params);
  const active =
    location.path === to &&
    (!matchParams ||
      (Object.entries(params ?? {}).every(
        ([key, value]) => (location.params.get(key) ?? undefined) === value,
      ) &&
        [...location.params.keys()].every((key) => key in (params ?? {}))));
  return (
    <a href={target} aria-current={active ? 'page' : undefined} {...rest}>
      {children}
    </a>
  );
}
