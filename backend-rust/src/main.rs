use axum::{
    body::{to_bytes, Body},
    extract::State,
    http::{header, HeaderValue, Method, Request, StatusCode},
    middleware::{self, Next},
    response::{IntoResponse, Response},
    routing::{any, get},
    Json, Router,
};
use dotenvy::dotenv;
mod auth;
use auth::AuthConfig;
mod payment_links;
mod payments;
use redis::AsyncCommands;
use serde::Serialize;
use sqlx::{postgres::PgPoolOptions, PgPool};
use std::{env, net::SocketAddr, sync::Arc};
use tower_http::{
    cors::CorsLayer,
    request_id::{MakeRequestUuid, PropagateRequestIdLayer, SetRequestIdLayer},
    trace::TraceLayer,
};
use tracing::{info, warn};

#[derive(Clone)]
struct AppState {
    pool: PgPool,
    service_name: Arc<str>,
    upstream_api_url: Arc<str>,
    http_client: reqwest::Client,
    auth: AuthConfig,
    redis: Option<redis::Client>,
}

#[derive(Serialize)]
struct HealthResponse {
    status: &'static str,
    service: String,
    version: &'static str,
    timestamp: String,
}

#[derive(Serialize)]
struct ReadinessResponse {
    status: &'static str,
    checks: ReadinessChecks,
}

#[derive(Serialize)]
struct ReadinessChecks {
    database: DependencyCheck,
}

#[derive(Serialize)]
struct DependencyCheck {
    status: &'static str,
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenv().ok();
    init_tracing();

    let port = env::var("PORT")
        .unwrap_or_else(|_| "4000".into())
        .parse::<u16>()?;
    let database_url = env::var("DATABASE_URL")?;
    let service_name = env::var("SERVICE_NAME").unwrap_or_else(|_| "payment-links-api-rust".into());
    let upstream_api_url =
        env::var("UPSTREAM_API_URL").unwrap_or_else(|_| "http://localhost:4000".into());
    let auth = AuthConfig::from_env()?;
    let allowed_origins = parse_origins();
    let redis = env::var("REDIS_URL")
        .ok()
        .and_then(|url| match redis::Client::open(url) {
            Ok(client) => Some(client),
            Err(error) => {
                warn!(%error, "Redis configuration is invalid; continuing without cache");
                None
            }
        });

    let pool = PgPoolOptions::new()
        .max_connections(10)
        .connect(&database_url)
        .await?;

    let state = AppState {
        pool,
        service_name: service_name.into(),
        upstream_api_url: upstream_api_url.trim_end_matches('/').into(),
        http_client: reqwest::Client::new(),
        auth,
        redis,
    };

    let cors = CorsLayer::new()
        .allow_origin(allowed_origins)
        .allow_credentials(true)
        .allow_methods([
            Method::GET,
            Method::POST,
            Method::PATCH,
            Method::DELETE,
            Method::OPTIONS,
        ])
        .allow_headers([
            header::CONTENT_TYPE,
            header::AUTHORIZATION,
            header::HeaderName::from_static("x-csrf-token"),
        ])
        .expose_headers([header::HeaderName::from_static("x-request-id")]);

    let app = Router::new()
        .route("/api/health", get(health))
        .route("/api/health/ready", get(readiness))
        .merge(auth::router())
        .merge(payment_links::router())
        .merge(payments::router())
        .route("/api/{*path}", any(proxy_api_request))
        .layer(cors)
        .layer(PropagateRequestIdLayer::x_request_id())
        .layer(SetRequestIdLayer::x_request_id(MakeRequestUuid))
        .layer(TraceLayer::new_for_http())
        .layer(middleware::from_fn_with_state(state.clone(), rate_limit))
        .with_state(state);

    let address = SocketAddr::from(([0, 0, 0, 0], port));
    let listener = tokio::net::TcpListener::bind(address).await?;
    info!(%address, "Rust API listening");

    axum::serve(listener, app)
        .with_graceful_shutdown(shutdown_signal())
        .await?;

    Ok(())
}

async fn rate_limit(State(state): State<AppState>, request: Request<Body>, next: Next) -> Response {
    let path = request.uri().path();
    let Some((bucket, limit)) = rate_limit_bucket(path) else {
        return next.run(request).await;
    };

    let Some(redis) = &state.redis else {
        return next.run(request).await;
    };

    let client = request
        .headers()
        .get("x-forwarded-for")
        .or_else(|| request.headers().get("x-real-ip"))
        .and_then(|value| value.to_str().ok())
        .and_then(|value| value.split(',').next())
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .unwrap_or("unknown");
    let key = format!("paylink:rate:{bucket}:{client}");
    let mut connection = match redis.get_multiplexed_async_connection().await {
        Ok(connection) => connection,
        Err(error) => {
            tracing::warn!(%error, "Redis rate limiter unavailable; continuing without limit");
            return next.run(request).await;
        }
    };
    let count: i64 = match connection.incr(&key, 1_i64).await {
        Ok(count) => count,
        Err(error) => {
            tracing::warn!(%error, "Redis rate limiter failed; continuing without limit");
            return next.run(request).await;
        }
    };
    if count == 1 {
        let _: Result<bool, _> = connection.expire(&key, 60).await;
    }
    if count > limit {
        return (
            StatusCode::TOO_MANY_REQUESTS,
            [(header::RETRY_AFTER, "60")],
            Json(serde_json::json!({
                "message": "Too many requests. Please try again later.",
                "code": "RATE_LIMITED"
            })),
        )
            .into_response();
    }
    next.run(request).await
}

fn rate_limit_bucket(path: &str) -> Option<(&'static str, i64)> {
    if path == "/api/auth/login" || path == "/api/auth/register" {
        return Some(("auth", 10));
    }
    if path.ends_with("/pay") {
        return Some(("checkout", 20));
    }
    if path == "/api/payments/flutterwave/webhook" {
        return Some(("webhook", 60));
    }
    None
}

async fn proxy_api_request(
    State(state): State<AppState>,
    request: Request<Body>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let (parts, body) = request.into_parts();
    let query = parts
        .uri
        .path_and_query()
        .map(|value| value.as_str())
        .unwrap_or(parts.uri.path());
    let url = format!("{}{}", state.upstream_api_url, query);
    let body = to_bytes(body, 2 * 1024 * 1024)
        .await
        .map_err(|error| (StatusCode::BAD_REQUEST, error.to_string()))?;

    let mut upstream = state.http_client.request(parts.method, url).body(body);
    for (name, value) in &parts.headers {
        if matches!(
            name,
            &header::HOST | &header::CONTENT_LENGTH | &header::TRANSFER_ENCODING
        ) {
            continue;
        }
        upstream = upstream.header(name, value);
    }

    let response = upstream.send().await.map_err(|error| {
        (
            StatusCode::BAD_GATEWAY,
            format!("Rust API upstream unavailable: {error}"),
        )
    })?;
    let status = response.status();
    let headers = response.headers().clone();
    let body = response.bytes().await.map_err(|error| {
        (
            StatusCode::BAD_GATEWAY,
            format!("Unable to read upstream response: {error}"),
        )
    })?;
    let mut output = axum::response::Response::builder().status(status);

    for (name, value) in &headers {
        if matches!(name, &header::TRANSFER_ENCODING) {
            continue;
        }
        output = output.header(name, value);
    }

    output
        .body(Body::from(body))
        .map_err(|error| (StatusCode::INTERNAL_SERVER_ERROR, error.to_string()))
}

async fn health(State(state): State<AppState>) -> impl IntoResponse {
    Json(HealthResponse {
        status: "ok",
        service: state.service_name.to_string(),
        version: env!("CARGO_PKG_VERSION"),
        timestamp: chrono_like_timestamp(),
    })
}

async fn readiness(State(state): State<AppState>) -> impl IntoResponse {
    match sqlx::query("SELECT 1").execute(&state.pool).await {
        Ok(_) => (
            StatusCode::OK,
            Json(ReadinessResponse {
                status: "ready",
                checks: ReadinessChecks {
                    database: DependencyCheck { status: "ok" },
                },
            }),
        ),
        Err(error) => {
            warn!(%error, "database readiness check failed");
            (
                StatusCode::SERVICE_UNAVAILABLE,
                Json(ReadinessResponse {
                    status: "not_ready",
                    checks: ReadinessChecks {
                        database: DependencyCheck { status: "error" },
                    },
                }),
            )
        }
    }
}

fn parse_origins() -> Vec<HeaderValue> {
    env::var("ALLOWED_ORIGINS")
        .unwrap_or_else(|_| "http://localhost:3000".into())
        .split(',')
        .filter_map(|origin| origin.trim().parse().ok())
        .collect()
}

fn init_tracing() {
    tracing_subscriber::fmt()
        .with_env_filter(env::var("RUST_LOG").unwrap_or_else(|_| "info".into()))
        .json()
        .init();
}

fn chrono_like_timestamp() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let seconds = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_secs())
        .unwrap_or_default();
    seconds.to_string()
}

async fn shutdown_signal() {
    let ctrl_c = async {
        tokio::signal::ctrl_c()
            .await
            .expect("failed to install Ctrl+C handler");
    };

    #[cfg(unix)]
    let terminate = async {
        tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate())
            .expect("failed to install signal handler")
            .recv()
            .await;
    };

    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        _ = ctrl_c => {},
        _ = terminate => {},
    }
}
