use axum::{
    extract::State,
    http::{header, HeaderMap, HeaderValue, StatusCode},
    routing::{get, post},
    Json, Router,
};
use bcrypt::{hash, verify, DEFAULT_COST};
use chrono::{DateTime, Utc};
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use std::{
    env,
    sync::Arc,
    time::{SystemTime, UNIX_EPOCH},
};
use uuid::Uuid;

use crate::AppState;

#[derive(Clone)]
pub struct AuthConfig {
    pub secret: Arc<str>,
    pub cookie_name: Arc<str>,
    pub cookie_max_age: u64,
    pub secure: bool,
}

impl AuthConfig {
    pub fn from_env() -> Result<Self, Box<dyn std::error::Error>> {
        Ok(Self {
            secret: env::var("JWT_SECRET")
                .unwrap_or_else(|_| "local-development-secret-change-me".into())
                .into(),
            cookie_name: env::var("JWT_COOKIE_NAME")
                .unwrap_or_else(|_| "paylink_access".into())
                .into(),
            cookie_max_age: env::var("JWT_COOKIE_MAX_AGE")
                .unwrap_or_else(|_| "43200".into())
                .parse()?,
            secure: env::var("COOKIE_SECURE")
                .map(|value| matches!(value.to_lowercase().as_str(), "true" | "1" | "yes"))
                .unwrap_or(false),
        })
    }
}

#[derive(Debug, Deserialize)]
struct RegisterBody {
    #[serde(rename = "fullName")]
    full_name: String,
    email: String,
    password: String,
}

#[derive(Debug, Deserialize)]
struct LoginBody {
    email: String,
    password: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String,
    pub email: String,
    pub role: String,
    pub csrf: String,
    pub exp: usize,
    pub iat: usize,
}

#[derive(Debug, Serialize, FromRow)]
struct UserRow {
    id: String,
    email: String,
    #[sqlx(rename = "fullName")]
    full_name: String,
    role: String,
    #[sqlx(rename = "businessName")]
    business_name: Option<String>,
    #[sqlx(rename = "countryCode")]
    country_code: Option<String>,
    #[sqlx(rename = "createdAt")]
    created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize)]
struct UserResponse {
    id: String,
    email: String,
    #[serde(rename = "fullName")]
    full_name: String,
    role: String,
    #[serde(rename = "businessName")]
    business_name: Option<String>,
    #[serde(rename = "countryCode")]
    country_code: Option<String>,
    #[serde(rename = "createdAt")]
    created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize)]
struct AuthResponse {
    user: UserResponse,
    #[serde(rename = "csrfToken")]
    csrf_token: String,
}

#[derive(Debug, Serialize)]
struct MessageResponse {
    message: &'static str,
}

#[derive(Debug, Serialize)]
struct ErrorResponse {
    message: String,
    code: Option<&'static str>,
}

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/api/auth/register", post(register))
        .route("/api/auth/login", post(login))
        .route("/api/auth/me", get(me))
        .route("/api/auth/logout", post(logout))
}

async fn register(
    State(state): State<AppState>,
    Json(body): Json<RegisterBody>,
) -> Result<impl axum::response::IntoResponse, ResponseError> {
    let full_name = text(&body.full_name, 2, 120)?;
    let email = email(&body.email)?;
    password(&body.password)?;
    let exists = sqlx::query_scalar::<_, String>(r#"SELECT "id" FROM "User" WHERE "email" = $1"#)
        .bind(&email)
        .fetch_optional(&state.pool)
        .await
        .map_err(internal)?;
    if exists.is_some() {
        return Err(ResponseError::new(
            StatusCode::CONFLICT,
            "Unable to create account with the provided information",
        ));
    }
    let password_hash = hash(&body.password, DEFAULT_COST).map_err(internal)?;
    let user = sqlx::query_as::<_, UserRow>(r#"INSERT INTO "User" ("id", "email", "fullName", "passwordHash", "role", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, 'SELLER', NOW(), NOW()) RETURNING "id", "email", "fullName", "role"::text AS "role", "businessName", "countryCode", "createdAt""#)
        .bind(format!("clx{}", Uuid::new_v4().simple())).bind(email).bind(full_name).bind(password_hash)
        .fetch_one(&state.pool).await.map_err(internal)?;
    respond_authenticated(&state, user, StatusCode::CREATED)
}

async fn login(
    State(state): State<AppState>,
    Json(body): Json<LoginBody>,
) -> Result<impl axum::response::IntoResponse, ResponseError> {
    let email = email(&body.email)?;
    let record = sqlx::query_as::<_, LoginRow>(r#"SELECT "id", "email", "fullName", "passwordHash", "role"::text AS "role", "businessName", "countryCode", "createdAt" FROM "User" WHERE "email" = $1"#)
        .bind(email).fetch_optional(&state.pool).await.map_err(internal)?
        .ok_or_else(|| ResponseError::new(StatusCode::UNAUTHORIZED, "Invalid email or password"))?;
    if !verify(&body.password, &record.password_hash).map_err(internal)? {
        return Err(ResponseError::new(
            StatusCode::UNAUTHORIZED,
            "Invalid email or password",
        ));
    }
    respond_authenticated(
        &state,
        UserRow {
            id: record.id,
            email: record.email,
            full_name: record.full_name,
            role: record.role,
            business_name: record.business_name,
            country_code: record.country_code,
            created_at: record.created_at,
        },
        StatusCode::OK,
    )
}

async fn me(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<impl axum::response::IntoResponse, ResponseError> {
    let claims = claims(&state, &headers)?;
    let user = sqlx::query_as::<_, UserRow>(r#"SELECT "id", "email", "fullName", "role"::text AS "role", "businessName", "countryCode", "createdAt" FROM "User" WHERE "id" = $1"#)
        .bind(claims.sub).fetch_optional(&state.pool).await.map_err(internal)?
        .ok_or_else(|| ResponseError::new(StatusCode::NOT_FOUND, "User not found"))?;
    Ok((
        [(header::CACHE_CONTROL, HeaderValue::from_static("no-store"))],
        Json(AuthResponse {
            user: UserResponse::from(user),
            csrf_token: claims.csrf,
        }),
    ))
}

async fn logout(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<impl axum::response::IntoResponse, ResponseError> {
    let claims = claims(&state, &headers)?;
    csrf(&headers, &claims)?;
    Ok((
        [
            (header::CACHE_CONTROL, HeaderValue::from_static("no-store")),
            (header::SET_COOKIE, clear_cookie(&state)),
        ],
        Json(MessageResponse {
            message: "Logged out successfully",
        }),
    ))
}

#[derive(Debug, FromRow)]
struct LoginRow {
    id: String,
    email: String,
    #[sqlx(rename = "fullName")]
    full_name: String,
    #[sqlx(rename = "passwordHash")]
    password_hash: String,
    role: String,
    #[sqlx(rename = "businessName")]
    business_name: Option<String>,
    #[sqlx(rename = "countryCode")]
    country_code: Option<String>,
    #[sqlx(rename = "createdAt")]
    created_at: sqlx::types::chrono::DateTime<sqlx::types::chrono::Utc>,
}

impl From<UserRow> for UserResponse {
    fn from(user: UserRow) -> Self {
        Self {
            id: user.id,
            email: user.email,
            full_name: user.full_name,
            role: user.role,
            business_name: user.business_name,
            country_code: user.country_code,
            created_at: user.created_at,
        }
    }
}

fn respond_authenticated(
    state: &AppState,
    user: UserRow,
    status: StatusCode,
) -> Result<impl axum::response::IntoResponse, ResponseError> {
    let csrf_token = Uuid::new_v4().simple().to_string();
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(internal)?
        .as_secs() as usize;
    let claims = Claims {
        sub: user.id.clone(),
        email: user.email.clone(),
        role: user.role.clone(),
        csrf: csrf_token.clone(),
        iat: now,
        exp: now + state.auth.cookie_max_age as usize,
    };
    let token = encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(state.auth.secret.as_bytes()),
    )
    .map_err(internal)?;
    let cookie = HeaderValue::from_str(&format!(
        "{}={}; HttpOnly; Path=/; Max-Age={}; SameSite=Lax{}",
        state.auth.cookie_name,
        token,
        state.auth.cookie_max_age,
        if state.auth.secure { "; Secure" } else { "" }
    ))
    .map_err(internal)?;
    Ok((
        status,
        [
            (header::CACHE_CONTROL, HeaderValue::from_static("no-store")),
            (header::SET_COOKIE, cookie),
        ],
        Json(AuthResponse {
            user: UserResponse::from(user),
            csrf_token,
        }),
    ))
}

pub fn claims(state: &AppState, headers: &HeaderMap) -> Result<Claims, ResponseError> {
    let cookie = headers
        .get(header::COOKIE)
        .and_then(|v| v.to_str().ok())
        .unwrap_or_default();
    let prefix = format!("{}=", state.auth.cookie_name);
    let token = cookie
        .split(';')
        .map(str::trim)
        .find_map(|part| part.strip_prefix(&prefix))
        .ok_or_else(|| ResponseError::new(StatusCode::UNAUTHORIZED, "Authentication required"))?;
    decode::<Claims>(
        token,
        &DecodingKey::from_secret(state.auth.secret.as_bytes()),
        &Validation::default(),
    )
    .map(|data| data.claims)
    .map_err(|_| ResponseError::new(StatusCode::UNAUTHORIZED, "Authentication required"))
}

pub fn csrf(headers: &HeaderMap, claims: &Claims) -> Result<(), ResponseError> {
    let provided = headers
        .get("x-csrf-token")
        .and_then(|v| v.to_str().ok())
        .unwrap_or_default();
    if provided.is_empty() || provided != claims.csrf {
        return Err(ResponseError::new(
            StatusCode::FORBIDDEN,
            "Invalid or missing CSRF token",
        ));
    }
    Ok(())
}

fn clear_cookie(state: &AppState) -> HeaderValue {
    HeaderValue::from_str(&format!(
        "{}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax{}",
        state.auth.cookie_name,
        if state.auth.secure { "; Secure" } else { "" }
    ))
    .expect("valid cookie")
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
fn password(value: &str) -> Result<(), ResponseError> {
    if value.chars().count() < 8 || value.chars().count() > 128 {
        return Err(ResponseError::new(
            StatusCode::BAD_REQUEST,
            "Password must contain at least 8 characters",
        ));
    }
    Ok(())
}
fn internal<E: std::fmt::Display>(error: E) -> ResponseError {
    tracing::error!(%error, "Rust authentication request failed");
    ResponseError::new(StatusCode::INTERNAL_SERVER_ERROR, "Internal server error")
}

pub struct ResponseError {
    pub(crate) status: StatusCode,
    pub(crate) message: String,
}
impl ResponseError {
    pub(crate) fn new(status: StatusCode, message: impl Into<String>) -> Self {
        Self {
            status,
            message: message.into(),
        }
    }
}
impl axum::response::IntoResponse for ResponseError {
    fn into_response(self) -> axum::response::Response {
        (
            self.status,
            Json(ErrorResponse {
                message: self.message,
                code: None,
            }),
        )
            .into_response()
    }
}
