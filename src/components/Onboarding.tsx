'use client';

import { useState, useEffect, useCallback } from 'react';
import { useCopy } from '@/contexts/CopyContext';
import { useBranding } from '@/contexts/BrandingContext';
import { optimizedLogoUrl } from '@/lib/image';

const STORAGE_KEY = 'onboarding_seen';

interface Step {
  icon: React.ReactNode;
  title: string;
  description: string;
}

export default function Onboarding() {
  const copy = useCopy();
  const branding = useBranding();
  const [visible, setVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [exiting, setExiting] = useState(false);
  const [direction, setDirection] = useState<'next' | 'prev'>('next');

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) !== 'true') {
        setVisible(true);
      }
    } catch {
      // localStorage unavailable
    }
  }, []);

  const dismiss = useCallback(() => {
    setExiting(true);
    try {
      localStorage.setItem(STORAGE_KEY, 'true');
    } catch {
      // ignore
    }
    setTimeout(() => setVisible(false), 400);
  }, []);

  const goNext = () => {
    if (currentStep < steps.length - 1) {
      setDirection('next');
      setCurrentStep((s) => s + 1);
    } else {
      dismiss();
    }
  };

  const goPrev = () => {
    if (currentStep > 0) {
      setDirection('prev');
      setCurrentStep((s) => s - 1);
    }
  };

  if (!visible) return null;

  const steps: Step[] = [
    {
      icon: (
        <div className="w-16 h-16 rounded-2xl bg-social-50 dark:bg-[#1C1939] flex items-center justify-center">
          <svg className="w-8 h-8 text-social-fg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </div>
      ),
      title: copy.home.step1_title,
      description: copy.home.step1_desc,
    },
    {
      icon: (
        <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-[#0D223A] flex items-center justify-center">
          <svg className="w-8 h-8 text-accent-fg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
        </div>
      ),
      title: copy.home.step2_title,
      description: copy.home.step2_desc,
    },
    {
      icon: (
        <div className="w-16 h-16 rounded-2xl bg-green-50 dark:bg-[#112D25] flex items-center justify-center">
          <svg className="w-8 h-8 text-success-fg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      ),
      title: copy.home.step3_title,
      description: copy.home.step3_desc,
    },
  ];

  const step = steps[currentStep];
  const isLast = currentStep === steps.length - 1;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-6 transition-all duration-400 ${
        exiting ? 'onboarding-exit' : 'onboarding-enter'
      }`}
      style={{ backgroundColor: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(20px)' }}
    >
      <div className="max-w-sm w-full text-center">
        {/* App logo */}
        {branding.logo_url && (
          <div className="flex justify-center mb-6">
            <img
              src={optimizedLogoUrl(branding.logo_url, branding.logo_height || 40)}
              style={{ height: `${branding.logo_height || 40}px` }}
              className="w-auto object-contain"
              alt={branding.site_name || 'Logo'}
            />
          </div>
        )}

        {/* Skip button */}
        <div className="flex justify-end mb-8">
          <button
            onClick={dismiss}
            className="text-xs text-faint hover:text-secondary transition-colors px-3 py-1.5 rounded-full hover:bg-fill cursor-pointer"
          >
            Skip
          </button>
        </div>

        {/* Step content with slide animation */}
        <div
          key={currentStep}
          className={`${direction === 'next' ? 'onboarding-slide-in-right' : 'onboarding-slide-in-left'}`}
        >
          <div className="flex justify-center mb-6">
            {step.icon}
          </div>

          {/* Step number */}
          <p className="text-xs font-semibold text-social-fg uppercase tracking-widest mb-2">
            Step {currentStep + 1} of {steps.length}
          </p>

          <h2 className="text-2xl font-bold text-heading mb-3">
            {step.title}
          </h2>

          <p className="text-base text-muted leading-relaxed max-w-xs mx-auto">
            {step.description}
          </p>
        </div>

        {/* Progress dots */}
        <div className="flex justify-center gap-2 mt-10 mb-8">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === currentStep
                  ? 'w-6 bg-social-500'
                  : i < currentStep
                    ? 'w-1.5 bg-social-500'
                    : 'w-1.5 bg-fill2'
              }`}
            />
          ))}
        </div>

        {/* Navigation */}
        <div className="flex gap-3">
          {currentStep > 0 && (
            <button
              onClick={goPrev}
              className="flex-1 py-3.5 px-6 text-sm font-semibold text-secondary bg-fill rounded-2xl hover:bg-fill2 transition-all duration-200 active:scale-[0.97] cursor-pointer"
            >
              Back
            </button>
          )}
          <button
            onClick={goNext}
            className="flex-1 py-3.5 px-6 text-sm font-semibold text-white bg-social-500 rounded-2xl hover:bg-social-600 shadow-lg shadow-violet-200/50 transition-all duration-200 active:scale-[0.97] cursor-pointer"
          >
            {isLast ? "Let's go" : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}
