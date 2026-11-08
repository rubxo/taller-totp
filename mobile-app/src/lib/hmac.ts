import * as Crypto from 'expo-crypto';
import type {Algorithm} from '../types';
export type Digest = (algorithm: Algorithm, bytes: Uint8Array) => Promise<Uint8Array>;
export const expoDigest: Digest = async (algorithm, bytes) => new Uint8Array(await Crypto.digest(({SHA1:Crypto.CryptoDigestAlgorithm.SHA1,SHA256:Crypto.CryptoDigestAlgorithm.SHA256,SHA512:Crypto.CryptoDigestAlgorithm.SHA512})[algorithm], new Uint8Array(bytes)));
export async function hmac(key: Uint8Array, message: Uint8Array, algorithm: Algorithm, digest: Digest = expoDigest) {
  const size = algorithm === 'SHA512' ? 128 : 64;
  if (key.length > size) key = await digest(algorithm, key);
  const inner = new Uint8Array(size + message.length), outer = new Uint8Array(size + (algorithm === 'SHA1' ? 20 : algorithm === 'SHA256' ? 32 : 64));
  for (let i=0;i<size;i++) { inner[i]=(key[i]||0)^0x36; outer[i]=(key[i]||0)^0x5c; }
  inner.set(message,size); outer.set(await digest(algorithm,inner),size);
  return digest(algorithm,outer);
}
