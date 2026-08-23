#!/usr/bin/env node
/**
 * Generate V4 signed read URLs for VRT diff images on the private GCS bucket,
 * so surface-to-pr.sh can embed them in the sticky PR comment (GitHub's image
 * proxy fetches them anonymously; the objects are never world-readable).
 *
 * Signing is keyless: the job's Workload Identity Federation credentials (the
 * ADC file that login-to-gcs leaves behind) can't sign directly — they carry no
 * key and no client email — so we wrap them in an Impersonated client targeting
 * the bucket's service account, which signs via the IAM signBlob API. That SA
 * grants us tokenCreator in grafana/deployment_tools (terraform/repositories/
 * design). Unlike `gcloud storage sign-url`, which caps keyless signing at 12 h,
 * the storage library allows the full V4 maximum of 7 days. Caveat: Google only
 * *guarantees* signBlob signatures for 12 h (the signing key is Google-managed
 * and rotates); in practice URLs live out their term, and a dead thumbnail is
 * cosmetic — a workflow re-run re-signs everything.
 *
 * Input: object keys (bucket-relative paths) as argv. Env: VRT_GCS_BUCKET,
 * VRT_SIGNER_SA, and ambient Google ADC.
 * Output: one signed URL per line on stdout, in argv order.
 */
// google-auth-library MUST stay within @google-cloud/storage's own dependency
// range (^9): Storage recognizes the injected client via instanceof, so a
// second copy of the library from a different major silently fails the check
// and Storage falls back to ADC — which can't sign (NO_CREDENTIALS_FOUND).
import { Storage } from '@google-cloud/storage';
import { GoogleAuth, Impersonated } from 'google-auth-library';

const bucketName = process.env.VRT_GCS_BUCKET;
const signerSa = process.env.VRT_SIGNER_SA;
const keys = process.argv.slice(2);

if (!bucketName || !signerSa) {
  console.error('sign-urls: VRT_GCS_BUCKET and VRT_SIGNER_SA are required');
  process.exit(1);
}
if (keys.length === 0) {
  console.error('sign-urls: no object keys given');
  process.exit(1);
}

const sourceClient = await new GoogleAuth().getClient();
const authClient = new Impersonated({
  sourceClient,
  targetPrincipal: signerSa,
  targetScopes: ['https://www.googleapis.com/auth/devstorage.read_only'],
});
const bucket = new Storage({ authClient }).bucket(bucketName);

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000; // the V4 signed-URL maximum

const urls = await Promise.all(
  keys.map(async (key) => {
    const [url] = await bucket.file(key).getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + SEVEN_DAYS_MS,
    });
    return url;
  }),
);

process.stdout.write(urls.join('\n') + '\n');
console.error(`sign-urls: signed ${urls.length} URL(s) as ${signerSa}`);
