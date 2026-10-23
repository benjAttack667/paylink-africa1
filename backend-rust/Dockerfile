FROM rust:1.89-alpine AS builder
RUN apk add --no-cache musl-dev openssl-dev pkgconfig
WORKDIR /app
COPY Cargo.toml Cargo.lock* ./
COPY src ./src
RUN cargo build --release

FROM alpine:3.22
RUN apk add --no-cache ca-certificates libgcc
WORKDIR /app
COPY --from=builder /app/target/release/paylink-africa-api ./paylink-africa-api
USER 65532:65532
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 CMD wget -qO- http://127.0.0.1:4000/api/health || exit 1
CMD ["/app/paylink-africa-api"]
