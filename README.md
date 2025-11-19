# 3D Management Platform

Estrutura completa para backend FastAPI, frontend React/Tailwind, banco PostgreSQL e proxy seguro.

## Estrutura de pastas
- `backend/`: API FastAPI com autenticação JWT, rate limit, integração Moonraker e WebSocket de timeline.
- `backend/migrations/`: SQL inicial para criar tabelas exigidas.
- `frontend/`: Interface React/Tailwind consumindo a API real.
- `docker-compose.yml`: Orquestra PostgreSQL, pgAdmin, backend, frontend e Nginx (HTTP/HTTPS). Use Cloudflare Tunnel apontando para a porta 8080/8443 do Nginx para acesso remoto seguro.
- `nginx.conf`: Reverse proxy com HTTPS (certificado snake-oil padrão, substitua pelo seu certificado real).

## Como rodar com Docker
```
docker compose up --build
```
Backend: `http://localhost:8000` (API), Frontend: `http://localhost:5173`, Proxy: `http://localhost:8080` / `https://localhost:8443`.
Credenciais iniciais: `admin@local` / `admin123` (ajuste via variáveis de ambiente `ADMIN_EMAIL`/`ADMIN_PASSWORD`).
