import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('https://www.bbva.es/personas.html');
  await page.getByRole('button', { name: 'Aceptar' }).click();
  await page.getByRole('button', { name: 'Acceso' }).click();
});