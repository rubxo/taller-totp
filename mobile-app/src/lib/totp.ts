import type {Account} from '../types';
import {hmac, type Digest} from './hmac';
import {base32Bytes} from './otpauth';
export async function generateTotp(account:Account,nowMs=Date.now(),digest?:Digest){const counter=Math.floor(nowMs/1000/account.period);const msg=new Uint8Array(8);for(let i=7,n=counter;i>=0;i--,n=Math.floor(n/256))msg[i]=n&255;const hash=await hmac(base32Bytes(account.secret),msg,account.algorithm,digest);const off=hash[hash.length-1]&15;const bin=((hash[off]&127)<<24)|(hash[off+1]<<16)|(hash[off+2]<<8)|hash[off+3];const code=String(bin%10**account.digits).padStart(account.digits,'0');return {code,remainingMs:account.period*1000-(nowMs%(account.period*1000))};}
