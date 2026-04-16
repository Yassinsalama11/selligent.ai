export async function processEvalRun(jobData: unknown) {
  return {
    status: 'scheduled',
    suite: (jobData as { suite?: string })?.suite || 'golden',
  };
}
