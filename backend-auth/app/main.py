import base64
import hashlib
import html
import io
import os
import re
import secrets
import threading
import time
from urllib.parse import urlencode

import jwt
import qrcode
import qrcode.image.svg
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, RedirectResponse
from .totp import totp

app = FastAPI(title="UniSabana Auth API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
KEY = os.getenv('JWT_SECRET') or secrets.token_hex(32)
SECRET = os.getenv('TOTP_SECRET', 'JBSWY3DPEHPK3PXP')
USER = 'estudiante@unisabana.edu.co'
CLIENT = 'unisabana-mobile'
codes, refreshes, revoked, used = {}, {}, set(), {}
mutex = threading.RLock()


def fail(status, detail):
    raise HTTPException(status, detail)


def challenge(verifier):
    return base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).decode().rstrip('=')


def validate(p):
    uri = p.get('redirect_uri', '')
    if p.get('client_id') != CLIENT or not (re.fullmatch(r'unisabana-auth://(?:--/)?oauth/callback', uri) or re.fullmatch(r'exp://[A-Za-z0-9.\-]+(?::\d+)?/--/oauth/callback', uri)):
        fail(400, 'Cliente o redirect inválido')
    if p.get('response_type') != 'code' or p.get('code_challenge_method') != 'S256' or not re.fullmatch(r'[A-Za-z0-9_-]{43}', p.get('code_challenge', '')) or not re.fullmatch(r'[A-Za-z0-9_-]{32,128}', p.get('state', '')):
        fail(400, 'Parámetros PKCE/state inválidos')


@app.get('/oauth/authorize', response_class=HTMLResponse)
def authorize(request: Request):
    p = dict(request.query_params)
    validate(p)
    fields = ''.join(f'<input type="hidden" name="{html.escape(k)}" value="{html.escape(v, quote=True)}">' for k, v in p.items())
    return f'''<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>UniSabana · Iniciar Sesión</title>
  <style>
    * {{ box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }}
    body {{ background: linear-gradient(135deg, #0a192f 0%, #172a45 100%); min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; color: #1e293b; }}
    .card {{ background: #ffffff; border-radius: 20px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.4); max-width: 440px; width: 100%; overflow: hidden; }}
    .header {{ background: #002b49; color: #fff; padding: 32px 28px; text-align: center; border-bottom: 4px solid #c41230; }}
    .header h1 {{ font-size: 24px; font-weight: 800; letter-spacing: -0.5px; }}
    .header p {{ font-size: 13px; color: #94a3b8; margin-top: 6px; }}
    .badge {{ display: inline-block; background: rgba(255,255,255,0.12); padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 600; margin-top: 10px; color: #60a5fa; letter-spacing: 0.5px; }}
    .body {{ padding: 28px; }}
    .demo-box {{ background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 12px 16px; margin-bottom: 20px; font-size: 12px; color: #166534; }}
    .demo-box strong {{ display: block; margin-bottom: 4px; font-size: 13px; color: #14532d; }}
    .demo-btn {{ background: #dcfce7; border: 1px solid #86efac; color: #15803d; border-radius: 6px; padding: 4px 10px; font-size: 11px; font-weight: 700; cursor: pointer; margin-top: 6px; }}
    .form-group {{ margin-bottom: 18px; }}
    label {{ display: block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 6px; }}
    input[type="email"], input[type="password"] {{ width: 100%; padding: 14px 16px; border: 1.5px solid #cbd5e1; border-radius: 10px; font-size: 15px; transition: border-color 0.2s; outline: none; }}
    input[type="email"]:focus, input[type="password"]:focus {{ border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37,99,235,0.15); }}
    .submit-btn {{ width: 100%; background: #002b49; color: #ffffff; padding: 15px; border: none; border-radius: 10px; font-size: 15px; font-weight: 700; cursor: pointer; transition: background 0.2s; margin-top: 10px; }}
    .submit-btn:hover {{ background: #003e6b; }}
    .footer {{ text-align: center; font-size: 11px; color: #64748b; margin-top: 20px; }}
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>Universidad de La Sabana</h1>
      <p>Portal de Identidad Institucional Móvil</p>
      <span class="badge">OAuth 2.0 · PKCE S256 · RFC 7636</span>
    </div>
    <div class="body">
      <div class="demo-box">
        <strong>Credenciales de Demostración:</strong>
        <div>Usuario: <code>estudiante@unisabana.edu.co</code></div>
        <div>Clave: <code>sabana2026</code></div>
        <button type="button" class="demo-btn" onclick="fillDemo()">Rellenar credenciales demo</button>
      </div>
      <form method="post" id="loginForm">
        {fields}
        <div class="form-group">
          <label for="email">Correo Institucional</label>
          <input id="email" name="email" type="email" placeholder="estudiante@unisabana.edu.co" required autofocus>
        </div>
        <div class="form-group">
          <label for="password">Contraseña</label>
          <input id="password" name="password" type="password" placeholder="••••••••" required>
        </div>
        <button type="submit" class="submit-btn">Iniciar Sesión Segura</button>
      </form>
      <div class="footer">
        Facultad de Ingeniería · Seguridad Móvil (Sesión 14)
      </div>
    </div>
  </div>
  <script>
    function fillDemo() {{
      document.getElementById('email').value = 'estudiante@unisabana.edu.co';
      document.getElementById('password').value = 'sabana2026';
    }}
  </script>
</body>
</html>'''


@app.post('/oauth/authorize')
async def login(request: Request):
    p = dict(await request.form())
    validate(p)
    if p.get('email') != USER or p.get('password') != 'sabana2026':
        fail(401, 'Credenciales incorrectas')
    code = secrets.token_urlsafe(32)
    codes[code] = {**p, 'expires': time.time()+60}
    return RedirectResponse(p['redirect_uri'] + '?' + urlencode({'code': code, 'state': p['state']}), status_code=302)


def token(kind='access', mfa=False, ttl=None):
    ttl = ttl if ttl is not None else int(os.getenv('ACCESS_TTL_SECONDS', '300'))
    return jwt.encode({'sub': USER, 'typ': kind, 'mfa_verified': mfa, 'iat': int(time.time()), 'exp': int(time.time())+ttl, 'jti': secrets.token_hex(16)}, KEY, algorithm='HS256')


def session(family=None):
    raw = secrets.token_urlsafe(48)
    refreshes[hashlib.sha256(raw.encode()).hexdigest()] = {'family': family or secrets.token_hex(16), 'expires': time.time()+30*86400, 'rotated': False}
    return {'access_token': token(), 'refresh_token': raw, 'token_type': 'Bearer', 'expires_in': int(os.getenv('ACCESS_TTL_SECONDS', '300'))}


@app.post('/auth/oauth/token')
def exchange(p: dict):
    with mutex:
        c = codes.pop(p.get('code', ''), None)
        verifier = p.get('code_verifier', '')
        if not c or c['expires'] < time.time() or p.get('grant_type') != 'authorization_code' or p.get('client_id') != c['client_id'] or p.get('redirect_uri') != c['redirect_uri'] or not re.fullmatch(r'[A-Za-z0-9._~-]{43,128}', verifier) or not secrets.compare_digest(challenge(verifier), c['code_challenge']):
            fail(400, 'Código o PKCE inválido')
        return session()


@app.post('/auth/refresh')
def refresh(p: dict):
    with mutex:
        record = refreshes.get(hashlib.sha256(str(p.get('refresh_token', '')).encode()).hexdigest())
        if not record:
            fail(401, 'Refresh inválido')
        if record['rotated']:
            revoked.add(record['family'])
        if record['rotated'] or record['expires'] < time.time() or record['family'] in revoked:
            fail(401, 'Familia revocada o refresh vencido')
        record['rotated'] = True
        return session(record['family'])


def decode(raw, kinds):
    try:
        data = jwt.decode(raw, KEY, algorithms=['HS256'])
        if data['typ'] not in kinds or data['sub'] != USER:
            raise ValueError()
        return data
    except (jwt.PyJWTError, KeyError, ValueError):
        fail(401, 'Token inválido o vencido')


def bearer(request):
    return decode(request.headers.get('authorization', '').removeprefix('Bearer '), ['access', 'elevated'])


@app.get('/api/perfil')
def profile(request: Request):
    bearer(request)
    return {'email': USER, 'nombre': 'Estudiante UniSabana'}


@app.get('/api/boveda-critica')
def vault(request: Request):
    data = bearer(request)
    if not data['mfa_verified']:
        from fastapi.responses import JSONResponse
        return JSONResponse({'error': 'mfa_required', 'step_up_token': token('step_up', ttl=300)}, status_code=403)
    return {'documento': 'Datos sensibles de demostración', 'mfa_verified': True}


@app.post('/auth/mfa/verify')
def verify(p: dict):
    decode(p.get('step_up_token', ''), ['step_up'])
    code = p.get('code', '')
    with mutex:
        now = time.time()
        for key, expiry in list(used.items()):
            if expiry <= now:
                del used[key]
        counter = int(now // 30)
        matches = [c for c in range(counter-1, counter+2) if secrets.compare_digest(totp(SECRET, c), str(code))]
        if not matches:
            fail(401, 'Código incorrecto')
        if any((USER, c) in used for c in matches) or (USER, code) in used:
            fail(409, 'Replay Attack Detected')
        for c in matches:
            used[USER, c] = now+90
        used[USER, code] = now+90
        return {'elevated_token': token('elevated', True, 600)}


@app.get('/mfa/enroll', response_class=HTMLResponse)
def enroll():
    uri = f'otpauth://totp/UniSabana:{USER}?secret={SECRET}&issuer=UniSabana'
    image = qrcode.make(uri, image_factory=qrcode.image.svg.SvgPathImage)
    output = io.BytesIO()
    image.save(output)
    svg_data = output.getvalue().decode()
    return f'''<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>UniSabana · Enrolamiento MFA TOTP</title>
  <style>
    * {{ box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }}
    body {{ background: linear-gradient(135deg, #0a192f 0%, #172a45 100%); min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px; color: #1e293b; }}
    .card {{ background: #ffffff; border-radius: 24px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); max-width: 480px; width: 100%; overflow: hidden; }}
    .header {{ background: #002b49; color: #fff; padding: 28px; text-align: center; border-bottom: 4px solid #c41230; }}
    .header h1 {{ font-size: 22px; font-weight: 800; }}
    .header p {{ font-size: 13px; color: #94a3b8; margin-top: 6px; }}
    .badge {{ display: inline-block; background: rgba(255,255,255,0.12); padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 600; margin-top: 10px; color: #34d399; letter-spacing: 0.5px; }}
    .body {{ padding: 28px; text-align: center; }}
    .qr-container {{ background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 16px; padding: 20px; display: inline-block; margin-bottom: 20px; max-width: 260px; width: 100%; }}
    .qr-container svg {{ width: 100%; height: auto; display: block; }}
    .secret-box {{ background: #f1f5f9; border-radius: 12px; padding: 14px; margin-bottom: 20px; text-align: left; }}
    .secret-label {{ font-size: 12px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }}
    .secret-value {{ font-family: monospace; font-size: 18px; font-weight: 700; color: #002b49; letter-spacing: 2px; word-break: break-all; }}
    .instructions {{ text-align: left; font-size: 13px; color: #475569; line-height: 1.6; border-top: 1px solid #e2e8f0; padding-top: 18px; }}
    .instructions li {{ margin-bottom: 6px; margin-left: 18px; }}
    .footer {{ text-align: center; font-size: 11px; color: #64748b; margin-top: 20px; }}
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>Enrolamiento de Segundo Factor (2FA)</h1>
      <p>Configuración de Semilla Criptográfica RFC 6238</p>
      <span class="badge">Paridad Google Authenticator 100%</span>
    </div>
    <div class="body">
      <div class="qr-container">
        {svg_data}
      </div>
      <div class="secret-box">
        <div class="secret-label">Clave Secreta Base32 (Entrada Manual)</div>
        <div class="secret-value">{SECRET}</div>
      </div>
      <div class="instructions">
        <strong>Instrucciones para la prueba:</strong>
        <ol>
          <li>Escanea este QR con <strong>Google Authenticator</strong> en tu celular.</li>
          <li>Escanea el mismo QR con el <strong>Autenticador de la App UniSabana</strong> (o introduce la clave manual).</li>
          <li>Verifica que ambos muestren exactamente los mismos 6 dígitos al unísono.</li>
        </ol>
      </div>
      <div class="footer">
        Facultad de Ingeniería · Seguridad Móvil (Sesión 14)
      </div>
    </div>
  </div>
</body>
</html>'''
