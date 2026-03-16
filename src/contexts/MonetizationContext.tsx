'use client';

import { createContext, useContext } from 'react';

export interface MonetizationValues {
  buymeacoffee_url: string;
  donation_cta: string;
  donation_message: string;
  show_on_home: boolean;
  show_on_event: boolean;
  show_on_success: boolean;
}

const defaults: MonetizationValues = {
  buymeacoffee_url: '',
  donation_cta: 'Buy me a coffee ☕',
  donation_message: 'Love this app? Help keep it free!',
  show_on_home: true,
  show_on_event: true,
  show_on_success: true,
};

const MonetizationContext = createContext<MonetizationValues>(defaults);

export function MonetizationProvider({
  monetization,
  children,
}: {
  monetization: MonetizationValues;
  children: React.ReactNode;
}) {
  return (
    <MonetizationContext.Provider value={monetization}>
      {children}
    </MonetizationContext.Provider>
  );
}

export function useMonetization(): MonetizationValues {
  return useContext(MonetizationContext);
}
