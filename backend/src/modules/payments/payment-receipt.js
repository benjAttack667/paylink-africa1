import PDFDocument from "pdfkit";

const colors = {
  page: "#f4f1ea",
  hero: "#0f1f1b",
  card: "#fcfbf8",
  border: "#e8e1d6",
  accent: "#d68a16",
  accentSoft: "#f6ead6",
  text: "#111827",
  muted: "#6b7280",
  success: "#166534",
  successSoft: "#dcfce7",
  white: "#ffffff"
};

function formatAmount(amount, currency) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency
  }).format(Number(amount));
}

function formatNumericAmount(amount) {
  return new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(Number(amount));
}

function formatDate(value) {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(value);
}

function resolveFontSizeForWidth(doc, text, width, maxFontSize, minFontSize) {
  const normalizedText = String(text ?? "");

  for (let fontSize = maxFontSize; fontSize >= minFontSize; fontSize -= 1) {
    doc.fontSize(fontSize);

    if (doc.widthOfString(normalizedText) <= width) {
      return fontSize;
    }
  }

  return minFontSize;
}

function truncateTextToFit(doc, text, width, maxLines, options = {}) {
  const { lineGap = 0, suffix = "..." } = options;
  const normalizedText = String(text ?? "").replace(/\s+/g, " ").trim();

  if (!normalizedText) {
    return "";
  }

  const maxHeight = doc.heightOfString("Ag", {
    width: 1000,
    lineGap
  }) * maxLines;

  if (
    doc.heightOfString(normalizedText, {
      width,
      lineGap
    }) <= maxHeight
  ) {
    return normalizedText;
  }

  let low = 0;
  let high = normalizedText.length;
  let bestFit = `${normalizedText.slice(0, 1)}${suffix}`;

  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    const candidate = `${normalizedText.slice(0, middle).trimEnd()}${suffix}`;
    const candidateHeight = doc.heightOfString(candidate, {
      width,
      lineGap
    });

    if (candidateHeight <= maxHeight) {
      bestFit = candidate;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }

  return bestFit;
}

function drawRoundedCard(doc, x, y, width, height, options = {}) {
  const {
    radius = 20,
    fillColor = colors.card,
    strokeColor = colors.border,
    lineWidth = 1
  } = options;

  doc.save();
  doc.lineWidth(lineWidth);
  doc.roundedRect(x, y, width, height, radius).fillAndStroke(fillColor, strokeColor);
  doc.restore();
}

function writeEyebrow(doc, text, x, y, options = {}) {
  const { color = colors.muted, width = 180 } = options;

  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .fillColor(color)
    .text(text.toUpperCase(), x, y, {
      width,
      characterSpacing: 1.5
    });
}

function writeField(doc, x, y, label, value, options = {}) {
  const { width = 180, valueFontSize = 12, valueColor = colors.text } = options;
  const normalizedValue = String(value);

  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .fillColor(colors.muted)
    .text(label.toUpperCase(), x, y, {
      width,
      characterSpacing: 1.2
    });

  const valueY = y + 16;
  doc
    .font("Helvetica-Bold")
    .fontSize(valueFontSize)
    .fillColor(valueColor)
    .text(normalizedValue, x, valueY, {
      width,
      lineGap: 2
    });

  return valueY + doc.heightOfString(normalizedValue, { width, lineGap: 2 });
}

function drawStatusBadge(doc, x, y, label) {
  drawRoundedCard(doc, x, y, 92, 30, {
    radius: 15,
    fillColor: colors.successSoft,
    strokeColor: "#bbf7d0"
  });

  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor(colors.success)
    .text(label, x, y + 10, {
      width: 92,
      align: "center"
    });
}

function drawAmountPanel(doc, x, y, amount, currency) {
  const panelWidth = 164;
  const contentWidth = 126;
  const numericAmount = formatNumericAmount(amount);

  drawRoundedCard(doc, x, y, panelWidth, 88, {
    radius: 18,
    fillColor: colors.white,
    strokeColor: "#ebe4d8"
  });

  writeEyebrow(doc, "Montant valide", x + 18, y + 16, {
    color: colors.accent,
    width: contentWidth
  });

  doc.font("Helvetica-Bold");
  const amountFontSize = resolveFontSizeForWidth(doc, numericAmount, contentWidth, 24, 16);

  doc
    .font("Helvetica-Bold")
    .fontSize(amountFontSize)
    .fillColor(colors.text)
    .text(numericAmount, x + 18, y + 38, {
      width: contentWidth,
      lineGap: 1
    });

  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor(colors.muted)
    .text(currency, x + 18, y + 66, {
      width: contentWidth,
      characterSpacing: 1.4
    });
}

function drawHeroSection(doc, payment, layout) {
  drawRoundedCard(doc, layout.left, 44, layout.width, 168, {
    radius: 24,
    fillColor: colors.hero,
    strokeColor: colors.hero
  });

  doc.save();
  doc.roundedRect(layout.left, 44, layout.width, 168, 24).clip();
  doc.rect(layout.left, 44, layout.width, 9).fill(colors.accent);
  doc.circle(layout.left + layout.width - 42, 76, 68).fillOpacity(0.08).fill(colors.white);
  doc.circle(layout.left + layout.width - 12, 104, 42).fillOpacity(0.06).fill(colors.accent);
  doc.restore();

  drawStatusBadge(doc, layout.left + layout.width - 116, 66, "PAID");
  drawAmountPanel(doc, layout.left + layout.width - 182, 112, payment.amount, payment.currency);

  writeEyebrow(doc, "PayLink Africa", layout.left + 24, 68, {
    color: "#f1d7a8",
    width: 180
  });

  doc
    .font("Helvetica-Bold")
    .fontSize(28)
    .fillColor(colors.white)
    .text("Recu de paiement", layout.left + 24, 90, {
      width: 250
    });

  doc
    .font("Helvetica")
    .fontSize(11)
    .fillColor("#e7e5e4")
    .text(
      "Confirmation officielle d'un paiement valide sur la plateforme.",
      layout.left + 24,
      126,
      {
        width: 260,
        lineGap: 3
      }
    );

  doc.font("Helvetica").fontSize(10);
  const sellerHeadline = truncateTextToFit(
    doc,
    payment.seller.businessName || payment.seller.fullName,
    250,
    1
  );
  doc.fillColor("#d6d3d1").text(sellerHeadline, layout.left + 24, 168, {
    width: 250
  });

  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor("#f8fafc")
    .text(payment.reference, layout.left + 24, 186, {
      width: 220
    });
}

function drawTransactionCard(doc, payment, x, y) {
  drawRoundedCard(doc, x, y, 239, 192, {
    radius: 20
  });

  writeEyebrow(doc, "Transaction", x + 20, y + 18, { width: 140 });
  let cursorY = y + 44;
  cursorY = writeField(doc, x + 20, cursorY, "Reference", payment.reference, {
    width: 190,
    valueFontSize: 11
  }) + 12;
  cursorY = writeField(doc, x + 20, cursorY, "Date", formatDate(payment.paidAt), {
    width: 190
  }) + 12;
  cursorY = writeField(doc, x + 20, cursorY, "Devise", payment.currency, {
    width: 190
  }) + 12;
  writeField(doc, x + 20, cursorY, "Statut", "PAID", {
    width: 190,
    valueColor: colors.success
  });
}

function drawCustomerCard(doc, payment, x, y) {
  drawRoundedCard(doc, x, y, 239, 192, {
    radius: 20
  });

  writeEyebrow(doc, "Client", x + 20, y + 18, { width: 140 });
  let cursorY = y + 44;

  doc.font("Helvetica-Bold").fontSize(12);
  const customerName = truncateTextToFit(doc, payment.customerName, 190, 2, {
    lineGap: 2
  });
  cursorY = writeField(doc, x + 20, cursorY, "Nom", customerName, {
    width: 190
  }) + 12;

  doc.font("Helvetica-Bold").fontSize(11);
  const customerEmail = truncateTextToFit(doc, payment.customerEmail, 190, 2, {
    lineGap: 2
  });
  cursorY = writeField(doc, x + 20, cursorY, "Email", customerEmail, {
    width: 190,
    valueFontSize: 11
  }) + 12;

  doc.font("Helvetica-Bold").fontSize(11);
  const customerPhone = truncateTextToFit(
    doc,
    payment.customerPhone || "Non renseigne",
    190,
    1,
    {
      lineGap: 2
    }
  );
  writeField(doc, x + 20, cursorY, "Telephone", customerPhone, {
    width: 190,
    valueFontSize: 11
  });
}

function drawProductCard(doc, payment, x, y, width) {
  const amountCardWidth = 142;
  const amountCardX = x + width - amountCardWidth - 24;
  const textColumnWidth = amountCardX - x - 44;
  const numericAmount = formatNumericAmount(payment.amount);

  doc.font("Helvetica-Bold").fontSize(18);
  const productName = truncateTextToFit(doc, payment.product.name, textColumnWidth, 2, {
    lineGap: 2
  });

  doc.font("Helvetica").fontSize(11);
  const description = truncateTextToFit(
    doc,
    payment.product.description || "Aucune description produit fournie.",
    textColumnWidth,
    4,
    {
      lineGap: 4
    }
  );
  const descriptionHeight = doc.heightOfString(description, {
    width: textColumnWidth,
    lineGap: 4
  });
  const cardHeight = Math.max(178, 120 + descriptionHeight);

  drawRoundedCard(doc, x, y, width, cardHeight, {
    radius: 20
  });

  writeEyebrow(doc, "Achat confirme", x + 20, y + 18, { width: 160 });

  doc
    .font("Helvetica-Bold")
    .fontSize(18)
    .fillColor(colors.text)
    .text(productName, x + 20, y + 44, {
      width: textColumnWidth,
      lineGap: 2
    });

  doc
    .font("Helvetica")
    .fontSize(11)
    .fillColor(colors.muted)
    .text(description, x + 20, y + 78, {
      width: textColumnWidth,
      lineGap: 4
    });

  drawRoundedCard(doc, amountCardX, y + 24, amountCardWidth, 80, {
    radius: 18,
    fillColor: colors.accentSoft,
    strokeColor: "#efd7b5"
  });
  writeEyebrow(doc, "Montant", amountCardX + 18, y + 40, {
    color: "#a16207",
    width: amountCardWidth - 36
  });

  doc.font("Helvetica-Bold");
  const amountFontSize = resolveFontSizeForWidth(
    doc,
    numericAmount,
    amountCardWidth - 36,
    18,
    14
  );

  doc
    .font("Helvetica-Bold")
    .fontSize(amountFontSize)
    .fillColor(colors.text)
    .text(numericAmount, amountCardX + 18, y + 60, {
      width: amountCardWidth - 36,
      lineGap: 1
    });

  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor(colors.muted)
    .text(payment.currency, amountCardX + 18, y + 84, {
      width: amountCardWidth - 36,
      characterSpacing: 1.4
    });

  const sellerY = y + cardHeight - 48;
  doc
    .moveTo(x + 20, sellerY - 12)
    .lineTo(x + width - 20, sellerY - 12)
    .lineWidth(1)
    .strokeColor(colors.border)
    .stroke();

  doc.font("Helvetica-Bold").fontSize(11);
  const sellerName = truncateTextToFit(
    doc,
    payment.seller.businessName || payment.seller.fullName,
    width - 40,
    2,
    {
      lineGap: 2
    }
  );
  writeField(doc, x + 20, sellerY, "Vendeur", sellerName, {
    width: width - 40,
    valueFontSize: 11
  });

  return cardHeight;
}

function drawFooterNote(doc, x, y, width) {
  drawRoundedCard(doc, x, y, width, 68, {
    radius: 18,
    fillColor: colors.white,
    strokeColor: colors.border
  });

  doc
    .font("Helvetica-Bold")
    .fontSize(11)
    .fillColor(colors.text)
    .text("Paiement verifie cote serveur", x + 18, y + 16, {
      width: width - 36
    });

  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor(colors.muted)
    .text(
      "Ce document confirme qu'une transaction a ete valablement enregistree et associee a ce lien de paiement.",
      x + 18,
      y + 34,
      {
        width: width - 36,
        lineGap: 2
      }
    );
}

export async function generatePaymentReceiptPdf(payment) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const doc = new PDFDocument({
      size: "A4",
      margin: 48,
      info: {
        Title: `Receipt ${payment.reference}`,
        Author: "PayLink Africa",
        Subject: "Payment receipt"
      }
    });

    doc.on("data", (chunk) => {
      chunks.push(chunk);
    });
    doc.on("end", () => {
      resolve(Buffer.concat(chunks));
    });
    doc.on("error", reject);

    doc.rect(0, 0, doc.page.width, doc.page.height).fill(colors.page);

    const layout = {
      left: 48,
      width: doc.page.width - 96
    };

    drawHeroSection(doc, payment, layout);

    const cardTop = 236;
    drawTransactionCard(doc, payment, layout.left, cardTop);
    drawCustomerCard(doc, payment, layout.left + 260, cardTop);

    const productTop = 444;
    const productHeight = drawProductCard(doc, payment, layout.left, productTop, layout.width);
    const footerTop = productTop + productHeight + 18;

    drawFooterNote(doc, layout.left, footerTop, layout.width);

    doc.end();
  });
}
