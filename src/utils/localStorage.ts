export const storage = {
  get: <T>(key: string, defaultValue: T): T => {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return defaultValue;
      const item = window.localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : defaultValue;
    } catch {
      return defaultValue;
    }
  },
  set: <T>(key: string, value: T): void => {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return;
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Ignore write errors in restricted environments
    }
  },
  remove: (key: string): void => {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return;
      window.localStorage.removeItem(key);
    } catch {
      // Ignore remove errors
    }
  }
};
