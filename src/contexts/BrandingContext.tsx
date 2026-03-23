'use client';

import { createContext, useContext } from 'react';

interface BrandingValues {
  logo_url: string;
  logo_height: number;
  hide_home_title: boolean;
  hide_home_subtitle: boolean;
  accent_color: string;
  footer_text: string;
  site_name: string;
}

const defaults: BrandingValues = {
  logo_url: '',
  logo_height: 40,
  hide_home_title: false,
  hide_home_subtitle: false,
  accent_color: '#7c3aed',
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
