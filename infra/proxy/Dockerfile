# Caddy reverse proxy with the shared Caddyfile baked in.
# Used by docker-compose.coolify.yml, where a bind mount of ./Caddyfile
# is not possible (see the proxy service comment there). The primary
# stack keeps bind-mounting the same Caddyfile from the checkout.
FROM caddy:2-alpine
COPY Caddyfile /etc/caddy/Caddyfile
