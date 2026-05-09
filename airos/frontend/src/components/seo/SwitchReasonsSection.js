import React from 'react';
import { ProblemSection } from '@/components/seo/ProblemSection';

export function SwitchReasonsSection({
  competitor,
  switchingBenefits = [],
  competitorPainPoints = [],
}) {
  return (
    <ProblemSection
      title={`Why switch from ${competitor} to ChatorAI`}
      description={`Teams usually switch when they need faster automation rollout, stronger channel execution, and fewer legacy constraints than ${competitor} can comfortably support.`}
      points={competitorPainPoints}
      secondaryTitle="What teams gain with ChatorAI"
      secondaryPoints={switchingBenefits}
    />
  );
}
