export interface BrandPalette {
  primary: string;
  secondary: string;
  success: string;
  danger: string;
  warning: string;
}

export interface BrandIdentity {
  id: string;
  name: string;
  description?: string;
  palette: BrandPalette;
  createdAt: string;
  updatedAt: string;
  isBuiltIn?: boolean;
}

export type BrandAssignmentMode = 'global' | 'account' | 'time' | 'account_time';

export interface BrandIdentityAssignment {
  id: string;
  identityId: string;
  mode: BrandAssignmentMode;
  accountId?: number;
  startAt?: string;
  endAt?: string;
  priority: number;
  enabled: boolean;
  notes?: string;
  updatedAt: string;
}

export const BRAND_IDENTITIES_KEY = 'smartAccountant_brandIdentities';
export const BRAND_ASSIGNMENTS_KEY = 'smartAccountant_brandIdentityAssignments';
export const BRAND_IDENTITY_CHANGED_EVENT = 'brandIdentityChanged';

const HEX_COLOR_REGEX = /^#[0-9a-fA-F]{6}$/;

const DEFAULT_IDENTITIES: BrandIdentity[] = [
  {
    id: 'brand_classic_blue',
    name: 'كلاسيك أزرق',
    description: 'الهوية الافتراضية للنظام',
    palette: {
      primary: '#1e40af',
      secondary: '#475569',
      success: '#059669',
      danger: '#dc2626',
      warning: '#d97706',
    },
    createdAt: new Date('2024-01-01T00:00:00.000Z').toISOString(),
    updatedAt: new Date('2024-01-01T00:00:00.000Z').toISOString(),
    isBuiltIn: true,
  },
  {
    id: 'brand_emerald_night',
    name: 'زمردي حديث',
    description: 'هوية بديلة مريحة للواجهة الحديثة',
    palette: {
      primary: '#0f766e',
      secondary: '#334155',
      success: '#16a34a',
      danger: '#be123c',
      warning: '#b45309',
    },
    createdAt: new Date('2024-01-01T00:00:00.000Z').toISOString(),
    updatedAt: new Date('2024-01-01T00:00:00.000Z').toISOString(),
    isBuiltIn: true,
  },
];

const DEFAULT_ASSIGNMENTS: BrandIdentityAssignment[] = [
  {
    id: 'assign_global_default',
    identityId: 'brand_classic_blue',
    mode: 'global',
    priority: 0,
    enabled: true,
    updatedAt: new Date('2024-01-01T00:00:00.000Z').toISOString(),
  },
];

const safeParse = <T>(raw: string | null, fallback: T): T => {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const emitChanged = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(BRAND_IDENTITY_CHANGED_EVENT));
  }
};

const normalizeHex = (value: string, fallback: string): string => {
  if (!value) return fallback;
  const normalized = value.trim();
  return HEX_COLOR_REGEX.test(normalized) ? normalized.toLowerCase() : fallback;
};

const createId = (prefix: string): string => {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
};

export const getCurrentAccountId = (): number | undefined => {
  try {
    const raw = sessionStorage.getItem('smart_accountant_user') || localStorage.getItem('smart_accountant_user');
    if (!raw) return undefined;
    const parsed = JSON.parse(raw);
    const accountId = Number(parsed?.accountId);
    return Number.isFinite(accountId) && accountId > 0 ? accountId : undefined;
  } catch {
    return undefined;
  }
};

export const getBrandIdentities = (): BrandIdentity[] => {
  const stored = safeParse<BrandIdentity[]>(localStorage.getItem(BRAND_IDENTITIES_KEY), []);
  if (!stored.length) {
    localStorage.setItem(BRAND_IDENTITIES_KEY, JSON.stringify(DEFAULT_IDENTITIES));
    return [...DEFAULT_IDENTITIES];
  }

  // Ensure built-in identities always exist.
  const ids = new Set(stored.map((i) => i.id));
  const merged = [...stored];
  for (const builtIn of DEFAULT_IDENTITIES) {
    if (!ids.has(builtIn.id)) {
      merged.push(builtIn);
    }
  }

  return merged;
};

export const saveBrandIdentities = (identities: BrandIdentity[]): void => {
  localStorage.setItem(BRAND_IDENTITIES_KEY, JSON.stringify(identities));
  emitChanged();
};

export const upsertBrandIdentity = (
  payload: Omit<BrandIdentity, 'createdAt' | 'updatedAt'> & Partial<Pick<BrandIdentity, 'createdAt'>>
): BrandIdentity => {
  const identities = getBrandIdentities();
  const now = new Date().toISOString();

  const normalized: BrandIdentity = {
    id: payload.id,
    name: payload.name.trim(),
    description: payload.description?.trim() || '',
    palette: {
      primary: normalizeHex(payload.palette.primary, '#1e40af'),
      secondary: normalizeHex(payload.palette.secondary, '#475569'),
      success: normalizeHex(payload.palette.success, '#059669'),
      danger: normalizeHex(payload.palette.danger, '#dc2626'),
      warning: normalizeHex(payload.palette.warning, '#d97706'),
    },
    isBuiltIn: payload.isBuiltIn === true,
    createdAt: payload.createdAt || now,
    updatedAt: now,
  };

  const index = identities.findIndex((x) => x.id === normalized.id);
  if (index >= 0) {
    identities[index] = {
      ...identities[index],
      ...normalized,
      createdAt: identities[index].createdAt || normalized.createdAt,
      isBuiltIn: identities[index].isBuiltIn === true,
    };
  } else {
    identities.unshift(normalized);
  }

  saveBrandIdentities(identities);
  return normalized;
};

export const createBrandIdentity = (
  payload: Omit<BrandIdentity, 'id' | 'createdAt' | 'updatedAt'>
): BrandIdentity => {
  return upsertBrandIdentity({
    ...payload,
    id: createId('brand'),
  });
};

export const deleteBrandIdentity = (id: string): boolean => {
  const identities = getBrandIdentities();
  const target = identities.find((x) => x.id === id);
  if (!target) return false;
  if (target.isBuiltIn) return false;

  const filtered = identities.filter((x) => x.id !== id);
  saveBrandIdentities(filtered);

  // Also clean assignments linked to deleted identity.
  const assignments = getBrandAssignments().filter((a) => a.identityId !== id);
  saveBrandAssignments(assignments);
  return true;
};

export const getBrandAssignments = (): BrandIdentityAssignment[] => {
  const stored = safeParse<BrandIdentityAssignment[]>(localStorage.getItem(BRAND_ASSIGNMENTS_KEY), []);
  if (!stored.length) {
    localStorage.setItem(BRAND_ASSIGNMENTS_KEY, JSON.stringify(DEFAULT_ASSIGNMENTS));
    return [...DEFAULT_ASSIGNMENTS];
  }
  return stored;
};

export const saveBrandAssignments = (assignments: BrandIdentityAssignment[]): void => {
  localStorage.setItem(BRAND_ASSIGNMENTS_KEY, JSON.stringify(assignments));
  emitChanged();
};

export const upsertBrandAssignment = (
  payload: Omit<BrandIdentityAssignment, 'updatedAt'>
): BrandIdentityAssignment => {
  const assignments = getBrandAssignments();
  const normalized: BrandIdentityAssignment = {
    ...payload,
    notes: payload.notes?.trim() || '',
    updatedAt: new Date().toISOString(),
  };

  const index = assignments.findIndex((x) => x.id === normalized.id);
  if (index >= 0) {
    assignments[index] = normalized;
  } else {
    assignments.unshift(normalized);
  }

  saveBrandAssignments(assignments);
  return normalized;
};

export const createBrandAssignment = (
  payload: Omit<BrandIdentityAssignment, 'id' | 'updatedAt'>
): BrandIdentityAssignment => {
  return upsertBrandAssignment({
    ...payload,
    id: createId('assign'),
  });
};

export const deleteBrandAssignment = (id: string): void => {
  const assignments = getBrandAssignments().filter((x) => x.id !== id);
  saveBrandAssignments(assignments);
};

const isDateWithin = (now: Date, startAt?: string, endAt?: string): boolean => {
  if (startAt) {
    const start = new Date(startAt);
    if (!Number.isNaN(start.getTime()) && now < start) return false;
  }
  if (endAt) {
    const end = new Date(endAt);
    if (!Number.isNaN(end.getTime()) && now > end) return false;
  }
  return true;
};

const computeSpecificity = (assignment: BrandIdentityAssignment): number => {
  const hasAccount = typeof assignment.accountId === 'number' && assignment.accountId > 0;
  const hasTime = Boolean(assignment.startAt || assignment.endAt);
  if (hasAccount && hasTime) return 4;
  if (hasAccount) return 3;
  if (hasTime) return 2;
  return 1;
};

export const resolveEffectiveBrandIdentity = (
  identities: BrandIdentity[],
  assignments: BrandIdentityAssignment[],
  accountId?: number,
  now: Date = new Date()
): BrandIdentity => {
  const identityMap = new Map(identities.map((x) => [x.id, x]));

  const candidates = assignments
    .filter((a) => a.enabled)
    .filter((a) => identityMap.has(a.identityId))
    .filter((a) => {
      if (a.mode === 'account' || a.mode === 'account_time') {
        return typeof accountId === 'number' && a.accountId === accountId;
      }
      return true;
    })
    .filter((a) => {
      if (a.mode === 'time' || a.mode === 'account_time') {
        return isDateWithin(now, a.startAt, a.endAt);
      }
      return true;
    })
    .sort((a, b) => {
      const bySpecificity = computeSpecificity(b) - computeSpecificity(a);
      if (bySpecificity !== 0) return bySpecificity;
      const byPriority = b.priority - a.priority;
      if (byPriority !== 0) return byPriority;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

  if (candidates.length > 0) {
    const matched = identityMap.get(candidates[0].identityId);
    if (matched) return matched;
  }

  return identities[0] || DEFAULT_IDENTITIES[0];
};

export const getEffectiveBrandIdentity = (accountId?: number, now: Date = new Date()): BrandIdentity => {
  const identities = getBrandIdentities();
  const assignments = getBrandAssignments();
  const finalAccountId = accountId ?? getCurrentAccountId();
  return resolveEffectiveBrandIdentity(identities, assignments, finalAccountId, now);
};
