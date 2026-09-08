import { test, expect } from "@playwright/test";

/**
 * Playwright E2E Tests for ThermoTwin Landing Page (Prompt 8).
 *
 * Tests:
 * 1. Landing page loads, hero animation renders without errors
 * 2. CTA buttons navigate to /dashboard
 * 3. Reduced-motion: animation is disabled/static
 * 4. Responsive: no horizontal overflow at 375px width
 * 5. /dashboard route still fully functional after the move
 */

test.describe("Landing Page", () => {
  test("hero section loads and dynamometer animation renders", async ({ page }) => {
    await page.goto("http://localhost:3000/");
    
    // Landing nav is visible
    await expect(page.getByTestId("landing-nav")).toBeVisible();
    
    // Hero section present
    await expect(page.getByTestId("hero-section")).toBeVisible();
    
    // Hero dynamometer canvas renders (no JS errors)
    await expect(page.getByTestId("hero-dynamometer")).toBeVisible();
    
    // Key content sections are present
    await expect(page.getByTestId("problem-section")).toBeVisible();
    await expect(page.getByTestId("howitworks-section")).toBeVisible();
    await expect(page.getByTestId("metrics-section")).toBeVisible();
    await expect(page.getByTestId("trust-section")).toBeVisible();
    await expect(page.getByTestId("final-cta-section")).toBeVisible();
    await expect(page.getByTestId("landing-footer")).toBeVisible();

    // No console errors during load
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    await page.waitForTimeout(2000); // Let animation run
    expect(errors.length).toBe(0);
  });

  test("hero CTA navigates to /dashboard", async ({ page }) => {
    await page.goto("http://localhost:3000/");
    
    const heroCta = page.getByTestId("hero-cta");
    await expect(heroCta).toBeVisible();
    await heroCta.click();
    
    await expect(page).toHaveURL(/.*\/dashboard/);
    // Verify dashboard content loads
    await expect(page.getByTestId("wells-table")).toBeVisible({ timeout: 10000 });
  });

  test("nav CTA navigates to /dashboard", async ({ page }) => {
    await page.goto("http://localhost:3000/");
    
    const navCta = page.getByTestId("nav-cta");
    await expect(navCta).toBeVisible();
    await navCta.click();
    
    await expect(page).toHaveURL(/.*\/dashboard/);
  });

  test("final CTA navigates to /dashboard", async ({ page }) => {
    await page.goto("http://localhost:3000/");
    
    const finalCta = page.getByTestId("final-cta");
    // Scroll to bottom to find it
    await finalCta.scrollIntoViewIfNeeded();
    await expect(finalCta).toBeVisible();
    await finalCta.click();
    
    await expect(page).toHaveURL(/.*\/dashboard/);
  });

  test("reduced-motion: hero animation shows static card", async ({ page }) => {
    // Emulate prefers-reduced-motion
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("http://localhost:3000/");
    
    // Hero dynamometer should still be visible (static render)
    await expect(page.getByTestId("hero-dynamometer")).toBeVisible();
    
    // Sections should be immediately visible (no transition)
    const problemSection = page.getByTestId("problem-section");
    await expect(problemSection).toBeVisible();
    
    // Verify the section has the visible class applied (no transition needed)
    // The CSS module adds sectionVisible immediately when reduced motion is detected
    await page.waitForTimeout(100);
    const opacity = await problemSection.evaluate((el) => {
      return window.getComputedStyle(el).opacity;
    });
    expect(opacity).toBe("1");
  });

  test("responsive: no horizontal overflow at 375px width", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("http://localhost:3000/");
    
    // Check that the page has no horizontal scrollbar
    const hasOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasOverflow).toBe(false);
  });
});

test.describe("Dashboard Route Migration", () => {
  test("/dashboard loads field overview after route move", async ({ page }) => {
    await page.goto("http://localhost:3000/dashboard");
    
    // Verify the dashboard content is present
    await expect(page.getByTestId("wells-table")).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId("total-wells-count")).toBeVisible();
    await expect(page.getByTestId("field-production-rate")).toBeVisible();
  });
});
