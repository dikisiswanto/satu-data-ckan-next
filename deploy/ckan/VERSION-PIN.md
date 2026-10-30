# CKAN deployment version pins

- CKAN base image: `ckan/ckan-base:2.12.1`.
- CKAN Solr configuration image: `ckan/ckan-solr:2.12-solr9`.
- Public protocol: CKAN 2.12 Action API under `/api/3/action` (native `Package`, `Resource`, `Organization`, `Group`, and `Tag` objects).
- Compose source: official `ckan/ckan-docker`, fetched by `bootstrap-upstream.sh`; it is not vendored into this application package.
- The bootstrap updates the official `ckan/Dockerfile` base image pin and removes the Python 3.10 `site_packages` bind/volume mount because CKAN 2.12 uses the Python 3.14 base-image line.
- Ingress: pinned `caddy:2.11.7-alpine`; Cloudflare Tunnel connector `cloudflare/cloudflared:2026.10.5`. These are separately pinned from CKAN and should be updated intentionally after verifying current upstream tags.

Do not upgrade CKAN, its Solr image, Python-path assumptions, plugins, or PostgreSQL compatibility independently. Before changing a pin, verify the official CKAN Docker guidance, run the complete Compose config/build/smoke tests, and verify a backup restore. Official references:

- https://github.com/ckan/ckan-docker-base
- https://github.com/ckan/ckan-docker
- https://github.com/ckan/ckan-solr
- https://docs.ckan.org/en/2.12/maintaining/installing/

## Patch-version security note

Deployment pins `ckan/ckan-base:2.12.1`, as selected for this project. Keep the public Action API facade read-only and narrowly allowlisted even with the patched image: the portal only needs bounded catalog search, package detail, public resource metadata/downloads, and paginated DataStore reads. Confirm the image exists and build successfully in the target registry/network before production rollout (`docker pull ckan/ckan-base:2.12.1`, then build the upstream Compose image). A release tag is not treated as runtime validation until the exact deployment image and full stack pass smoke tests.

Security advisory tracking: https://github.com/ckan/ckan/security/advisories/GHSA-34rr-qrr4-397f
