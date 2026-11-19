import { randomBytes } from 'node:crypto';

export const DATASETS = ['vehicles', 'trips', 'reports'];
export const PERMISSIONS = ['view', 'download'];
export const FORMATS = ['json', 'csv'];

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class ShareError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'ShareError';
    this.code = code;
  }
}

export function toCsv(rows) {
  if (!rows.length) return '';
  const cols = [...new Set(rows.flatMap((r) => Object.keys(r)))];
  const esc = (v) => {
    let s = v == null ? '' : String(v);
    // Neutralise spreadsheet formula injection.
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.join(','), ...rows.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\n');
}

/**
 * In-memory data share component: create expiring, revocable share links for a
 * fleet dataset, restricted to a list of recipients with view/download rights.
 */
export function createDataShareService({ datasets = {}, now = () => Date.now(), baseUrl = 'https://fleet.example.com/share' } = {}) {
  const shares = new Map();

  const publicView = (s) => ({
    id: s.id, token: s.token, url: `${baseUrl}/${s.token}`, dataset: s.dataset,
    format: s.format, recipients: [...s.recipients], permission: s.permission,
    createdAt: s.createdAt, expiresAt: s.expiresAt, revoked: s.revoked,
  });

  function createShare({ dataset, recipients = [], permission = 'view', format = 'json', expiresInHours = 72, createdBy = 'unknown' } = {}) {
    if (!DATASETS.includes(dataset)) throw new ShareError(`Unknown dataset: ${dataset}`, 'INVALID_DATASET');
    if (!PERMISSIONS.includes(permission)) throw new ShareError(`Invalid permission: ${permission}`, 'INVALID_PERMISSION');
    if (!FORMATS.includes(format)) throw new ShareError(`Invalid format: ${format}`, 'INVALID_FORMAT');
    if (!Number.isFinite(expiresInHours) || expiresInHours <= 0) throw new ShareError('expiresInHours must be positive', 'INVALID_EXPIRY');
    const clean = [...new Set(recipients.map((r) => String(r).trim().toLowerCase()))];
    if (!clean.length) throw new ShareError('At least one recipient is required', 'NO_RECIPIENTS');
    const bad = clean.find((r) => !EMAIL.test(r));
    if (bad) throw new ShareError(`Invalid recipient email: ${bad}`, 'INVALID_RECIPIENT');

    const created = now();
    const share = {
      id: randomBytes(8).toString('hex'),
      token: randomBytes(24).toString('base64url'),
      dataset, format, permission, recipients: clean, createdBy,
      createdAt: created, expiresAt: created + expiresInHours * 3600_000, revoked: false,
    };
    shares.set(share.token, share);
    return publicView(share);
  }

  function revokeShare(token) {
    const s = shares.get(token);
    if (!s) throw new ShareError('Share not found', 'NOT_FOUND');
    s.revoked = true;
    return publicView(s);
  }

  function listShares() {
    return [...shares.values()].map(publicView);
  }

  /** Resolve a share token for a recipient and return the shared data. */
  function accessShare(token, email) {
    const s = shares.get(token);
    if (!s) throw new ShareError('Share not found', 'NOT_FOUND');
    if (s.revoked) throw new ShareError('Share has been revoked', 'REVOKED');
    if (now() >= s.expiresAt) throw new ShareError('Share has expired', 'EXPIRED');
    if (!s.recipients.includes(String(email).trim().toLowerCase())) throw new ShareError('Not a recipient of this share', 'FORBIDDEN');
    const rows = datasets[s.dataset] ?? [];
    const canDownload = s.permission === 'download';
    return {
      dataset: s.dataset, permission: s.permission, canDownload, rowCount: rows.length,
      rows,
      export: canDownload ? (s.format === 'csv' ? toCsv(rows) : JSON.stringify(rows, null, 2)) : null,
    };
  }

  return { createShare, revokeShare, listShares, accessShare };
}
