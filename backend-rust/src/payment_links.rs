use axum::{
    extract::{Path, State},
    http::{HeaderMap, StatusCode},
    routing::{get, patch},
    Json, Router,
};
use redis::AsyncCommands;
use rust_decimal::Decimal;
use serde::Deserialize;
use sqlx::FromRow;

use crate::{auth, auth::ResponseError, AppState};

#[derive(Debug, Deserialize)]
struct ProductBody {
    name: String,
    price: String,
    description: Option<String>,
}

#[derive(Debug, Deserialize)]
struct ProductPatch {
    name: Option<String>,
    price: Option<String>,
    description: Option<String>,
}

#[derive(Debug, Deserialize)]
struct StatusBody {
    #[serde(rename = "isActive")]
    is_active: bool,
}

#[derive(Debug, FromRow)]
struct ProductRow {
    id: String,
    slug: String,
    name: String,
    description: Option<String>,
    price: Decimal,
    #[sqlx(rename = "isActive")]
    is_active: bool,
    #[sqlx(rename = "createdAt")]
    created_at: sqlx::types::chrono::DateTime<sqlx::types::chrono::Utc>,
    #[sqlx(rename = "updatedAt")]
    updated_at: sqlx::types::chrono::DateTime<sqlx::types::chrono::Utc>,
}

#[derive(Debug, FromRow)]
struct PaymentRow {
    id: String,
    reference: String,
    amount: Decimal,
    currency: String,
    status: String,
    #[sqlx(rename = "customerName")]
    customer_name: Option<String>,
    #[sqlx(rename = "customerEmail")]
    customer_email: Option<String>,
    #[sqlx(rename = "customerPhone")]
    customer_phone: Option<String>,
    #[sqlx(rename = "failureReason")]
    failure_reason: Option<String>,
    #[sqlx(rename = "paidAt")]
    paid_at: Option<sqlx::types::chrono::DateTime<sqlx::types::chrono::Utc>>,
    #[sqlx(rename = "createdAt")]
    created_at: sqlx::types::chrono::DateTime<sqlx::types::chrono::Utc>,
}

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/api/payment-links", get(list).post(create))
        .route(
            "/api/payment-links/mine/{product_id}",
            get(detail).patch(update).delete(remove),
        )
        .route("/api/payment-links/mine/{product_id}/status", patch(status))
        .route("/api/payment-links/{slug}", get(public_product))
}

async fn list(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Json<serde_json::Value>, ResponseError> {
    let user = auth::claims(&state, &headers)?;
    let products = sqlx::query_as::<_, ProductRow>(r#"SELECT "id", "sellerId", "slug", "name", "description", "price", "isActive", "createdAt", "updatedAt" FROM "Product" WHERE "sellerId" = $1 ORDER BY "createdAt" DESC"#)
        .bind(&user.sub).fetch_all(&state.pool).await.map_err(internal)?;
    let mut items = Vec::new();
    let mut total_count = 0_i64;
    let mut total_amount = Decimal::ZERO;
    for product in products {
        let (count, amount) = paid_metrics(&state, &product.id).await?;
        total_count += count;
        total_amount += amount;
        items.push(serialize_product(&state, product, false).await?);
    }
    let recent = sqlx::query_as::<_, RecentPayment>(r#"SELECT p."id", p."reference", p."amount", p."currency", p."status"::text AS "status", p."customerName", p."customerEmail", p."customerPhone", p."failureReason", p."paidAt", p."createdAt", pr."id" AS "productId", pr."name" AS "productName", pr."slug" AS "productSlug" FROM "Payment" p JOIN "Product" pr ON pr."id" = p."productId" WHERE p."sellerId" = $1 AND p."status" = 'PAID' ORDER BY p."createdAt" DESC LIMIT 10"#)
        .bind(&user.sub).fetch_all(&state.pool).await.map_err(internal)?;
    let recent_json: Vec<serde_json::Value> = recent.into_iter().map(|payment| {
        let mut value = payment_response(&payment.base);
        if let Some(object) = value.as_object_mut() {
            object.insert("product".into(), serde_json::json!({"id": payment.product_id, "name": payment.product_name, "slug": payment.product_slug}));
        }
        value
    }).collect();
    Ok(Json(
        serde_json::json!({"items": items, "summary": {"productsCount": items.len(), "paymentsCount": total_count, "totalCollected": money(total_amount)}, "recentPayments": recent_json}),
    ))
}

async fn create(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(body): Json<ProductBody>,
) -> Result<(StatusCode, Json<serde_json::Value>), ResponseError> {
    let user = auth::claims(&state, &headers)?;
    auth::csrf(&headers, &user)?;
    let name = text(&body.name, 2, 160)?;
    let price = decimal(&body.price)?;
    let slug = unique_slug(&state, &name).await?;
    let product = sqlx::query_as::<_, ProductRow>(r#"INSERT INTO "Product" ("id", "sellerId", "slug", "name", "description", "price", "isActive", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, $6, true, NOW(), NOW()) RETURNING "id", "sellerId", "slug", "name", "description", "price", "isActive", "createdAt", "updatedAt""#)
        .bind(format!("clp{}", uuid::Uuid::new_v4().simple())).bind(user.sub).bind(slug).bind(name).bind(body.description).bind(price).fetch_one(&state.pool).await.map_err(internal)?;
    let item = serialize_product(&state, product, false).await?;
    Ok((
        StatusCode::CREATED,
        Json(serde_json::json!({"message": "Payment link created successfully", "item": item})),
    ))
}

async fn detail(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(product_id): Path<String>,
) -> Result<Json<serde_json::Value>, ResponseError> {
    let user = auth::claims(&state, &headers)?;
    let product = product(&state, &product_id, &user.sub).await?;
    Ok(Json(
        serde_json::json!({"item": serialize_product(&state, product, true).await?}),
    ))
}

async fn update(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(product_id): Path<String>,
    Json(body): Json<ProductPatch>,
) -> Result<Json<serde_json::Value>, ResponseError> {
    let user = auth::claims(&state, &headers)?;
    auth::csrf(&headers, &user)?;
    let existing = product(&state, &product_id, &user.sub).await?;
    let name = body.name.map(|v| text(&v, 2, 160)).transpose()?;
    let price = body.price.map(|v| decimal(&v)).transpose()?;
    if name.is_none() && price.is_none() && body.description.is_none() {
        return Err(ResponseError::new(
            StatusCode::BAD_REQUEST,
            "At least one field must be provided",
        ));
    }
    let updated = sqlx::query_as::<_, ProductRow>(r#"UPDATE "Product" SET "name" = COALESCE($2, "name"), "price" = COALESCE($3, "price"), "description" = COALESCE($4, "description"), "updatedAt" = NOW() WHERE "id" = $1 RETURNING "id", "sellerId", "slug", "name", "description", "price", "isActive", "createdAt", "updatedAt""#)
        .bind(existing.id).bind(name).bind(price).bind(body.description).fetch_one(&state.pool).await.map_err(internal)?;
    Ok(Json(
        serde_json::json!({"message": "Payment link updated successfully", "item": serialize_product(&state, updated, true).await?}),
    ))
}

async fn status(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(product_id): Path<String>,
    Json(body): Json<StatusBody>,
) -> Result<Json<serde_json::Value>, ResponseError> {
    let user = auth::claims(&state, &headers)?;
    auth::csrf(&headers, &user)?;
    let existing = product(&state, &product_id, &user.sub).await?;
    let updated = sqlx::query_as::<_, ProductRow>(r#"UPDATE "Product" SET "isActive" = $2, "updatedAt" = NOW() WHERE "id" = $1 RETURNING "id", "sellerId", "slug", "name", "description", "price", "isActive", "createdAt", "updatedAt""#).bind(existing.id).bind(body.is_active).fetch_one(&state.pool).await.map_err(internal)?;
    Ok(Json(
        serde_json::json!({"message": format!("Payment link {} successfully", if body.is_active {"activated"} else {"deactivated"}), "item": serialize_product(&state, updated, true).await?}),
    ))
}

async fn remove(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(product_id): Path<String>,
) -> Result<Json<serde_json::Value>, ResponseError> {
    let user = auth::claims(&state, &headers)?;
    auth::csrf(&headers, &user)?;
    let existing = product(&state, &product_id, &user.sub).await?;
    sqlx::query(r#"DELETE FROM "Product" WHERE "id" = $1"#)
        .bind(&existing.id)
        .execute(&state.pool)
        .await
        .map_err(internal)?;
    Ok(Json(
        serde_json::json!({"message": "Payment link deleted successfully", "id": existing.id}),
    ))
}

async fn public_product(
    State(state): State<AppState>,
    Path(slug): Path<String>,
) -> Result<Json<serde_json::Value>, ResponseError> {
    let cache_key = format!("paylink:public:{slug}");
    if let Some(redis) = &state.redis {
        if let Ok(mut connection) = redis.get_multiplexed_async_connection().await {
            if let Ok(Some(cached)) = connection.get::<_, Option<String>>(&cache_key).await {
                if let Ok(value) = serde_json::from_str::<serde_json::Value>(&cached) {
                    return Ok(Json(value));
                }
            }
        }
    }
    let product = sqlx::query_as::<_, PublicProduct>(r#"SELECT p."id", p."slug", p."name", p."description", p."price", p."createdAt", u."fullName" AS "sellerName" FROM "Product" p JOIN "User" u ON u."id" = p."sellerId" WHERE p."slug" = $1 AND p."isActive" = true"#).bind(slug).fetch_optional(&state.pool).await.map_err(internal)?.ok_or_else(|| ResponseError::new(StatusCode::NOT_FOUND, "Product not found"))?;
    let value = serde_json::json!({"item": {"id": product.id, "slug": product.slug, "name": product.name, "description": product.description, "price": money(product.price), "sellerName": product.seller_name, "createdAt": product.created_at}});
    if let Some(redis) = &state.redis {
        if let Ok(mut connection) = redis.get_multiplexed_async_connection().await {
            if let Ok(serialized) = serde_json::to_string(&value) {
                let _: Result<(), _> = connection.set_ex(&cache_key, serialized, 60).await;
            }
        }
    }
    Ok(Json(value))
}

async fn product(state: &AppState, id: &str, seller_id: &str) -> Result<ProductRow, ResponseError> {
    sqlx::query_as::<_, ProductRow>(r#"SELECT "id", "sellerId", "slug", "name", "description", "price", "isActive", "createdAt", "updatedAt" FROM "Product" WHERE "id" = $1 AND "sellerId" = $2"#).bind(id).bind(seller_id).fetch_optional(&state.pool).await.map_err(internal)?.ok_or_else(|| ResponseError::new(StatusCode::NOT_FOUND, "Payment link not found"))
}
async fn unique_slug(state: &AppState, name: &str) -> Result<String, ResponseError> {
    let base: String = name
        .to_lowercase()
        .chars()
        .map(|c| if c.is_ascii_alphanumeric() { c } else { '-' })
        .collect();
    let base = base.trim_matches('-').chars().take(48).collect::<String>();
    let base = if base.is_empty() {
        "product".into()
    } else {
        base
    };
    for index in 0..1000 {
        let candidate = if index == 0 {
            base.clone()
        } else {
            format!("{}-{}", base, index)
        };
        let exists =
            sqlx::query_scalar::<_, String>(r#"SELECT "id" FROM "Product" WHERE "slug" = $1"#)
                .bind(&candidate)
                .fetch_optional(&state.pool)
                .await
                .map_err(internal)?;
        if exists.is_none() {
            return Ok(candidate);
        }
    }
    Err(ResponseError::new(
        StatusCode::INTERNAL_SERVER_ERROR,
        "Unable to create payment link",
    ))
}
async fn paid_metrics(state: &AppState, product_id: &str) -> Result<(i64, Decimal), ResponseError> {
    let row = sqlx::query_as::<_, (i64, Option<Decimal>)>(r#"SELECT COUNT(*)::bigint, COALESCE(SUM("amount"), 0) FROM "Payment" WHERE "productId" = $1 AND "status" = 'PAID'"#).bind(product_id).fetch_one(&state.pool).await.map_err(internal)?;
    Ok((row.0, row.1.unwrap_or(Decimal::ZERO)))
}
async fn serialize_product(
    state: &AppState,
    product: ProductRow,
    detail: bool,
) -> Result<serde_json::Value, ResponseError> {
    let (count, total) = paid_metrics(state, &product.id).await?;
    let payments = payments(state, &product.id, if detail { 20 } else { 3 }).await?;
    Ok(
        serde_json::json!({"id": product.id, "slug": product.slug, "name": product.name, "description": product.description, "price": money(product.price), "isActive": product.is_active, "status": if product.is_active {"ACTIVE"} else {"INACTIVE"}, "paymentsCount": count, "totalCollected": money(total), "createdAt": product.created_at, "updatedAt": product.updated_at, if detail {"payments"} else {"recentPayments"}: payments}),
    )
}
async fn payments(
    state: &AppState,
    product_id: &str,
    limit: i64,
) -> Result<Vec<serde_json::Value>, ResponseError> {
    let rows = sqlx::query_as::<_, PaymentRow>(r#"SELECT "id", "reference", "amount", "currency", "status"::text AS "status", "customerName", "customerEmail", "customerPhone", "failureReason", "paidAt", "createdAt" FROM "Payment" WHERE "productId" = $1 AND ($2 = 20 OR "status" = 'PAID') ORDER BY "createdAt" DESC LIMIT $2"#).bind(product_id).bind(limit).fetch_all(&state.pool).await.map_err(internal)?;
    Ok(rows.into_iter().map(|row| payment_response(&row)).collect())
}
fn payment_response(row: &PaymentRow) -> serde_json::Value {
    serde_json::json!({"id": row.id, "reference": row.reference, "amount": money(row.amount), "currency": row.currency, "status": row.status, "customerName": row.customer_name, "customerEmail": mask_email(row.customer_email.as_deref()), "customerPhone": mask_phone(row.customer_phone.as_deref()), "failureReason": row.failure_reason, "paidAt": row.paid_at, "createdAt": row.created_at})
}
fn money(value: Decimal) -> String {
    format!("{:.2}", value)
}
fn decimal(value: &str) -> Result<Decimal, ResponseError> {
    value
        .parse::<Decimal>()
        .map_err(|_| ResponseError::new(StatusCode::BAD_REQUEST, "Please provide a valid price"))
}
fn text(value: &str, min: usize, max: usize) -> Result<String, ResponseError> {
    let value = value.trim();
    if value.chars().count() < min || value.chars().count() > max {
        return Err(ResponseError::new(
            StatusCode::BAD_REQUEST,
            "Validation failed",
        ));
    }
    Ok(value.into())
}
fn mask_email(value: Option<&str>) -> Option<String> {
    value.map(|email| {
        let parts: Vec<&str> = email.split('@').collect();
        if parts.len() != 2 {
            return "***".into();
        }
        format!(
            "{}***@{}***{}",
            &parts[0][..parts[0].len().min(2)],
            &parts[1][..parts[1].len().min(2)],
            parts[1]
                .split('.')
                .last()
                .map(|v| format!(".{v}"))
                .unwrap_or_default()
        )
    })
}
fn mask_phone(value: Option<&str>) -> Option<String> {
    value.map(|phone| {
        if phone.len() <= 4 {
            "****".into()
        } else {
            format!(
                "{}****{}",
                &phone[..phone.len().min(5)],
                &phone[phone.len().saturating_sub(2)..]
            )
        }
    })
}
fn internal<E: std::fmt::Display>(error: E) -> ResponseError {
    tracing::error!(%error, "Rust payment link request failed");
    ResponseError::new(StatusCode::INTERNAL_SERVER_ERROR, "Internal server error")
}

#[derive(Debug, FromRow)]
struct PublicProduct {
    id: String,
    slug: String,
    name: String,
    description: Option<String>,
    price: Decimal,
    #[sqlx(rename = "createdAt")]
    created_at: sqlx::types::chrono::DateTime<sqlx::types::chrono::Utc>,
    #[sqlx(rename = "sellerName")]
    seller_name: Option<String>,
}

#[derive(Debug, FromRow)]
struct RecentPayment {
    #[sqlx(flatten)]
    base: PaymentRow,
    #[sqlx(rename = "productId")]
    product_id: String,
    #[sqlx(rename = "productName")]
    product_name: String,
    #[sqlx(rename = "productSlug")]
    product_slug: String,
}
