use axum::{
    body::{Body, Bytes},
    extract::{Path, Query, State},
    http::{header, HeaderMap, StatusCode},
    response::{Redirect, Response},
    routing::{get, post},
    Json, Router,
};
use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use hmac::{Hmac, Mac};
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use sha2::Sha256;
use sqlx::FromRow;
use std::time::{SystemTime, UNIX_EPOCH};
use subtle::ConstantTimeEq;
use uuid::Uuid;

use crate::{auth::ResponseError, AppState};

#[derive(Debug, Deserialize)]
struct CustomerBody {
    #[serde(rename = "customerName")]
    customer_name: String,
    #[serde(rename = "customerEmail")]
    customer_email: String,
    #[serde(rename = "customerPhone")]
    customer_phone: Option<String>,
}

#[derive(Debug, FromRow)]
struct PaymentRow {
    id: String,
    reference: String,
    #[sqlx(rename = "productId")]
    amount: Decimal,
    currency: String,
    status: String,
    #[sqlx(rename = "customerEmail")]
    customer_email: String,
    #[sqlx(rename = "customerName")]
    customer_name: String,
    #[sqlx(rename = "customerPhone")]
    customer_phone: Option<String>,
    #[sqlx(rename = "paidAt")]
    paid_at: Option<sqlx::types::chrono::DateTime<sqlx::types::chrono::Utc>>,
    #[sqlx(rename = "createdAt")]
    created_at: sqlx::types::chrono::DateTime<sqlx::types::chrono::Utc>,
    #[sqlx(rename = "productSlug")]
    product_slug: String,
    #[sqlx(rename = "productName")]
    product_name: String,
    #[sqlx(rename = "productDescription")]
    product_description: Option<String>,
    #[sqlx(rename = "sellerName")]
    seller_name: Option<String>,
    #[sqlx(rename = "checkoutUrl")]
    checkout_url: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct ReceiptClaims {
    scope: String,
    #[serde(rename = "ref")]
    reference: String,
    exp: usize,
    iat: usize,
}

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/api/payment-links/{slug}/pay", post(create_checkout))
        .route("/api/payments/mock/{reference}", get(mock_session))
        .route(
            "/api/payments/mock/{reference}/complete",
            post(complete_mock),
        )
        .route(
            "/api/payments/flutterwave/callback",
            get(flutterwave_callback),
        )
        .route(
            "/api/payments/flutterwave/webhook",
            post(flutterwave_webhook),
        )
        .route("/api/payments/{reference}/receipt", get(receipt))
}

async fn create_checkout(
    State(state): State<AppState>,
    Path(slug): Path<String>,
    Json(body): Json<CustomerBody>,
) -> Result<(StatusCode, Json<serde_json::Value>), ResponseError> {
    let customer_name = text(&body.customer_name, 2, 160)?;
    let customer_email = email(&body.customer_email)?;
    let product = sqlx::query_as::<_, ProductPayment>(r#"SELECT p."id", p."sellerId", p."price", p."name", p."description" FROM "Product" p WHERE p."slug" = $1 AND p."isActive" = true"#)
        .bind(&slug).fetch_optional(&state.pool).await.map_err(internal)?
        .ok_or_else(|| ResponseError::new(StatusCode::NOT_FOUND, "Product not found"))?;
    let reference = format!(
        "PAY-{}",
        Uuid::new_v4().simple().to_string()[..12].to_uppercase()
    );
    let id = format!("clp{}", Uuid::new_v4().simple());
    let gateway = env("PAYMENT_GATEWAY", "MOCK").to_uppercase();
    let currency = env("PAYMENT_CURRENCY", "NGN").to_uppercase();
    let payment_sql = if gateway == "FLUTTERWAVE" {
        r#"INSERT INTO "Payment" ("id", "productId", "sellerId", "provider", "reference", "amount", "currency", "customerEmail", "customerName", "customerPhone", "status", "createdAt", "updatedAt") VALUES ($1, $2, $3, 'FLUTTERWAVE', $4, $5, $6, $7, $8, $9, 'PENDING', NOW(), NOW()) RETURNING "id", "reference", "amount", "currency", "status"::text AS "status", "customerEmail", "customerName", "customerPhone", "paidAt", "createdAt", NULL::text AS "checkoutUrl", $10::text AS "productSlug", ''::text AS "productName", NULL::text AS "productDescription", NULL::text AS "sellerName""#
    } else {
        r#"INSERT INTO "Payment" ("id", "productId", "sellerId", "provider", "reference", "amount", "currency", "customerEmail", "customerName", "customerPhone", "status", "createdAt", "updatedAt") VALUES ($1, $2, $3, 'MOCK', $4, $5, $6, $7, $8, $9, 'PENDING', NOW(), NOW()) RETURNING "id", "reference", "amount", "currency", "status"::text AS "status", "customerEmail", "customerName", "customerPhone", "paidAt", "createdAt", NULL::text AS "checkoutUrl", $10::text AS "productSlug", ''::text AS "productName", NULL::text AS "productDescription", NULL::text AS "sellerName""#
    };
    let payment = sqlx::query_as::<_, PaymentRow>(payment_sql)
        .bind(id)
        .bind(&product.id)
        .bind(&product.seller_id)
        .bind(&reference)
        .bind(product.price)
        .bind(&currency)
        .bind(customer_email)
        .bind(customer_name)
        .bind(body.customer_phone.clone())
        .bind(&slug)
        .fetch_one(&state.pool)
        .await
        .map_err(internal)?;
    let checkout_url = if gateway == "FLUTTERWAVE" {
        create_flutterwave_checkout(&state, &payment, &product, body.customer_phone.as_deref())
            .await?
    } else {
        format!("{}/checkout/mock/{}", client_url(), reference)
    };
    if gateway == "FLUTTERWAVE" {
        sqlx::query(r#"UPDATE "Payment" SET "checkoutUrl" = $2, "updatedAt" = NOW() WHERE "reference" = $1"#)
            .bind(&reference).bind(&checkout_url).execute(&state.pool).await.map_err(internal)?;
    }
    Ok((
        StatusCode::CREATED,
        Json(serde_json::json!({
            "message": "Payment checkout created successfully",
            "payment": payment_json(&payment),
            "checkoutUrl": checkout_url,
        })),
    ))
}

async fn mock_session(
    State(state): State<AppState>,
    Path(reference): Path<String>,
) -> Result<Json<serde_json::Value>, ResponseError> {
    let payment = find_payment(&state, &reference).await?;
    Ok(Json(
        serde_json::json!({"session": session_json(&state, &payment)?}),
    ))
}

#[derive(Debug, Serialize)]
struct FlutterwaveCustomer<'a> {
    email: &'a str,
    name: &'a str,
    #[serde(skip_serializing_if = "Option::is_none")]
    phonenumber: Option<&'a str>,
}

#[derive(Debug, Serialize)]
struct FlutterwaveCheckout<'a> {
    tx_ref: &'a str,
    amount: String,
    currency: &'a str,
    redirect_url: String,
    customer: FlutterwaveCustomer<'a>,
    customizations: serde_json::Value,
    meta: serde_json::Value,
    configurations: serde_json::Value,
}

#[derive(Debug, Deserialize)]
struct FlutterwaveCheckoutResponse {
    status: Option<String>,
    data: Option<FlutterwaveCheckoutData>,
}

#[derive(Debug, Deserialize)]
struct FlutterwaveCheckoutData {
    link: Option<String>,
}

async fn create_flutterwave_checkout(
    state: &AppState,
    payment: &PaymentRow,
    product: &ProductPayment,
    phone: Option<&str>,
) -> Result<String, ResponseError> {
    let secret = required_env("FLUTTERWAVE_SECRET_KEY")?;
    let payload = FlutterwaveCheckout {
        tx_ref: &payment.reference,
        amount: money(payment.amount),
        currency: &payment.currency,
        redirect_url: format!("{}/api/payments/flutterwave/callback", api_url()),
        customer: FlutterwaveCustomer {
            email: &payment.customer_email,
            name: &payment.customer_name,
            phonenumber: phone,
        },
        customizations: serde_json::json!({"title": product.name, "description": product.description}),
        meta: serde_json::json!({"payment_id": payment.id, "product_id": product.id, "product_slug": payment.product_slug}),
        configurations: serde_json::json!({"session_duration": env("FLUTTERWAVE_CHECKOUT_SESSION_DURATION_MINUTES", "30").parse::<u32>().unwrap_or(30), "max_retry_attempt": env("FLUTTERWAVE_MAX_RETRY_ATTEMPTS", "5").parse::<u32>().unwrap_or(5)}),
    };
    let response = state
        .http_client
        .post(format!(
            "{}/v3/payments",
            env("FLUTTERWAVE_API_BASE_URL", "https://api.flutterwave.com").trim_end_matches('/')
        ))
        .bearer_auth(secret)
        .json(&payload)
        .send()
        .await
        .map_err(|_| {
            ResponseError::new(StatusCode::BAD_GATEWAY, "Flutterwave checkout unavailable")
        })?;
    let status = response.status();
    let body = response
        .json::<FlutterwaveCheckoutResponse>()
        .await
        .map_err(internal)?;
    body.data.and_then(|data| data.link).filter(|link| !link.is_empty()).ok_or_else(|| {
        tracing::error!(?body.status, %status, "Flutterwave checkout response did not contain a link");
        ResponseError::new(StatusCode::BAD_GATEWAY, "Flutterwave checkout unavailable")
    })
}

#[derive(Debug, Deserialize)]
struct FlutterwaveCallbackQuery {
    status: Option<String>,
    tx_ref: Option<String>,
    transaction_id: Option<String>,
}

#[derive(Debug, Deserialize)]
struct FlutterwaveVerifyResponse {
    data: Option<FlutterwaveVerifyData>,
}

#[derive(Debug, Deserialize, Serialize)]
struct FlutterwaveVerifyData {
    id: Option<serde_json::Value>,
    tx_ref: Option<String>,
    amount: Option<Decimal>,
    currency: Option<String>,
    status: Option<String>,
    created_at: Option<String>,
    #[serde(flatten)]
    extra: serde_json::Map<String, serde_json::Value>,
}

async fn flutterwave_callback(
    State(state): State<AppState>,
    Query(query): Query<FlutterwaveCallbackQuery>,
) -> Result<Redirect, ResponseError> {
    let Some(reference) = query.tx_ref else {
        return Ok(Redirect::temporary(&format!(
            "{}?payment_status=failed&payment_reason=missing_reference",
            client_url()
        )));
    };
    let status = query.status.as_deref().unwrap_or("failed").to_lowercase();
    if status != "successful" || query.transaction_id.is_none() {
        mark_failed(
            &state,
            &reference,
            "Flutterwave payment was not successful",
            None,
        )
        .await?;
        let slug = find_payment(&state, &reference)
            .await
            .map(|payment| payment.product_slug)
            .unwrap_or_else(|_| reference.clone());
        return Ok(payment_redirect(
            &slug,
            "failed",
            None,
            Some("payment_failed"),
        ));
    }
    match verify_flutterwave(&state, &reference, query.transaction_id.as_deref().unwrap()).await {
        Ok(payment) => {
            let token = receipt_token(&state, &reference)?;
            Ok(payment_redirect(
                &payment.product_slug,
                "paid",
                Some((&reference, &token)),
                None,
            ))
        }
        Err(error) => {
            mark_failed(&state, &reference, &error.message, None).await?;
            let slug = find_payment(&state, &reference)
                .await
                .map(|payment| payment.product_slug)
                .unwrap_or_else(|_| reference.clone());
            Ok(payment_redirect(
                &slug,
                "failed",
                None,
                Some("verification_failed"),
            ))
        }
    }
}

async fn verify_flutterwave(
    state: &AppState,
    reference: &str,
    transaction_id: &str,
) -> Result<PaymentRow, ResponseError> {
    let payment = find_payment(state, reference).await?;
    let secret = required_env("FLUTTERWAVE_SECRET_KEY")?;
    let response = state
        .http_client
        .get(format!(
            "{}/v3/transactions/{}/verify",
            env("FLUTTERWAVE_API_BASE_URL", "https://api.flutterwave.com").trim_end_matches('/'),
            transaction_id
        ))
        .bearer_auth(secret)
        .send()
        .await
        .map_err(|_| {
            ResponseError::new(
                StatusCode::BAD_GATEWAY,
                "Flutterwave verification unavailable",
            )
        })?;
    let payload = response
        .json::<FlutterwaveVerifyResponse>()
        .await
        .map_err(internal)?;
    let data = payload.data.ok_or_else(|| {
        ResponseError::new(StatusCode::CONFLICT, "Flutterwave verification failed")
    })?;
    let valid_status = matches!(
        data.status.as_deref().map(str::to_lowercase).as_deref(),
        Some("successful") | Some("completed")
    );
    if data.tx_ref.as_deref() != Some(reference)
        || data.amount.map(money) != Some(money(payment.amount))
        || data.currency.as_deref().map(str::to_uppercase) != Some(payment.currency.to_uppercase())
        || !valid_status
    {
        return Err(ResponseError::new(
            StatusCode::CONFLICT,
            "Flutterwave verification failed",
        ));
    }
    sqlx::query_as::<_, PaymentRow>(r#"UPDATE "Payment" SET "status"='PAID', "paidAt"=NOW(), "verifiedAt"=NOW(), "providerTransactionId"=$2, "providerPayload"=$3, "failureReason"=NULL, "updatedAt"=NOW() WHERE "reference"=$1 RETURNING "id", "reference", "amount", "currency", "status"::text AS "status", "customerEmail", "customerName", "customerPhone", "paidAt", "createdAt", "checkoutUrl", $4::text AS "productSlug", ''::text AS "productName", NULL::text AS "productDescription", NULL::text AS "sellerName""#)
        .bind(reference).bind(transaction_id).bind(serde_json::to_value(&data).map_err(internal)?).bind(&payment.product_slug).fetch_one(&state.pool).await.map_err(internal)
}

async fn mark_failed(
    state: &AppState,
    reference: &str,
    reason: &str,
    payload: Option<serde_json::Value>,
) -> Result<(), ResponseError> {
    sqlx::query(r#"UPDATE "Payment" SET "status"='FAILED', "failureReason"=$2, "verifiedAt"=NOW(), "providerPayload"=COALESCE($3, "providerPayload"), "updatedAt"=NOW() WHERE "reference"=$1 AND "status" <> 'PAID'"#)
        .bind(reference).bind(reason).bind(payload).execute(&state.pool).await.map_err(internal)?;
    Ok(())
}

fn payment_redirect(
    slug: &str,
    status: &str,
    receipt: Option<(&str, &str)>,
    reason: Option<&str>,
) -> Redirect {
    let mut url = format!("{}/pay/{}?payment_status={}", client_url(), slug, status);
    if let Some((reference, token)) = receipt {
        url.push_str(&format!(
            "&payment_reference={reference}&payment_receipt_token={token}"
        ));
    }
    if let Some(reason) = reason {
        url.push_str(&format!("&payment_reason={reason}"));
    }
    Redirect::temporary(&url)
}

#[derive(Debug, Deserialize)]
struct FlutterwaveWebhookEvent {
    event: Option<String>,
    data: Option<FlutterwaveWebhookData>,
}

#[derive(Debug, Deserialize)]
struct FlutterwaveWebhookData {
    id: Option<serde_json::Value>,
    tx_ref: Option<String>,
}

async fn flutterwave_webhook(
    State(state): State<AppState>,
    headers: HeaderMap,
    body: Bytes,
) -> Result<Json<serde_json::Value>, ResponseError> {
    let secret = required_env("FLUTTERWAVE_WEBHOOK_HASH")?;
    let signature = headers
        .get("flutterwave-signature")
        .and_then(|v| v.to_str().ok());
    let legacy = headers.get("verif-hash").and_then(|v| v.to_str().ok());
    let valid = if let Some(signature) = signature {
        let mut mac = Hmac::<Sha256>::new_from_slice(secret.as_bytes()).map_err(internal)?;
        mac.update(&body);
        BASE64
            .encode(mac.finalize().into_bytes())
            .as_bytes()
            .ct_eq(signature.as_bytes())
            .into()
    } else {
        legacy
            .map(|value| value.as_bytes().ct_eq(secret.as_bytes()).into())
            .unwrap_or(false)
    };
    if !valid {
        return Err(ResponseError::new(
            StatusCode::UNAUTHORIZED,
            "Invalid webhook signature",
        ));
    }
    let event = serde_json::from_slice::<FlutterwaveWebhookEvent>(&body)
        .map_err(|_| ResponseError::new(StatusCode::BAD_REQUEST, "Invalid webhook payload"))?;
    if event.event.as_deref() == Some("charge.completed") {
        if let (Some(reference), Some(id)) = (
            event.data.as_ref().and_then(|data| data.tx_ref.as_deref()),
            event.data.as_ref().and_then(|data| data.id.as_ref()),
        ) {
            if let Some(transaction_id) = id.as_str() {
                let _ = verify_flutterwave(&state, reference, transaction_id).await?;
            }
        }
    }
    Ok(Json(serde_json::json!({"message": "Webhook processed"})))
}

async fn complete_mock(
    State(state): State<AppState>,
    Path(reference): Path<String>,
) -> Result<Json<serde_json::Value>, ResponseError> {
    let payment = find_payment(&state, &reference).await?;
    let payment = if payment.status == "PAID" {
        payment
    } else {
        sqlx::query_as::<_, PaymentRow>(r#"UPDATE "Payment" SET "status" = 'PAID', "paidAt" = NOW(), "verifiedAt" = NOW(), "updatedAt" = NOW(), "providerTransactionId" = $2 WHERE "reference" = $1 RETURNING "id", "reference", "amount", "currency", "status"::text AS "status", "customerEmail", "customerName", "customerPhone", "paidAt", "createdAt", "checkoutUrl", "productSlug", "productName", "productDescription", "sellerName""#)
            .bind(&reference).bind(format!("mock-{}", payment.id)).fetch_one(&state.pool).await.map_err(internal)?
    };
    let token = receipt_token(&state, &payment.reference)?;
    Ok(Json(
        serde_json::json!({"message": "Mock checkout completed successfully", "payment": payment_json(&payment), "receiptDownloadUrl": format!("{}/api/payments/{}/receipt?token={}", api_url(), payment.reference, token), "redirectUrl": format!("{}/pay/{}?payment_status=paid&payment_reference={}&payment_receipt_token={}", client_url(), payment.product_slug, payment.reference, token)}),
    ))
}

async fn receipt(
    State(state): State<AppState>,
    Path(reference): Path<String>,
    Query(query): Query<ReceiptQuery>,
) -> Result<Response, ResponseError> {
    let claims = decode::<ReceiptClaims>(
        &query.token,
        &DecodingKey::from_secret(state.auth.secret.as_bytes()),
        &Validation::default(),
    )
    .map_err(|_| ResponseError::new(StatusCode::FORBIDDEN, "Receipt access denied"))?
    .claims;
    if claims.scope != "payment-receipt" || claims.reference != reference {
        return Err(ResponseError::new(
            StatusCode::FORBIDDEN,
            "Receipt access denied",
        ));
    }
    let payment = find_payment(&state, &reference).await?;
    if payment.status != "PAID" {
        return Err(ResponseError::new(
            StatusCode::CONFLICT,
            "Receipt not available for this payment",
        ));
    }
    let pdf = make_pdf(&payment);
    Response::builder()
        .status(StatusCode::OK)
        .header(header::CONTENT_TYPE, "application/pdf")
        .header(
            header::CONTENT_DISPOSITION,
            format!("attachment; filename=\"receipt-{}.pdf\"", payment.reference),
        )
        .header(header::CACHE_CONTROL, "private, no-store")
        .body(Body::from(pdf))
        .map_err(internal)
}

#[derive(Debug, Deserialize)]
struct ReceiptQuery {
    token: String,
}

#[derive(Debug, FromRow)]
struct ProductPayment {
    id: String,
    #[sqlx(rename = "sellerId")]
    seller_id: String,
    price: Decimal,
    name: String,
    description: Option<String>,
}

async fn find_payment(state: &AppState, reference: &str) -> Result<PaymentRow, ResponseError> {
    sqlx::query_as::<_, PaymentRow>(r#"SELECT p."id", p."reference", p."amount", p."currency", p."status"::text AS "status", p."customerEmail", p."customerName", p."customerPhone", p."paidAt", p."createdAt", p."checkoutUrl", pr."slug" AS "productSlug", pr."name" AS "productName", pr."description" AS "productDescription", u."fullName" AS "sellerName" FROM "Payment" p JOIN "Product" pr ON pr."id" = p."productId" JOIN "User" u ON u."id" = p."sellerId" WHERE p."reference" = $1"#)
        .bind(reference).fetch_optional(&state.pool).await.map_err(internal)?.ok_or_else(|| ResponseError::new(StatusCode::NOT_FOUND, "Payment not found"))
}

fn session_json(
    state: &AppState,
    payment: &PaymentRow,
) -> Result<serde_json::Value, ResponseError> {
    Ok(
        serde_json::json!({"reference": payment.reference, "status": payment.status, "amount": money(payment.amount), "currency": payment.currency, "createdAt": payment.created_at, "failureReason": null, "returnUrl": format!("{}/pay/{}", client_url(), payment.product_slug), "receiptToken": if payment.status == "PAID" { Some(receipt_token(state, &payment.reference)?) } else { None::<String> }, "receiptDownloadUrl": null, "product": {"slug": payment.product_slug, "name": payment.product_name, "description": payment.product_description, "sellerName": payment.seller_name}}),
    )
}
fn payment_json(payment: &PaymentRow) -> serde_json::Value {
    serde_json::json!({"id": payment.id, "reference": payment.reference, "amount": money(payment.amount), "currency": payment.currency, "status": payment.status, "customerEmail": payment.customer_email, "customerName": payment.customer_name, "customerPhone": payment.customer_phone, "checkoutUrl": payment.checkout_url.clone().unwrap_or_else(|| format!("{}/checkout/mock/{}", client_url(), payment.reference)), "failureReason": null, "paidAt": payment.paid_at, "createdAt": payment.created_at})
}
fn receipt_token(state: &AppState, reference: &str) -> Result<String, ResponseError> {
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(internal)?
        .as_secs() as usize;
    encode(
        &Header::default(),
        &ReceiptClaims {
            scope: "payment-receipt".into(),
            reference: reference.into(),
            iat: now,
            exp: now + 2_592_000,
        },
        &EncodingKey::from_secret(state.auth.secret.as_bytes()),
    )
    .map_err(internal)
}
fn make_pdf(payment: &PaymentRow) -> Vec<u8> {
    let text = format!("PayLink Africa\\nRecu de paiement\\nReference: {}\\nProduit: {}\\nMontant: {} {}\\nClient: {}\\nStatut: PAID", payment.reference, payment.product_name, money(payment.amount), payment.currency, payment.customer_name);
    let stream = format!("BT /F1 16 Tf 50 760 Td ({}) Tj ET", escape_pdf(&text));
    let objects = vec!["<< /Type /Catalog /Pages 2 0 R >>".to_string(), "<< /Type /Pages /Kids [3 0 R] /Count 1 >>".to_string(), "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>".to_string(), "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>".to_string(), format!("<< /Length {} >>\\nstream\\n{}\\nendstream", stream.len(), stream)];
    let mut pdf = b"%PDF-1.4\\n".to_vec();
    let mut offsets = vec![0];
    for (index, object) in objects.iter().enumerate() {
        offsets.push(pdf.len());
        pdf.extend_from_slice(format!("{} 0 obj\\n{}\\nendobj\\n", index + 1, object).as_bytes());
    }
    let start = pdf.len();
    pdf.extend_from_slice(
        format!("xref\\n0 {}\\n0000000000 65535 f \\n", objects.len() + 1).as_bytes(),
    );
    for offset in offsets.iter().skip(1) {
        pdf.extend_from_slice(format!("{offset:010} 00000 n \\n").as_bytes());
    }
    pdf.extend_from_slice(
        format!(
            "trailer\\n<< /Size {} /Root 1 0 R >>\\nstartxref\\n{}\\n%%EOF",
            objects.len() + 1,
            start
        )
        .as_bytes(),
    );
    pdf
}
fn escape_pdf(value: &str) -> String {
    value
        .replace('\\', "\\\\")
        .replace('(', "\\(")
        .replace(')', "\\)")
        .replace('\n', ") Tj 0 -24 Td (")
}
fn money(value: Decimal) -> String {
    format!("{value:.2}")
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
fn email(value: &str) -> Result<String, ResponseError> {
    let value = value.trim().to_lowercase();
    if value.len() < 5 || !value.contains('@') || value.contains(' ') {
        return Err(ResponseError::new(
            StatusCode::BAD_REQUEST,
            "Please provide a valid email address",
        ));
    }
    Ok(value)
}
fn client_url() -> String {
    std::env::var("CLIENT_URL").unwrap_or_else(|_| "http://localhost:3000".into())
}
fn api_url() -> String {
    std::env::var("API_PUBLIC_URL").unwrap_or_else(|_| "http://localhost:4200".into())
}
fn env(name: &str, default: &str) -> String {
    std::env::var(name).unwrap_or_else(|_| default.into())
}
fn required_env(name: &str) -> Result<String, ResponseError> {
    std::env::var(name).map_err(|_| {
        ResponseError::new(
            StatusCode::SERVICE_UNAVAILABLE,
            format!("Missing configuration: {name}"),
        )
    })
}
fn internal<E: std::fmt::Display>(error: E) -> ResponseError {
    tracing::error!(%error, "Rust payment request failed");
    ResponseError::new(StatusCode::INTERNAL_SERVER_ERROR, "Internal server error")
}
