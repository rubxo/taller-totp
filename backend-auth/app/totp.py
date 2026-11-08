import base64
import hashlib
import hmac
import struct
import time


def totp(secret, counter=None):
    counter = int(time.time() // 30) if counter is None else counter
    key = base64.b32decode(secret + '=' * (-len(secret) % 8))
    digest = hmac.new(key, struct.pack('>Q', counter), hashlib.sha1).digest()
    offset = digest[-1] & 15
    return str((int.from_bytes(digest[offset:offset+4], 'big') & 0x7fffffff) % 1000000).zfill(6)
