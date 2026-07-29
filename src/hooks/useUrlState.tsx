import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "@/lib/router-compat";

/**
 * useUrlParam - keep a single query-string parameter in sync with React state.
 * The URL is the single source of truth. Values equal to `defaultValue`
 * are removed from the URL to keep it clean.
 */
export function useUrlParam<T extends string = string>(
  key: string,
  defaultValue: T,
  options: { replace?: boolean } = {}
): [T, (v: T) => void] {
  const { replace = true } = options;
  const [searchParams, setSearchParams] = useSearchParams();
  const value = (searchParams.get(key) as T) ?? defaultValue;

  const setValue = useCallback(
    (v: T) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (!v || v === defaultValue || v === "") {
            next.delete(key);
          } else {
            next.set(key, String(v));
          }
          return next;
        },
        { replace }
      );
    },
    [key, defaultValue, setSearchParams, replace]
  );

  return [value, setValue];
}

/**
 * useDebouncedUrlParam - local state that syncs to the URL after `delay` ms.
 * Ideal for search inputs where you don't want a URL change on every keystroke.
 */
export function useDebouncedUrlParam(
  key: string,
  defaultValue = "",
  delay = 400
): [string, (v: string) => void] {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlVal = searchParams.get(key) ?? defaultValue;
  const [local, setLocal] = useState<string>(urlVal);
  const lastUrlVal = useRef(urlVal);

  // If URL changes externally (back/forward, share link), sync local
  useEffect(() => {
    if (urlVal !== lastUrlVal.current) {
      lastUrlVal.current = urlVal;
      setLocal(urlVal);
    }
  }, [urlVal]);

  // Debounce writes to URL
  useEffect(() => {
    if (local === urlVal) return;
    const t = setTimeout(() => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (!local || local === defaultValue) next.delete(key);
          else next.set(key, local);
          return next;
        },
        { replace: true }
      );
      lastUrlVal.current = local;
    }, delay);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [local, delay]);

  return [local, setLocal];
}

/**
 * useUrlNumberParam - integer-valued URL param (e.g. page, pageSize).
 */
export function useUrlNumberParam(
  key: string,
  defaultValue: number
): [number, (v: number) => void] {
  const [raw, setRaw] = useUrlParam(key, String(defaultValue));
  const num = Number.parseInt(raw, 10);
  const value = Number.isFinite(num) ? num : defaultValue;
  const setValue = useCallback(
    (v: number) => setRaw(v === defaultValue ? String(defaultValue) : String(v)),
    [defaultValue, setRaw]
  );
  return [value, setValue];
}

/**
 * useUrlBoolParam - boolean toggle stored as "1" / absent.
 */
export function useUrlBoolParam(
  key: string
): [boolean, (v: boolean) => void] {
  const [raw, setRaw] = useUrlParam<string>(key, "");
  return [raw === "1" || raw === "true", (v: boolean) => setRaw(v ? "1" : "")];
}
