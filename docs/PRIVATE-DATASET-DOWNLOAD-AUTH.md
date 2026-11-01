# Private dataset access and downloads through Next.js

Last reviewed: 1 November 2026

## Correct authorization model

The portal uses CKAN as the authorization authority. The browser forwards only the configured CKAN Flask session cookie to Next.js; Next.js forwards that cookie to the internal CKAN service. Presence of a cookie is never accepted as a grant. CKAN must return a successful, non-cached `package_show`/`package_search` result for that exact session before a private dataset is exposed.

Important CKAN 2.12 boundary: CKAN core `resource_show` authorization delegates to `package_show` for the resource's parent dataset. It does **not** establish a separate per-resource private ACL. Therefore, a custom `resource.private` field/marker cannot be authorized by calling `resource_show` a second time. The portal now fails closed for truthy legacy/custom markers on `resource.private` and `file.private` regardless of whether a cookie is present. The shared `isPrivateMarker` normalizer handles boolean, numeric, and string forms (`true`, `1`, `yes`, `on`, `private`) without mistaking the string `false` for a private marker. Those markers are hidden from package detail/search output. If per-resource privacy becomes a requirement, implement it in a CKAN extension with a real resource schema field and explicit `IAuthFunctions` authorization for `resource_show`, DataStore, views, previews, and download; only then should the portal recognize that permission.

## Download paths

### Native dataset/resource download

1. Next.js reads only the configured `wajo_ckan_session` cookie from the incoming request.
2. It calls CKAN `resource_show` and validates the exact resource ID, active state, and `resource.package_id`.
3. It calls CKAN `package_show` using the same session and validates the exact parent package, active state, and requested slug/id. A private package is accepted only if CKAN returned it successfully for the forwarded session.
4. It validates the resource URL pathname against the exact CKAN dataset/resource download shape. The original URL host is never fetched; the validated path is requested against `CKAN_API_INTERNAL_URL`.
5. The CKAN native dataset/resource download view performs its own CKAN permission checks. A 401/403/404 response is normalized to a quiet 404; unexpected upstream failures remain 502.

The embedded `package_show.result.resources` array is metadata, not a third authorization gate. Its omission of a resource summary must not create a false 404 after CKAN has authorized the resource and parent package.

### Generic FileStore download

1. Next.js calls `file_show`, then accepts only explicit owner metadata for `resource` or `package`.
2. A resource-owned file must match the exact requested resource ID; a package-owned file must match the exact parent package ID. Unknown, missing, editorial-media, user, group, and organization owner types fail closed in the generic dataset proxy.
3. CKAN `resource_show`/`package_show` checks establish access to the owning dataset. The deployment config explicitly sets `ckan.files.owner.cascade_access` to include `resource` and `package`, so CKAN FileStore owner authorization follows the matching CKAN entity permissions. The portal never treats `file_show` alone as proof of download permission.
4. Next.js requests CKAN `/file/download/<id>` with the same CKAN session cookie. CKAN executes the final `permission_download_file` check. A CKAN 401/403/404/410 response is normalized to 404.

The dedicated editorial-media proxy remains separate and uses its own fixed owner, MIME, byte-size, and image-signature checks. The Wajo `IFiles` hook grants public `show` only to the dedicated `wajo_media/public-editorial-media` owner; it does not grant write/delete or relax resource/package owners.

## Session and domain requirements

The browser can send a CKAN session cookie to both CKAN Admin and the portal only when `PUBLIC_HOST` and `CKAN_HOST` are sibling hosts under the same registrable parent domain and the cookie is configured for that parent. Example valid pair: `data.silirdev.com` + `ckan.silirdev.com`. Example invalid pair: `data.silirdev.com` + `ckan.wajokab.go.id`. Browsers do not send cookies across those unrelated domains; this cannot be repaired by trusting a session cookie that Next.js never receives.

After changing cookie name/domain or hostnames, recreate CKAN and Next.js, log out of CKAN Admin, then log in again. In browser DevTools, verify that the portal request includes the cookie name `wajo_ckan_session`; never copy/share its value. `sync-env.py` rejects mismatched parent zones by design.

Parent-domain cookies are sent to every subdomain in that zone. Every such subdomain must be trusted and maintained with equivalent security controls. The portal forwards only the configured CKAN session cookie to the internal CKAN origin; it does not forward arbitrary browser cookies, API tokens, or session values to external origins.

## Regression coverage added

The unit tests now cover:

- authorized CKAN session can read/download a dataset marked private when CKAN accepts `package_show`;
- anonymous and invalid sessions remain unable to read private datasets;
- the same authorized private-dataset resource can be downloaded when `package_show.resources` omits its embedded summary;
- a custom `resource.private` marker is denied even when a CKAN session is present;
- FileStore owner must be exactly `resource` or `package`, with a matching owner ID;
- FileStore final 401/403/404/410 responses are normalized to 404;
- legacy string-valued private markers are fail-closed; the string `false` is not misclassified;
- all download-byte responses use `private, no-store`, including currently public files, to prevent stale CDN/browser copies after visibility is tightened; cookie values are never logged.

## Deployment verification still required

Unit tests and static checks cannot prove the production browser's cookie scope or the live CKAN user's permissions. After deployment:

1. Confirm `PUBLIC_HOST` and `CKAN_HOST` are sibling subdomains under the same parent.
2. Log out/in to CKAN Admin after cookie configuration changes.
3. In DevTools → Network, verify the portal download request includes the configured cookie **name**. Do not share its value.
4. Test one dataset that the admin account is authorized to read, one dataset not authorized to that user, and the same requests without a session.
5. Test FileStore downloads separately because CKAN's final `permission_download_file` can deny a download even when `file_show` succeeds.

Never change a private dataset to public as a workaround for a session/domain configuration problem.
