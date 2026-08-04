'use client';

import StepHeader from '@/components/ui/StepHeader';
import ChoiceCard from '@/components/ui/ChoiceCard';
import QuestionListEditor, { newQuestionDraft } from '@/components/questions/QuestionListEditor';
import type { QuestionType } from '@/lib/questions';
import type { EventDraft } from '@/hooks/useEventDraft';

interface QuestionsStepProps {
  draft: EventDraft;
  stepNumber: number;
  totalSteps: number;
  accent: 'social' | 'teal';
}

/** Step: optional custom questions. Skippable, with one-tap starters. */
export default function QuestionsStep({ draft, stepNumber, totalSteps, accent }: QuestionsStepProps) {
  const addExample = (type: QuestionType, label: string, options: string[]) => {
    draft.setQuestions([...draft.questions, newQuestionDraft({ type, label, options })]);
  };

  return (
    <div>
      <StepHeader
        stepNumber={stepNumber}
        totalSteps={totalSteps}
        accent={accent}
        title="Ask your guests anything?"
        subtitle="Totally optional — you can also add questions later."
      />

      {draft.questions.length === 0 && (
        <div className="space-y-3 mb-5">
          <p className="text-sm font-semibold text-body">Popular questions</p>
          <ChoiceCard
            compact
            accent={accent}
            title="Any food allergies?"
            description="They type a short answer"
            onClick={() => addExample('short_text', 'Any food allergies?', [])}
          />
          <ChoiceCard
            compact
            accent={accent}
            title="What can you bring?"
            description="They pick one: Starter, Main, Dessert, Drinks"
            onClick={() =>
              addExample('single_select', 'What can you bring?', ['Starter', 'Main', 'Dessert', 'Drinks'])
            }
          />
        </div>
      )}

      <QuestionListEditor drafts={draft.questions} onChange={draft.setQuestions} accent={accent} />
    </div>
  );
}
