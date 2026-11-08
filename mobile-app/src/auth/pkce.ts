import * as Crypto from 'expo-crypto';
import {expoDigest, Digest} from '../lib/hmac';
export function base64url(bytes:Uint8Array){
 const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';let result='',bits=0,value=0;
 for(const b of bytes){value=(value<<8)|b;bits+=8;while(bits>=6){bits-=6;result+=alphabet[(value>>>bits)&63]}}
 if(bits)result+=alphabet[(value<<(6-bits))&63];return result;
}
export async function codeChallenge(verifier:string,digest:Digest=expoDigest){return base64url(await digest('SHA256',new TextEncoder().encode(verifier)))}
export function createPKCE(){const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';let verifier='';while(verifier.length<64){for(const b of Crypto.getRandomBytes(96)){if(b<198&&verifier.length<64)verifier+=alphabet[b%66]}}return {verifier,state:base64url(Crypto.getRandomBytes(32))}}
export function parseCallback(url:string,expected:string){const p=new URL(url).searchParams;if(p.get('state')!==expected)throw Error('state inválido, posible CSRF');const code=p.get('code');if(!code)throw Error('Autorización sin código');return code;}
