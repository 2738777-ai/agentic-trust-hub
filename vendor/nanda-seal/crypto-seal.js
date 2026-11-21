/**
 * NandaSeal — Browser-Native Cryptographic Trust & MVP Profile 0.3 Conformance Engine
 * Zero dependencies. Works identically in modern browsers (Web Crypto API) and Node.js 20+.
 */

const subtle = globalThis.crypto.subtle;

export function canonicalizeJson(value) {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return '[' + value.map(canonicalizeJson).join(',') + ']';
  }
  const keys = Object.keys(value).sort();
  return (
    '{' +
    keys
      .filter((k) => value[k] !== undefined)
      .map((k) => JSON.stringify(k) + ':' + canonicalizeJson(value[k]))
      .join(',') +
    '}'
  );
}

export function bytesToHex(bytes) {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export function bytesToBase64Url(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function base64UrlToBytes(b64url) {
  const pad = '='.repeat((4 - (b64url.length % 4)) % 4);
  const b64 = (b64url + pad).replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

export async function sha256Hex(input) {
  const data = typeof input === 'string' ? new TextEncoder().encode(input) : input;
  const digest = await subtle.digest('SHA-256', data);
  return bytesToHex(new Uint8Array(digest));
}

export async function hashCanonicalObject(obj) {
  return sha256Hex(canonicalizeJson(obj));
}

export async function computeJwkFingerprint(publicJwk) {
  const thumbprintInput = {
    crv: publicJwk.crv,
    kty: publicJwk.kty,
    x: publicJwk.x,
    y: publicJwk.y,
  };
  const hex = await hashCanonicalObject(thumbprintInput);
  return 'sha256:' + hex.slice(0, 32);
}

export async function generatePublisherKeyPair() {
  const keyPair = await subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['sign', 'verify']
  );
  const publicJwk = await subtle.exportKey('jwk', keyPair.publicKey);
  const privateJwk = await subtle.exportKey('jwk', keyPair.privateKey);
  delete publicJwk.key_ops;
  delete publicJwk.ext;
  const fingerprint = await computeJwkFingerprint(publicJwk);
  return { publicJwk, privateJwk, fingerprint };
}

export async function signAgentFacts({
  siteOrigin,
  publisherName,
  manifest,
  network,
  privateJwk,
  publicJwk,
  ttlHours = 720,
  now = new Date(),
  specProfile = 'worldwide-agentic-web-mvp-0.3',
}) {
  const primaryNet = Array.isArray(manifest?.networks) ? manifest.networks[0] : null;
  const manifestSha256 = await hashCanonicalObject(manifest);
  const networkSha256 = await hashCanonicalObject(network);
  const keyFingerprint = await computeJwkFingerprint(publicJwk);
  const issuedAt = now.toISOString();
  const expiresAt = new Date(now.getTime() + ttlHours * 3600 * 1000).toISOString();

  const claims = {
    schema: 'nanda-seal/agent-facts/v1',
    spec_profile: specProfile,
    site_origin: siteOrigin,
    publisher: publisherName || manifest?.brand || 'Unknown Publisher',
    issued_at: issuedAt,
    expires_at: expiresAt,
    network_name: primaryNet?.name || 'unknown',
    front_man: primaryNet?.front_man || 'unknown',
    manifest_sha256: manifestSha256,
    network_sha256: networkSha256,
    peer_policy_mode: manifest?.peer_policy?.mode || 'unspecified',
    allowed_peers: Array.isArray(manifest?.allowed_peers) ? [...manifest.allowed_peers].sort() : [],
    key_fingerprint: keyFingerprint,
  };

  const privateKey = await subtle.importKey(
    'jwk',
    privateJwk,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );

  const payloadBytes = new TextEncoder().encode(canonicalizeJson(claims));
  const sigBuffer = await subtle.sign(
    { name: 'ECDSA', hash: { name: 'SHA-256' } },
    privateKey,
    payloadBytes
  );

  return {
    claims,
    proof: {
      alg: 'ES256',
      type: 'WebCrypto-ECDSA-P256-SHA256',
      public_key_jwk: publicJwk,
      signature_b64url: bytesToBase64Url(new Uint8Array(sigBuffer)),
    },
  };
}

export async function verifyAgentFacts({ facts, manifest, network, now = new Date() }) {
  const checks = [];
  if (!facts || !facts.claims || !facts.proof) {
    return {
      valid: false,
      status: 'MISSING_FACTS',
      checks: [{ id: 'facts_present', label: 'Signed AgentFacts artifact present', pass: false, detail: 'No agent-facts.signed.json provided.' }],
    };
  }

  const { claims, proof } = facts;

  // 1. Fingerprint matches JWK
  let fingerprintOk = false;
  let actualFp = '';
  try {
    actualFp = await computeJwkFingerprint(proof.public_key_jwk);
    fingerprintOk = actualFp === claims.key_fingerprint;
  } catch {
    fingerprintOk = false;
  }
  checks.push({
    id: 'key_fingerprint',
    label: 'Public JWK fingerprint matches claims',
    pass: fingerprintOk,
    detail: fingerprintOk ? actualFp : `Expected ${claims.key_fingerprint}, got ${actualFp || 'invalid JWK'}`,
  });

  // 2. Cryptographic signature check
  let sigOk = false;
  try {
    const pubKey = await subtle.importKey(
      'jwk',
      proof.public_key_jwk,
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['verify']
    );
    const payloadBytes = new TextEncoder().encode(canonicalizeJson(claims));
    const sigBytes = base64UrlToBytes(proof.signature_b64url);
    sigOk = await subtle.verify(
      { name: 'ECDSA', hash: { name: 'SHA-256' } },
      pubKey,
      sigBytes,
      payloadBytes
    );
  } catch {
    sigOk = false;
  }
  checks.push({
    id: 'crypto_signature',
    label: 'Web Crypto ECDSA P-256 signature valid',
    pass: sigOk,
    detail: sigOk ? 'Signature verified against canonical claims' : 'Cryptographic signature verification FAILED',
  });

  // 3. TTL check
  const expiresMs = Date.parse(claims.expires_at);
  const ttlOk = Number.isFinite(expiresMs) && now.getTime() <= expiresMs;
  checks.push({
    id: 'ttl_valid',
    label: 'Attestation TTL not expired',
    pass: ttlOk,
    detail: ttlOk ? `Valid until ${claims.expires_at}` : `Expired at ${claims.expires_at}`,
  });

  // 4. Live manifest SHA-256 integrity
  const liveManifestHash = await hashCanonicalObject(manifest);
  const manifestMatch = liveManifestHash === claims.manifest_sha256;
  checks.push({
    id: 'manifest_hash',
    label: 'Live agent-manifest.json hash matches signed claim',
    pass: manifestMatch,
    detail: manifestMatch
      ? `SHA-256 ${liveManifestHash.slice(0, 16)}...`
      : `TAMPER DETECTED: live ${liveManifestHash.slice(0, 12)}... != signed ${String(claims.manifest_sha256).slice(0, 12)}...`,
  });

  // 5. Live network SHA-256 integrity
  const liveNetworkHash = await hashCanonicalObject(network);
  const networkMatch = liveNetworkHash === claims.network_sha256;
  checks.push({
    id: 'network_hash',
    label: 'Live .network.json hash matches signed claim',
    pass: networkMatch,
    detail: networkMatch
      ? `SHA-256 ${liveNetworkHash.slice(0, 16)}...`
      : `TAMPER DETECTED: live ${liveNetworkHash.slice(0, 12)}... != signed ${String(claims.network_sha256).slice(0, 12)}...`,
  });

  // 6. Peer policy drift check
  const livePeers = Array.isArray(manifest?.allowed_peers) ? [...manifest.allowed_peers].sort() : [];
  const signedPeers = Array.isArray(claims.allowed_peers) ? [...claims.allowed_peers].sort() : [];
  const peersMatch =
    (manifest?.peer_policy?.mode || 'unspecified') === claims.peer_policy_mode &&
    JSON.stringify(livePeers) === JSON.stringify(signedPeers);
  checks.push({
    id: 'peer_policy_match',
    label: 'Peer-link policy unchanged since signing',
    pass: peersMatch,
    detail: peersMatch
      ? `mode=${claims.peer_policy_mode}, peers=${signedPeers.length}`
      : 'Peer policy or allowed_peers drifted after signing',
  });

  const valid = checks.every((c) => c.pass);
  let status = 'VERIFIED';
  if (!sigOk || !fingerprintOk) status = 'INVALID_SIGNATURE';
  else if (!manifestMatch || !networkMatch || !peersMatch) status = 'TAMPERED';
  else if (!ttlOk) status = 'EXPIRED';

  return {
    valid,
    status,
    checks,
    liveManifestHash,
    liveNetworkHash,
  };
}

const SUSPICIOUS_PATTERNS = [
  { re: /ignore\s+(all\s+)?previous\s+instructions/i, name: 'prompt-override' },
  { re: /exfiltrat|steal\s+(the\s+)?(api|router|user)?\s*key/i, name: 'key-exfiltration' },
  { re: /send\s+.*(api[_ -]?key|credential|token|secret)\s+to\s+https?:\/\//i, name: 'credential-leak' },
  { re: /eval\s*\(|new\s+Function\s*\(/i, name: 'dynamic-code-exec' },
];

export function auditSpecConformance(manifest, network) {
  const checks = [];
  const hasManifest = manifest && typeof manifest === 'object';
  const primaryNet = hasManifest && Array.isArray(manifest.networks) ? manifest.networks[0] : null;
  const tools = network && Array.isArray(network.tools) ? network.tools : [];

  checks.push({
    id: 'manifest_brand',
    label: 'Manifest declares brand & networks[]',
    pass: Boolean(hasManifest && manifest.brand && primaryNet && primaryNet.name && primaryNet.front_man),
    detail: primaryNet ? `${manifest.brand} -> ${primaryNet.name} (front_man: ${primaryNet.front_man})` : 'Missing brand or networks[0]',
  });

  checks.push({
    id: 'network_hocon_ref',
    label: 'Manifest points to resolved .network.json artifact',
    pass: Boolean(primaryNet?.hocon && String(primaryNet.hocon).endsWith('.json')),
    detail: primaryNet?.hocon || 'Missing hocon/network URL',
  });

  checks.push({
    id: 'front_man_exists',
    label: 'Declared front_man exists in network tools[]',
    pass: Boolean(primaryNet?.front_man && tools.some((t) => t.name === primaryNet.front_man)),
    detail: `${tools.length} agent(s) in network`,
  });

  const rawNetworkStr = network ? JSON.stringify(network) : '';
  const hasUnresolvedSubst = /\$\{[A-Z0-9_]+\}|^\s*include\s+"/m.test(rawNetworkStr);
  checks.push({
    id: 'data_only_resolved',
    label: 'Resolved data-only JSON (no unresolved ${ENV} or includes)',
    pass: Boolean(network && !hasUnresolvedSubst),
    detail: hasUnresolvedSubst ? 'Found unresolved ${ENV} substitution or include directive' : 'Clean portable JSON graph',
  });

  checks.push({
    id: 'byok_support',
    label: 'Pluggable inference / BYOK router configured',
    pass: Boolean(manifest?.llm_router?.base_url || manifest?.llm_router?.byok_router || manifest?.deployment?.direct_byok),
    detail: manifest?.llm_router?.base_url || 'No llm_router declared',
  });

  checks.push({
    id: 'peer_policy_declared',
    label: 'Explicit peer_policy & allowed_peers trust boundary',
    pass: Boolean(manifest?.peer_policy?.mode && Array.isArray(manifest?.allowed_peers)),
    detail: manifest?.peer_policy ? `mode=${manifest.peer_policy.mode}, allowed_peers=${(manifest.allowed_peers || []).length}` : 'Missing peer_policy',
  });

  checks.push({
    id: 'execution_limit',
    label: 'Execution timeout (max_execution_seconds) bounded',
    pass: Boolean(typeof network?.max_execution_seconds === 'number' && network.max_execution_seconds > 0 && network.max_execution_seconds <= 1200),
    detail: network?.max_execution_seconds ? `${network.max_execution_seconds}s` : 'Unbounded or missing max_execution_seconds',
  });

  checks.push({
    id: 'linking_protocol',
    label: 'Cross-site linking metadata (nsdeploy-link/v1)',
    pass: Boolean(manifest?.linking?.protocol && Array.isArray(manifest?.linking?.exports)),
    detail: manifest?.linking?.protocol || 'No linking metadata',
  });

  const hasActions = Boolean(hasManifest && manifest.actions && typeof manifest.actions === 'object');
  const bridgeValid =
    hasManifest &&
    (!hasActions ||
      (manifest.actions.version === 1 &&
        typeof manifest.actions.bridge === 'string' &&
        manifest.actions.bridge.trim().length > 0));
  checks.push({
    id: 'actions_bridge',
    label: 'Cross-site action bridge declared for actions[] (MVP 0.3)',
    pass: Boolean(bridgeValid),
    detail: !hasManifest
      ? 'Missing agent-manifest.json; cannot verify actions.bridge'
      : !hasActions
        ? 'No actions block declared; bridge not required'
        : bridgeValid
          ? `actions.version=1, bridge=${manifest.actions.bridge}`
          : 'Manifest declares actions without actions.bridge (required by MVP 0.3)',
  });

  // Static safety scan across all agent instructions
  const allInstructions = [
    network?.instructions_prefix || '',
    network?.aaosa_instructions || '',
    ...tools.map((t) => t.instructions || ''),
  ].join('\n');

  const hits = SUSPICIOUS_PATTERNS.filter((p) => p.re.test(allInstructions)).map((p) => p.name);
  checks.push({
    id: 'instruction_safety',
    label: 'Static prompt-injection & credential-exfiltration audit',
    pass: hits.length === 0,
    detail: hits.length === 0 ? '0 suspicious patterns across all agent instructions' : `Flagged: ${hits.join(', ')}`,
  });

  const passed = checks.filter((c) => c.pass).length;
  const score = Math.round((passed / checks.length) * 100);
  return { score, passed, total: checks.length, checks };
}
