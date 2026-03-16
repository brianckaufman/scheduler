'use client';

import { createContext, useContext } from 'react';
import type { CopySettings } from '@/types/settings';
import { DEFAULT_COPY } from '@/types/settings';

const CopyContext = createContext<CopySettings>(DEFAULT_COPY);

interface CopyProviderProps {
  copy: CopySettings;
  children: React.ReactNode;
}

export function CopyProvider({ copy, children }: CopyProviderProps) {
  return <CopyContext.Provider value={copy}>{children}</CopyContext.Provider>;
}

export function useCopy(): CopySettings {
  return useContext(CopyContext);
}

/**
 * Replace {{placeholder}} tokens in a copy string with actual values.
 * Example: interpolate("Hi {{name}}", { name: "Brian" }) => "Hi Brian"
 */
export function interpolate(
  template: string,
  vars: Record<string, string | number>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) =>
    vars[key] !== undefined ? String(vars[key]) : `{{${key}}}`
  );
}
