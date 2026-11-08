export type Algorithm = 'SHA1' | 'SHA256' | 'SHA512';
export type Account = { id:string; issuer:string; label:string; secret:string; algorithm:Algorithm; digits:6|8; period:number };
