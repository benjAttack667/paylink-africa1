import { createHttpError } from "../../lib/errors.js";
import { prisma } from "../../lib/prisma.js";

function formatDecimalValue(value) {
  return Number(value.toString()).toFixed(2);
}

function maskEmailAddress(value) {
  if (!value) {
    return null;
  }

  const [localPart, domainPart] = value.split("@");

  if (!localPart || !domainPart) {
    return "***";
  }

  const domainParts = domainPart.split(".");
  const topLevelDomain = domainParts.length > 1 ? `.${domainParts.pop()}` : "";
  const baseDomain = domainParts.join(".");
  const maskedLocalPart =
    localPart.length <= 2 ? `${localPart.slice(0, 1)}***` : `${localPart.slice(0, 2)}***`;
  const maskedDomain =
    baseDomain.length <= 2 ? `${baseDomain.slice(0, 1)}***` : `${baseDomain.slice(0, 2)}***`;

  return `${maskedLocalPart}@${maskedDomain}${topLevelDomain}`;
}

function maskPhoneNumber(value) {
  if (!value) {
    return null;
  }

  const trimmedValue = value.trim();

  if (trimmedValue.length <= 4) {
    return "****";
  }

  const visiblePrefixLength = Math.min(5, Math.max(2, trimmedValue.length - 4));
  const visiblePrefix = trimmedValue.slice(0, visiblePrefixLength);
  const visibleSuffix = trimmedValue.slice(-2);
  const maskedLength = Math.max(trimmedValue.length - visiblePrefix.length - visibleSuffix.length, 4);

  return `${visiblePrefix}${"*".repeat(maskedLength)}${visibleSuffix}`;
}

const paymentSummarySelect = {
  id: true,
  reference: true,
  amount: true,
  currency: true,
  status: true,
  customerName: true,
  customerEmail: true,
  customerPhone: true,
  failureReason: true,
  paidAt: true,
  createdAt: true
};

const recentPaidPaymentsInclude = {
  where: {
    status: "PAID"
  },
  orderBy: {
    createdAt: "desc"
  },
  take: 3,
  select: paymentSummarySelect
};

const productDetailPaymentsInclude = {
  orderBy: {
    createdAt: "desc"
  },
  take: 20,
  select: paymentSummarySelect
};

const sellerProductListSelect = {
  id: true,
  slug: true,
  name: true,
  description: true,
  price: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  payments: recentPaidPaymentsInclude
};

function slugifyProductName(name) {
  const baseSlug = name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  return baseSlug || "product";
}

async function createUniqueSlug(name) {
  const baseSlug = slugifyProductName(name);
  let candidate = baseSlug;
  let suffix = 1;

  while (
    await prisma.product.findUnique({
      where: {
        slug: candidate
      },
      select: {
        id: true
      }
    })
  ) {
    candidate = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  return candidate;
}

function normalizePaidMetrics(metrics = null) {
  const paymentsCount = Number(metrics?._count?._all ?? metrics?.paymentsCount ?? 0);
  const rawTotal =
    metrics?._sum?.amount ??
    metrics?.totalCollected ??
    0;
  const totalCollected = Number(rawTotal?.toString?.() ?? rawTotal ?? 0);

  return {
    paymentsCount,
    totalCollected: totalCollected.toFixed(2)
  };
}

function buildSerializedProductBase(product, paidMetrics = null) {
  const normalizedPaidMetrics = normalizePaidMetrics(paidMetrics);

  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    description: product.description,
    price: formatDecimalValue(product.price),
    isActive: product.isActive,
    status: product.isActive ? "ACTIVE" : "INACTIVE",
    paymentsCount: normalizedPaidMetrics.paymentsCount,
    totalCollected: normalizedPaidMetrics.totalCollected,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt
  };
}

function serializeProduct(product, paidMetrics = null) {
  return {
    ...buildSerializedProductBase(product, paidMetrics),
    recentPayments: (product.payments ?? []).map(serializePayment)
  };
}

function serializeSellerProductDetail(product, paidMetrics = null) {
  return {
    ...buildSerializedProductBase(product, paidMetrics),
    payments: (product.payments ?? []).map(serializePayment)
  };
}

function serializePublicProduct(product) {
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    description: product.description,
    price: formatDecimalValue(product.price),
    sellerName: product.seller?.fullName ?? null,
    createdAt: product.createdAt
  };
}

function serializePayment(payment) {
  return {
    id: payment.id,
    reference: payment.reference,
    amount: formatDecimalValue(payment.amount),
    currency: payment.currency,
    status: payment.status,
    customerName: payment.customerName ?? null,
    customerEmail: maskEmailAddress(payment.customerEmail),
    customerPhone: maskPhoneNumber(payment.customerPhone),
    failureReason: payment.failureReason ?? null,
    paidAt: payment.paidAt,
    createdAt: payment.createdAt
  };
}

async function findActiveProductBySlug(slug) {
  const product = await prisma.product.findUnique({
    where: {
      slug
    },
    include: {
      seller: {
        select: {
          fullName: true
        }
      }
    }
  });

  if (!product || !product.isActive) {
    throw createHttpError(404, "Product not found");
  }

  return product;
}

async function findSellerProductOrThrow({ sellerId, productId }) {
  const product = await prisma.product.findFirst({
    where: {
      id: productId,
      sellerId
    },
    include: {
      payments: productDetailPaymentsInclude
    }
  });

  if (!product) {
    throw createHttpError(404, "Payment link not found");
  }

  return product;
}

async function getPaidMetricsByProductIds(productIds, sellerId = null) {
  if (!Array.isArray(productIds) || productIds.length === 0) {
    return new Map();
  }

  const paidMetrics = await prisma.payment.groupBy({
    by: ["productId"],
    where: {
      productId: {
        in: productIds
      },
      status: "PAID",
      ...(sellerId ? { sellerId } : {})
    },
    _count: {
      _all: true
    },
    _sum: {
      amount: true
    }
  });

  return new Map(
    paidMetrics.map((entry) => [
      entry.productId,
      normalizePaidMetrics(entry)
    ])
  );
}

export async function createSellerProduct({ sellerId, name, description, price }) {
  const slug = await createUniqueSlug(name);

  const product = await prisma.product.create({
    data: {
      sellerId,
      name,
      description,
      price,
      slug
    },
    select: sellerProductListSelect
  });

  return serializeProduct(product, {
    paymentsCount: 0,
    totalCollected: "0.00"
  });
}

export async function listSellerProducts(sellerId) {
  const products = await prisma.product.findMany({
    where: {
      sellerId
    },
    orderBy: {
      createdAt: "desc"
    },
    select: sellerProductListSelect
  });

  const paidMetricsByProductId = await getPaidMetricsByProductIds(
    products.map((product) => product.id),
    sellerId
  );
  const items = products.map((product) =>
    serializeProduct(product, paidMetricsByProductId.get(product.id))
  );
  const paymentsCount = Array.from(paidMetricsByProductId.values()).reduce(
    (sum, metrics) => sum + metrics.paymentsCount,
    0
  );
  const totalCollected = Array.from(paidMetricsByProductId.values())
    .reduce((sum, metrics) => sum + Number(metrics.totalCollected), 0)
    .toFixed(2);
  const recentPayments = await prisma.payment.findMany({
    where: {
      sellerId,
      status: "PAID"
    },
    orderBy: {
      createdAt: "desc"
    },
    take: 10,
    include: {
      product: {
        select: {
          id: true,
          name: true,
          slug: true
        }
      }
    }
  });

  return {
    items,
    summary: {
      productsCount: items.length,
      paymentsCount,
      totalCollected
    },
    recentPayments: recentPayments.map((payment) => ({
      ...serializePayment(payment),
      product: payment.product
    }))
  };
}

export async function getSellerProductDetail({ sellerId, productId }) {
  const product = await findSellerProductOrThrow({ sellerId, productId });
  const paidMetricsByProductId = await getPaidMetricsByProductIds([product.id], sellerId);

  return serializeSellerProductDetail(product, paidMetricsByProductId.get(product.id));
}

export async function updateSellerProduct({
  sellerId,
  productId,
  name,
  description,
  price
}) {
  const product = await findSellerProductOrThrow({ sellerId, productId });
  const data = {};

  if (name !== undefined) {
    data.name = name;
  }

  if (description !== undefined) {
    data.description = description;
  }

  if (price !== undefined) {
    data.price = price;
  }

  if (Object.keys(data).length === 0) {
    throw createHttpError(400, "At least one field must be provided");
  }

  const updatedProduct = await prisma.product.update({
    where: {
      id: product.id
    },
    data,
    include: {
      payments: productDetailPaymentsInclude
    }
  });
  const paidMetricsByProductId = await getPaidMetricsByProductIds([updatedProduct.id], sellerId);

  return serializeSellerProductDetail(
    updatedProduct,
    paidMetricsByProductId.get(updatedProduct.id)
  );
}

export async function updateSellerProductStatus({ sellerId, productId, isActive }) {
  const product = await findSellerProductOrThrow({ sellerId, productId });

  const updatedProduct = await prisma.product.update({
    where: {
      id: product.id
    },
    data: {
      isActive
    },
    include: {
      payments: productDetailPaymentsInclude
    }
  });
  const paidMetricsByProductId = await getPaidMetricsByProductIds([updatedProduct.id], sellerId);

  return serializeSellerProductDetail(
    updatedProduct,
    paidMetricsByProductId.get(updatedProduct.id)
  );
}

export async function deleteSellerProduct({ sellerId, productId }) {
  const product = await findSellerProductOrThrow({ sellerId, productId });

  await prisma.product.delete({
    where: {
      id: product.id
    }
  });

  return {
    id: product.id
  };
}

export async function getPublicProduct(slug) {
  const product = await findActiveProductBySlug(slug);

  return serializePublicProduct(product);
}
