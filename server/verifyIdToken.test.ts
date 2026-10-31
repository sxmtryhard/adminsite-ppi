import { describe, expect, it } from 'vitest';
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from 'jose';
import { verifyFirebaseIdToken } from './appointmentMail.js';

const PROJECT = 'adminsite-test';

const setup = async () => {
  const { publicKey, privateKey } = await generateKeyPair('RS256');
  const jwk = { ...(await exportJWK(publicKey)), kid: 'k1', alg: 'RS256' };
  const keys = createLocalJWKSet({ keys: [jwk] });
  const sign = (claims: Record<string, unknown> = {}, opts: { iss?: string; aud?: string; exp?: string } = {}) =>
    new SignJWT({ auth_time: Math.floor(Date.now() / 1000) - 60, ...claims })
      .setProtectedHeader({ alg: 'RS256', kid: 'k1' })
      .setSubject('user-1')
      .setIssuer(opts.iss ?? `https://securetoken.google.com/${PROJECT}`)
      .setAudience(opts.aud ?? PROJECT)
      .setIssuedAt()
      .setExpirationTime(opts.exp ?? '1h')
      .sign(privateKey);
  return { keys, sign };
};

describe('verificación del ID token de Firebase', () => {
  it('acepta un token válido y devuelve el uid', async () => {
    const { keys, sign } = await setup();
    await expect(verifyFirebaseIdToken(await sign(), PROJECT, keys)).resolves.toBe('user-1');
  });

  it('rechaza tokens de otro proyecto, otro emisor o vencidos', async () => {
    const { keys, sign } = await setup();
    await expect(verifyFirebaseIdToken(await sign({}, { aud: 'otro' }), PROJECT, keys)).rejects.toThrow();
    await expect(verifyFirebaseIdToken(await sign({}, { iss: 'https://evil.example' }), PROJECT, keys)).rejects.toThrow();
    await expect(verifyFirebaseIdToken(await sign({}, { exp: '-1h' }), PROJECT, keys)).rejects.toThrow();
  });

  it('rechaza tokens firmados con otra clave o sin firma', async () => {
    const { keys } = await setup();
    const other = await setup();
    await expect(verifyFirebaseIdToken(await other.sign(), PROJECT, keys)).rejects.toThrow();
    const unsigned = `${Buffer.from('{"alg":"none"}').toString('base64url')}.${Buffer.from(`{"sub":"x","aud":"${PROJECT}"}`).toString('base64url')}.`;
    await expect(verifyFirebaseIdToken(unsigned, PROJECT, keys)).rejects.toThrow();
  });

  it('rechaza un auth_time en el futuro', async () => {
    const { keys, sign } = await setup();
    await expect(verifyFirebaseIdToken(await sign({ auth_time: Math.floor(Date.now() / 1000) + 3600 }), PROJECT, keys)).rejects.toThrow();
  });
});
