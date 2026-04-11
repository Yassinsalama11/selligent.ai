import { json } from '@remix-run/node';
import { useLoaderData, useSubmit, Form } from '@remix-run/react';
import { Page, Card, FormLayout, TextField, Button, Banner, Text, BlockStack } from '@shopify/polaris';
import { authenticate } from '../shopify.server.js';
import { AirosSync } from '../airos-sync.server.js';

export const loader = async ({ request }) => {
  const { session, admin } = await authenticate.admin(request);

  const metafields = await admin.graphql(`
    query {
      currentAppInstallation {
        metafields(first: 5, namespace: "airos") {
          nodes { key value }
        }
      }
    }
  `);

  const { data } = await metafields.json();
  const fields = {};
  for (const mf of data.currentAppInstallation.metafields.nodes) {
    fields[mf.key] = mf.value;
  }

  return json({
    api_key:   fields.api_key   || '',
    tenant_id: fields.tenant_id || '',
    last_sync: fields.last_sync || 'Never',
  });
};

export const action = async ({ request }) => {
  const { session, admin } = await authenticate.admin(request);
  const form = await request.formData();
  const intent = form.get('intent');

  if (intent === 'save') {
    const api_key   = form.get('api_key');
    const tenant_id = form.get('tenant_id');

    // Store in app metafields
    await admin.graphql(`
      mutation ($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) { userErrors { field message } }
      }
    `, {
      variables: {
        metafields: [
          { namespace: 'airos', key: 'api_key',   type: 'single_line_text_field', value: api_key,   ownerId: session.id },
          { namespace: 'airos', key: 'tenant_id', type: 'single_line_text_field', value: tenant_id, ownerId: session.id },
        ],
      },
    });

    session.airos_api_key   = api_key;
    session.airos_tenant_id = tenant_id;
  }

  if (intent === 'sync') {
    const sync = new AirosSync(session);
    await sync.syncProducts(admin);
    await sync.syncShipping(admin);
    await sync.syncDiscounts(admin);

    await admin.graphql(`
      mutation ($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) { userErrors { field message } }
      }
    `, {
      variables: {
        metafields: [{ namespace: 'airos', key: 'last_sync', type: 'single_line_text_field',
          value: new Date().toISOString(), ownerId: session.id }],
      },
    });
  }

  return json({ ok: true });
};

export default function SettingsPage() {
  const { api_key, tenant_id, last_sync } = useLoaderData();
  const submit = useSubmit();

  return (
    <Page title="AIROS Chat & Sync Settings">
      <BlockStack gap="500">
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
