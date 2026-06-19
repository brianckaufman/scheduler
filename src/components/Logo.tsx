'use client';

import { useBranding } from '@/contexts/BrandingContext';
import { optimizedLogoUrl } from '@/lib/image';

interface LogoProps {
  height: number;
  className?: string;
}

/**
 * Renders the brand logo, swapping to a dark-mode variant when one is set and
 * the `.dark` theme is active. Falls back to the light logo in both modes when
 * no dark logo is uploaded. Renders nothing if no logo is configured.
 *
 * Both <img>s are emitted and toggled with `dark:` utilities so the correct one
 * shows instantly with the theme (no flash, no JS), matching the class-based
 * dark mode set pre-paint in layout.tsx.
 */
export default function Logo({ height, className }: LogoProps) {
  const branding = useBranding();
  if (!branding.logo_url) return null;

  const lightSrc = optimizedLogoUrl(branding.logo_url, height);
  const darkSrc = branding.logo_url_dark ? optimizedLogoUrl(branding.logo_url_dark, height) : null;
  const style = { height: `${height}px` };
  const base = `w-auto object-contain ${className ?? ''}`;

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={lightSrc}
        alt={branding.site_name}
        style={style}
        className={`${base} ${darkSrc ? 'block dark:hidden' : ''}`}
      />
      {darkSrc && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={darkSrc}
          alt={branding.site_name}
          style={style}
          className={`${base} hidden dark:block`}
        />
      )}
    </>
  );
}
