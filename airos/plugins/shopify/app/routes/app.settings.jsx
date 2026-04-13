import { json } from '@remix-run/node';
import { useActionData, useLoaderData, Form } from '@remix-run/react';
import { Page, Card, FormLayout, TextField, Button, Banner, Text, BlockStack } from '@shopify/polaris';
import { authenticate } from '../shopify.server.js';
import { AirosSync } from '../airos-sync.server.js';

async function loadAirosSettings(admin) {
  const metafields = await admin.graphql(`
    query {
      currentAppInstallation {
        id
        metafields(first: 5, namespace: "airos") {
          nodes { key value }
        }
      }
    }
  `);

  const { data } = await metafields.json();
  const installation = data.currentAppInstallation;
  const fields = {};

  for (const mf of installation?.metafields?.nodes || []) {
    fields[mf.key] = mf.value;
  }

  return {
    installationId: installation?.id || null,
    api_key: fields.api_key || '',
    tenant_id: fields.tenant_id || '',
    last_sync: fields.last_sync || 'Never',
  };
}

async function saveAirosSettings(admin, installationId, entries) {
  await admin.graphql(`
    mutation ($metafields: [MetafieldsSetInput!]!) {
      metafieldsSet(metafields: $metafields) { userErrors { field message } }
    }
  `, {
    variables: {
      metafields: entries.map(({ key, value }) => ({
        namespace: 'airos',
        key,
        type: 'single_line_text_field',
        value,
        ownerId: installationId,
      })),
    },
  });
}

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const settings = await loadAirosSettings(admin);
  return json(settings);
};

export const action = async ({ request }) => {
  const { session, admin } = await authenticate.admin(request);
  const form = await request.formData();
  const intent = form.get('intent');
  const settings = await loadAirosSettings(admin);

  if (!settings.installationId) {
    return json({ ok: false, error: 'Could not load the Shopify app installation.' }, { status: 500 });
  }

  if (intent === 'save') {
    const api_key = String(form.get('api_key') || '').trim();
    const tenant_id = String(form.get('tenant_id') || '').trim();

    await saveAirosSettings(admin, settings.installationId, [
      { key: 'api_key', value: api_key },
      { key: 'tenant_id', value: tenant_id },
    ]);

    return json({ ok: true, message: 'Settings saved.' });
  }

  if (intent === 'sync') {
    if (!settings.api_key || !settings.tenant_id) {
      return json({ ok: false, error: 'Save your AIROS API key and Tenant ID before syncing.' }, { status: 400 });
    }

    const sync = new AirosSync(session, {
      apiKey: settings.api_key,
      tenantId: settings.tenant_id,
    });
    await sync.syncProducts(admin);
    await sync.syncShipping(admin);
    await sync.syncDiscounts(admin);

    await saveAirosSettings(admin, settings.installationId, [
      { key: 'last_sync', value: new Date().toISOString() },
    ]);

    return json({ ok: true, message: 'Catalog sync completed.' });
  }

  return json({ ok: false, error: 'Unsupported action.' }, { status: 400 });
};

export default function SettingsPage() {
  const { api_key, tenant_id, last_sync } = useLoaderData();
  const actionData = useActionData();

  return (
    <Page title="AIROS Chat & Sync Settings">
      <BlockStack gap="500">
        {actionData?.message ? (
          <Banner tone="success">{actionData.message}</Banner>
        ) : null}
        {actionData?.error ? (
          <Banner tone="critical">{actionData.error}</Banner>
        ) : null}
        <Card>
          <Form method="post">
            <FormLayout>
              <TextField label="AIROS API Key" name="api_key" type="password"
                defaultValue={api_key} autoComplete="off" />
              <TextField label="Tenant ID" name="tenant_id" type="text"
                defaultValue={tenant_id} autoComplete="off" />
              <Button submit name="intent" value="save" variant="primary">Save Settings</Button>
            </FormLayout>
          </Form>
        </Card>

        <Card>
          <BlockStack gap="300">
            <Text variant="headingSm">Product Catalog Sync</Text>
            <Text>Last sync: {last_sync}</Text>
            <Form method="post">
              <Button submit name="intent" value="sync">Sync Now</Button>
            </Form>
          </BlockStack>
        </Card>
      </BlockStack>
    </Page>
  );
}
