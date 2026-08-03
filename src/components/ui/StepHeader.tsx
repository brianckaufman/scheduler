type Accent = 'social' | 'teal' | 'neutral';

interface StepHeaderProps {
  stepNumber: number;
  totalSteps: number;
  title: string;
  subtitle?: string;
  accent?: Accent;
}

const EYEBROW: Record<Accent, string> = {
  social: 'text-social-600',
  teal: 'text-teal-600',
  neutral: 'text-faint',
};

/**
 * One question per screen, loudly. Eyebrow tells the user where they are;
 * the title is the single thing being asked; the subtitle reassures.
 */
export default function StepHeader({ stepNumber, totalSteps, title, subtitle, accent = 'neutral' }: StepHeaderProps) {
  return (
    <div className="mb-6">
      <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${EYEBROW[accent]}`}>
        Step {stepNumber} of {totalSteps}
      </p>
      <h1 className="text-2xl font-bold text-heading leading-tight">{title}</h1>
      {subtitle && <p className="text-sm text-muted mt-2 leading-relaxed">{subtitle}</p>}
    </div>
  );
}
