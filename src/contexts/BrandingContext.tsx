'use client';

import { createContext, useContext } from 'react';

interface BrandingValues {
  logo_url: string;
  accent_color: string;
  footer_text: string;
  site_name: string;
}

const defaults: BrandingValues = {
  logo_url: '',
  accent_color: '#0d9488',
  footer_text: 'Free forever. No sign-up. No spam.',
  site_name: 'Scheduler',
};

const BrandingContext = createContext<BrandingValues>(defaults);

export function BrandingProvider({
  branding,
  children,
}: {
  branding: BrandingValues;
  children: React.ReactNode;
}) {
  return (
    <BrandingContext.Provider value={branding}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding(): BrandingValues {
  return useContext(BrandingContext);
}
