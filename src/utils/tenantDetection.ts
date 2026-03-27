export interface TenantDetectionResult {
  method: 'subdomain' | 'context' | 'none';
  slug?: string;
}

export function detectTenantFromUrl(): TenantDetectionResult {
  const hostname = window.location.hostname;
  const isProduction = import.meta.env.VITE_ENABLE_SUBDOMAIN_TENANCY === 'true';

  if (!isProduction) {
    return { method: 'context' };
  }

  const baseDomain = import.meta.env.VITE_BASE_DOMAIN || 'localhost';

  if (hostname === baseDomain || hostname === `www.${baseDomain}`) {
    return { method: 'none' };
  }

  const subdomainMatch = hostname.match(/^([^.]+)\./);
  if (subdomainMatch && subdomainMatch[1] !== 'www') {
    return {
      method: 'subdomain',
      slug: subdomainMatch[1]
    };
  }

  return { method: 'context' };
}

export function getPublicUrl(): string {
  const baseDomain = import.meta.env.VITE_BASE_DOMAIN || window.location.hostname;
  const protocol = window.location.protocol;
  return `${protocol}//${baseDomain}`;
}

export function getTenantUrl(slug: string): string {
  const isProduction = import.meta.env.VITE_ENABLE_SUBDOMAIN_TENANCY === 'true';

  if (!isProduction) {
    return window.location.origin;
  }

  const baseDomain = import.meta.env.VITE_BASE_DOMAIN || window.location.hostname;
  const protocol = window.location.protocol;
  return `${protocol}//${slug}.${baseDomain}`;
}

export function isValidSlug(slug: string): boolean {
  const slugRegex = /^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/;

  if (!slugRegex.test(slug)) {
    return false;
  }

  const reservedSlugs = [
    'www', 'api', 'admin', 'app', 'mail', 'ftp', 'localhost',
    'staging', 'dev', 'test', 'demo', 'support', 'help',
    'docs', 'blog', 'status', 'cdn', 'assets', 'static'
  ];

  return !reservedSlugs.includes(slug.toLowerCase());
}
