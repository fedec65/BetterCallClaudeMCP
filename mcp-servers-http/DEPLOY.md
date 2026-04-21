# Deploying BetterCallClaude MCP HTTP Service to Railway

Step-by-step guide to deploy the HTTP MCP service, configure DNS, and verify all endpoints.

## 1. Prerequisites

- **Node.js >= 22** and npm
- **Railway account**: <https://railway.com> (free tier is sufficient)
- **DNS access** for `bettercallclaude.ch` (to create a CNAME record for `mcp.bettercallclaude.ch`)
- A successful local build of `mcp-servers-http/` (see next section)

## 2. Local Build Verification

```bash
cd mcp-servers-http
npm install
npm run build
```

Verify the bundle exists:

```bash
ls -lh dist/index.js
# Should be ~2 MB
```

### Smoke test

Start the server locally:

```bash
node dist/index.js &
SERVER_PID=$!
```

Health check:

```bash
curl -s http://localhost:3000/health | jq .
# Expected: { "status": "ok", "servers": 5, "serverNames": [...], "timestamp": "..." }
```

List tools on one endpoint (legal-citations):

```bash
curl -s http://localhost:3000/legal-citations/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "mcp-protocol-version: 2025-03-26" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | jq .
```

You should see a JSON-RPC response listing 8 tools (validate_citation, format_citation, etc.).

Stop the server:

```bash
kill $SERVER_PID
```

## 3. Install Railway CLI

```bash
npm install -g @railway/cli
```

Authenticate (opens browser):

```bash
railway login
```

Verify installation:

```bash
railway --version
```

## 4. Create Railway Project and Deploy

From the `mcp-servers-http/` directory:

```bash
cd mcp-servers-http
railway init
```

Choose a project name (e.g., `bettercallclaude-mcp`) when prompted.

Deploy:

```bash
railway up
```

Railway automatically detects the `Dockerfile` and `railway.toml` in this directory. It will:

1. Build the Docker image using the `Dockerfile` (copies `dist/` into a `node:22-slim` container)
2. Apply settings from `railway.toml` (health check on `/health`, restart on failure, max 3 retries)
3. Set the `PORT` environment variable automatically

> **Note**: The `Dockerfile` only copies `dist/` — no source code or `node_modules` reach the container. The service runs as `node dist/index.js` which reads `PORT` from the environment.

Open the Railway dashboard to monitor deployment:

```bash
railway open
```

### Generate a Railway domain

```bash
railway domain
```

This creates a free `*.up.railway.app` subdomain. Note the URL — you'll use it for initial verification.

## 5. Verify Railway Deployment

Replace `YOUR_APP.up.railway.app` with the domain from the previous step.

Health check:

```bash
curl -s https://YOUR_APP.up.railway.app/health | jq .
```

Test each MCP endpoint with `tools/list`:

```bash
for server in bge-search entscheidsuche fedlex-sparql legal-citations onlinekommentar; do
  echo "=== $server ==="
  curl -s "https://YOUR_APP.up.railway.app/$server/mcp" \
    -H "Content-Type: application/json" \
    -H "Accept: application/json, text/event-stream" \
    -H "mcp-protocol-version: 2025-03-26" \
    -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | jq '.result.tools | length'
  echo
done
```

Expected tool counts:
| Server | Tools |
|--------|-------|
| bge-search | 2 |
| entscheidsuche | 6 |
| fedlex-sparql | 5 |
| legal-citations | 8 |
| onlinekommentar | 3 |

## 6. Custom Domain Setup (mcp.bettercallclaude.ch)

### Add the domain in Railway

Via CLI:

```bash
railway domain mcp.bettercallclaude.ch
```

Or via dashboard: **Settings > Networking > + Custom Domain** and enter `mcp.bettercallclaude.ch`.

Railway will display a CNAME target in the format `*.up.railway.app`.

### Configure DNS

At your DNS provider for `bettercallclaude.ch`, create a CNAME record:

| Type | Name | Target |
|------|------|--------|
| CNAME | `mcp` | `<value from Railway>.up.railway.app` |

### SSL and verification

- Railway auto-provisions a **Let's Encrypt** certificate (RSA 2048-bit, 90-day, auto-renewed)
- DNS propagation is typically minutes but can take up to 72 hours
- Watch for a **green check** next to the domain in the Railway dashboard

## 7. Final Verification (Production)

Once DNS has propagated and the green check appears:

```bash
curl -s https://mcp.bettercallclaude.ch/health | jq .
```

Test all 5 endpoints:

```bash
for server in bge-search entscheidsuche fedlex-sparql legal-citations onlinekommentar; do
  echo "=== $server ==="
  curl -s "https://mcp.bettercallclaude.ch/$server/mcp" \
    -H "Content-Type: application/json" \
    -H "Accept: application/json, text/event-stream" \
    -H "mcp-protocol-version: 2025-03-26" \
    -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | jq '.result.tools | length'
  echo
done
```

Live tool call test (validate a citation):

```bash
curl -s https://mcp.bettercallclaude.ch/legal-citations/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "mcp-protocol-version: 2025-03-26" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "validate_citation",
      "arguments": { "citation": "BGE 147 IV 73" }
    }
  }' | jq .
```

## 8. Push the Knowledge-Work-Plugins PR Update

The commit updating `.mcp.json` to use HTTP URLs is already prepared on the `add-bettercallclaude-plugin` branch in the `knowledge-work-plugins` fork.

```bash
cd knowledge-work-plugins
git push --force-with-lease origin add-bettercallclaude-plugin
```

Verify PR [#88](https://github.com/anthropics/knowledge-work-plugins/pull/88) now shows a small diff (~8K lines instead of ~347K) with no compiled JavaScript bundles.

## 9. Monitoring and Troubleshooting

### Viewing logs

Dashboard: click your service in Railway, select the **Deployments** tab.

CLI:

```bash
railway logs
```

### Common issues

| Issue | Cause | Fix |
|-------|-------|-----|
| Health check fails | Port mismatch | The service reads `PORT` from env. Railway sets this automatically. Do not hardcode a port in Railway settings. |
| `ECONNREFUSED` on deploy | Build failed | Check `railway logs`. Ensure `dist/index.js` is committed and included in the Docker image. |
| Custom domain not working | DNS not propagated | Wait up to 72h. Use `dig mcp.bettercallclaude.ch CNAME` to check propagation. |
| SSL certificate pending | DNS not yet verified | The certificate is issued only after Railway verifies DNS ownership. |
| 429 Too Many Requests | Rate limit hit | The service enforces 60 requests/minute per IP. Back off and retry. |

### Redeploying after changes

```bash
cd mcp-servers-http
npm run build
railway up
```
