import './telemetry/register';

import { buildApp } from './app';

const port = Number(process.env.PORT || 4000);

buildApp()
  .then((app) => app.listen({ port, host: '0.0.0.0' }))
  .catch((error) => {
    console.error('[apps/api] failed to start', error);
    process.exit(1);
  });
