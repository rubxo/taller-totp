import {createHash,createHmac} from 'node:crypto';
import {hmac, Digest} from '../src/lib/hmac';
import {base32Bytes,parseOtpAuth} from '../src/lib/otpauth';
const digest:Digest=async(a,b)=>new Uint8Array(createHash(a.toLowerCase()).update(b).digest());
test.each([
 ['SHA1',20,'b617318655057264e28bc0b6fb378c8ef146be00'],
 ['SHA256',20,'b0344c61d8db38535ca8afceaf0bf12b881dc200c9833da726e9376c2e32cff7'],
 ['SHA512',20,'87aa7cdea5ef619d4ff0b4241a1d6cb02379f4e2ce4ec2787ad0b30545e17cde daa833b7d6b8a702038b274eaea3f4e4be9d914eeb61f1702e696c203a126854'.replace(/ /g,'')],
] as const)('RFC HMAC %s',async(a,n,expected)=>expect(Buffer.from(await hmac(new Uint8Array(n).fill(11),new TextEncoder().encode('Hi There'),a,digest)).toString('hex')).toBe(expected));
test('base32 y URI',()=>{expect(Buffer.from(base32Bytes('JBSWY3DPEHPK3PXP')).toString('hex')).toBe('48656c6c6f21deadbeef');expect(parseOtpAuth('otpauth://totp/UniSabana:estudiante@unisabana.edu.co?secret=JBSWY3DPEHPK3PXP&issuer=UniSabana').label).toBe('estudiante@unisabana.edu.co')});
test.each(['SHA1','SHA256','SHA512'] as const)('HMAC clave larga %s',async(a)=>{const key=new Uint8Array(200).fill(170),msg=new TextEncoder().encode('RFC long key');expect(Buffer.from(await hmac(key,msg,a,digest)).toString('hex')).toBe(createHmac(a.toLowerCase(),key).update(msg).digest('hex'))});
