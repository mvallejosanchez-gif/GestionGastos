import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('https://www.bankinter.com/www/es-es/nodisponible.html');
  await page.getByRole('link', { name: 'Ir a la página de inicio' }).click();
  await page.getByRole('button', { name: 'Acceso clientes' }).click();
  await page.getByRole('textbox', { name: 'Usuario' }).click();
  await page.getByRole('textbox', { name: 'Usuario' }).fill('p25683813n');
  await page.getByRole('textbox', { name: 'Usuario' }).press('Tab');
  await page.getByRole('textbox', { name: 'Contraseña' }).fill('L0vara');
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await page.getByRole('button', { name: 'Cerrar modal' }).click();
  await page.getByRole('cell', { name: 'Cuenta Nómina ES87 0128 6001' }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Botón Descarga Excel' }).click();
  const download = await downloadPromise;
});