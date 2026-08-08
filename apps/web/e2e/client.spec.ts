import { test, expect } from '@playwright/test';

test.describe('Client Management Flow', () => {
  test('allows creating, viewing, editing, and archiving a client', async ({ page }) => {
    // Navigate to clients page
    await page.goto('/workspaces/550e8400-e29b-41d4-a716-446655440000/clients');

    // Verify page header
    await expect(page.getByRole('heading', { name: 'Clients' })).toBeVisible();

    // Click Add Client
    await page.getByRole('button', { name: 'Add Client' }).click();

    // Fill form
    await page.getByLabel(/Client \/ Contact Name/i).fill('Test Client Corp');
    await page.getByLabel(/Email Address/i).fill('test@clientcorp.com');
    await page.getByLabel(/Company Name/i).fill('Test Client Pvt Ltd');
    await page.getByLabel(/GST Number/i).fill('29AABCM1234D1ZX');

    // Submit
    await page.getByRole('button', { name: 'Create Client' }).click();

    // Verify client appears in list
    await expect(page.getByText('Test Client Corp')).toBeVisible();
    await expect(page.getByText('test@clientcorp.com')).toBeVisible();

    // Open detail
    await page.getByText('Test Client Corp').click();
    await expect(page.getByRole('heading', { name: 'Test Client Corp' })).toBeVisible();
    await expect(page.getByText('29AABCM1234D1ZX')).toBeVisible();

    // Go back
    await page.getByRole('button', { name: 'Back to Clients' }).click();

    // Edit client
    await page.getByRole('button', { name: 'Edit' }).click();
    await page.getByLabel(/Client \/ Contact Name/i).fill('Test Client Updated');
    await page.getByRole('button', { name: 'Update Client' }).click();

    // Verify updated
    await expect(page.getByText('Test Client Updated')).toBeVisible();

    // Archive client
    page.on('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: 'Archive' }).click();

    // Verify removed from active list
    await expect(page.getByText('Test Client Updated')).not.toBeVisible();
  });
});
