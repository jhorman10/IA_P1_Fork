import { test, expect } from '@playwright/test';

// Este test requiere que el backend y frontend estén corriendo y accesibles
// FRONTEND_URL y API_BASE_URL deben estar configurados correctamente en .env

test.describe('Realtime Frontend-Backend Communication', () => {
  test('Dashboard actualiza en tiempo real al crear un turno', async ({ page }) => {
    // 1. Abrir dashboard
    await page.goto(process.env.FRONTEND_URL || 'http://localhost:3001');
    await expect(page.locator('text=Panel de Turnos en Tiempo Real')).toBeVisible();

    // 2. Contar turnos en espera antes
    const initialCount = await page.locator('h2:has-text("En espera") + ul > li').count();

    // 3. Abrir formulario de registro en otra pestaña y crear turno
    const context = await page.context().browser().newContext();
    const regPage = await context.newPage();
    await regPage.goto(process.env.FRONTEND_URL || 'http://localhost:3001');
    await regPage.fill('input[placeholder="Nombre Completo"]', 'Test Realtime');
    await regPage.fill('input[placeholder*="Identificación"]', '12345678');
    await regPage.selectOption('select', 'medium');
    await regPage.click('button:has-text("Registrar Ahora")');
    await regPage.waitForSelector('text=Turno registrado exitosamente.', { timeout: 5000 });
    await regPage.close();

    // 4. Esperar actualización en dashboard original
    await page.waitForTimeout(1500); // Espera procesamiento backend
    const newCount = await page.locator('h2:has-text("En espera") + ul > li').count();
    expect(newCount).toBe(initialCount + 1);
  });
});
