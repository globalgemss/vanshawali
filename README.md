# Vanshawali 360 — Royal Premium V5 Demo

Independent Nepali genealogy and family communication UI prototype. Includes interactive family tree, profiles, branches, household, invitations, events, heritage, committee and digital passbook demo screens.

## Status

**Demonstration only.** Uses mock/local browser data. No production authentication, database, real private family records or live SMS/WhatsApp integration.

## Development

Requires Node.js >=22.13 and pnpm 11.25.0.

```bash
corepack enable
corepack prepare pnpm@11.25.0 --activate
pnpm install --frozen-lockfile
pnpm dev
```

## Cloudflare

This repository contains a Vinext-based Next.js app. Follow `CLOUDFLARE_DEPLOY_GUIDE_NEPALI.md` and build before deploying. Existing `deployment/cloudflare-deploy.mjs` deploys the generated Worker using Wrangler after building. Review the Cloudflare account, generated worker configuration and runtime before first publish.

## Security

Do not add real personal/family details to the public demo. Never commit `.env`, `.dev.vars`, API keys, tokens or credentials. If an actual live product is planned, add tenant-isolated backend, strong authentication, data privacy rules and authorization first.
