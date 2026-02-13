const GUARDED_METHODS = new Set(['PUT', 'PATCH', 'DELETE']);
const APP_NOTIFY_EVENT = 'app:notify';
const EXCLUDED_PATTERNS: RegExp[] = [
  /\/auth\/login\b/i,
  /\/auth\/register\b/i,
  // These deletes already show explicit modal confirmations in UI pages.
  /\/notifications\/\d+\/?(?:\?.*)?$/i,
  /\/messages\/\d+\/?(?:\?.*)?$/i,
];

let isInstalled = false;

function getRequestMethod(input: RequestInfo | URL, init?: RequestInit): string {
  if (init?.method) return init.method.toUpperCase();
  if (typeof Request !== 'undefined' && input instanceof Request) {
    return (input.method || 'GET').toUpperCase();
  }
  return 'GET';
}

function getRequestUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input;
  if (typeof URL !== 'undefined' && input instanceof URL) return input.toString();
  if (typeof Request !== 'undefined' && input instanceof Request) return input.url;
  return '';
}

function isExcludedUrl(url: string): boolean {
  if (!url) return false;
  return EXCLUDED_PATTERNS.some(pattern => pattern.test(url));
}

function getRequestPath(url: string): string {
  if (!url) return '';
  try {
    const parsed = new URL(url, window.location.origin);
    return parsed.pathname.toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

function showGuardNotification(message: string): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(APP_NOTIFY_EVENT, {
    detail: { message, type: 'warning' },
  }));
}

function getGuardMessage(method: string, url: string): string {
  const path = getRequestPath(url);

  if (method === 'DELETE') {
    if (/\/notifications\/clear-all\b/i.test(path)) {
      return 'تنبيه أمان: سيتم حذف جميع الإشعارات.';
    }
    if (/\/notifications\b/i.test(path)) {
      return 'تنبيه أمان: سيتم حذف إشعار.';
    }
    if (/\/messages\b/i.test(path)) {
      return 'تنبيه أمان: سيتم حذف رسالة.';
    }
    return 'تنبيه أمان: سيتم حذف بيانات.';
  }

  if (method === 'PUT' || method === 'PATCH') {
    if (/\/(notifications|messages)\/\d+\/read\b/i.test(path) || /\/notifications\/read-all\b/i.test(path)) {
      return 'تنبيه: سيتم تعديل حالة القراءة.';
    }
    if (/\/(users|roles)\/\d+\/(status|lock)\b/i.test(path)) {
      return 'تنبيه: سيتم تغيير حالة العنصر.';
    }
  }

  return 'تنبيه أمان: سيتم تعديل بيانات.';
}

export function installMutationConfirmGuard(): void {
  if (isInstalled || typeof window === 'undefined') {
    return;
  }

  const originalFetch = window.fetch.bind(window);

  const guardedFetch: typeof window.fetch = async (input, init) => {
    const method = getRequestMethod(input, init);
    const url = getRequestUrl(input);

    if (GUARDED_METHODS.has(method) && !isExcludedUrl(url)) {
      showGuardNotification(getGuardMessage(method, url));
    }

    return originalFetch(input, init);
  };

  window.fetch = guardedFetch;
  isInstalled = true;
}
