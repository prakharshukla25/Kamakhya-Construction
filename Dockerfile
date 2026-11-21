# Public multi-architecture image digests verified against Docker Hub on 2026-11-15.
# Revisit these pins deliberately when updating security patches.
FROM python:3.14-alpine@sha256:5862d971d1f0ae26b258cefa4e893556b1d3aba81bd2ff30888704ad378bab67 AS builder

WORKDIR /site
COPY . .
RUN ["python3", "scripts/check.py"]
RUN ["python3", "scripts/build.py"]
RUN ["python3", "scripts/check.py", "--root", "dist"]

# NGINX 1.30.6; the upstream unprivileged image already runs as UID 101.
FROM nginx/nginx-unprivileged:stable-alpine@sha256:6b0610b60dff09248d642643a29393543a92eb355b00bbd1d12c7af562ef94c4 AS runtime

COPY nginx.conf /etc/nginx/nginx.conf
COPY --from=builder /site/dist/ /usr/share/nginx/html/
RUN ["nginx", "-t"]

EXPOSE 8080
STOPSIGNAL SIGQUIT
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 CMD ["curl", "--fail", "--silent", "--show-error", "http://127.0.0.1:8080/healthz"]

# Skip upstream entrypoint scripts that try to rewrite configuration at startup.
# All writable runtime paths in nginx.conf are under the /tmp tmpfs.
ENTRYPOINT ["nginx"]
CMD ["-g", "daemon off;"]
