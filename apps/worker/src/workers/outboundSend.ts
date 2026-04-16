export async function processOutboundSend(jobData: unknown) {
  return {
    status: 'queued',
    provider: 'pending',
    job: jobData,
  };
}
