import { expect, test } from "@playwright/test";

async function expectUrlMatch(page, pattern, timeout = 30000) {
  await expect.poll(() => page.url(), { timeout }).toMatch(pattern);
}

async function gotoPage(page, url) {
  await page.goto(url, { waitUntil: "domcontentloaded" });
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function registerSellerSession(request, sellerName, sellerEmail) {
  const response = await request.post("http://localhost:4100/api/auth/register", {
    data: {
      fullName: sellerName,
      email: sellerEmail,
      password: "Password123"
    }
  });

  expect(response.ok()).toBeTruthy();

  const authCookieHeader = response
    .headersArray()
    .find((header) => header.name.toLowerCase() === "set-cookie")?.value;

  expect(authCookieHeader).toBeTruthy();

  const authCookieMatch = authCookieHeader.match(/^([^=]+)=([^;]+)/);

  expect(authCookieMatch).toBeTruthy();

  return {
    name: authCookieMatch[1],
    value: authCookieMatch[2]
  };
}

test("seller can create a link and complete a public payment", async ({
  page,
  request
}, testInfo) => {
  await page.context().clearCookies();

  const nonce = `${testInfo.project.name}-${Date.now()}`.replace(/[^a-zA-Z0-9-]/g, "");
  const sellerName = `Robot Seller ${nonce}`;
  const sellerEmail = `robot-${nonce.toLowerCase()}@example.com`;
  const productName = `Produit ${nonce}`;
  const sellerHeadingPattern = new RegExp(`Bonjour ${escapeRegExp(sellerName)}`);
  const authCookie = await registerSellerSession(request, sellerName, sellerEmail);

  await page.context().addCookies([
    {
      name: authCookie.name,
      value: authCookie.value,
      url: "http://localhost"
    }
  ]);

  await gotoPage(page, "/dashboard");

  await expect(page.getByRole("heading", { name: sellerHeadingPattern })).toBeVisible();
  await expect(page.getByRole("button", { name: "Creer le lien" })).toBeEnabled();

  await page.getByLabel("Nom du produit").fill(productName);
  await page.getByLabel("Prix").fill("49.90");
  await page
    .getByLabel("Description")
    .fill("Lien de paiement cree depuis le smoke test navigateur.");
  await page.getByRole("button", { name: "Creer le lien" }).click();

  await expect(page.getByText("Lien de paiement cree avec succes.")).toBeVisible();
  await expect(page.getByRole("heading", { name: productName }).first()).toBeVisible();

  await page.getByRole("button", { name: /Gerer ce lien|Lien selectionne/ }).first().click();
  await expect(page.getByRole("heading", { name: "Gerer ce lien" })).toBeVisible();

  const publicLink = page
    .getByRole("link", { name: new RegExp(`/pay/`) })
    .first();
  const publicHref = await publicLink.getAttribute("href");

  expect(publicHref).toBeTruthy();

  await gotoPage(page, publicHref);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(productName);
  await expect(page.getByRole("button", { name: "Payer maintenant" })).toBeEnabled();

  await page.getByLabel("Nom complet").fill("Client Test");
  await page.getByLabel("Email").fill("client-test@example.com");
  await page.getByLabel("Telephone").fill("+2250700000000");
  await page.getByRole("button", { name: "Payer maintenant" }).click();
  await expectUrlMatch(page, /\/checkout\/mock\//, 30000);
  await expect(page.getByRole("button", { name: "Confirmer le paiement simule" })).toBeEnabled();
  await page.getByRole("button", { name: "Confirmer le paiement simule" }).click();
  await expectUrlMatch(page, /payment_status=paid/, 30000);

  await expect(page.getByText("Paiement confirme")).toBeVisible();
  await expect(page.getByText("Reference:")).toBeVisible();
  await expect(page.getByRole("button", { name: "Telecharger le recu PDF" })).toBeVisible();

  const paidUrl = new URL(page.url());
  const paymentReference = paidUrl.searchParams.get("payment_reference");
  const paymentReceiptToken = paidUrl.searchParams.get("payment_receipt_token");

  expect(paymentReference).toBeTruthy();
  expect(paymentReceiptToken).toBeTruthy();

  const receiptResponse = await request.get(
    `http://localhost:4100/api/payments/${paymentReference}/receipt?token=${paymentReceiptToken}`
  );
  expect(receiptResponse.ok()).toBeTruthy();
  expect(receiptResponse.headers()["content-type"]).toContain("application/pdf");

  await gotoPage(page, "/dashboard");
  await expect(page.getByRole("heading", { name: sellerHeadingPattern })).toBeVisible();
  await expect(page.getByText("Client Test").first()).toBeVisible();
  await expect(page.getByText("cl***@ex***.com").first()).toBeVisible();
  await expect(page.getByText("49,90").first()).toBeVisible();
});
