# Laboratorio: Seguridad Móvil — OAuth 2.0 PKCE, Almacenamiento Criptográfico y Step-Up 2FA (TOTP)

**Curso:** Desarrollo Móvil (React Native)  
**Institución:** Universidad de La Sabana — Facultad de Ingeniería  
**Sesión:** Sesión 14 (Autenticación Móvil, Tokens y Seguridad de Recursos)

---

## 1. Resumen de Arquitectura y Cumplimiento

Este proyecto implementa una arquitectura de seguridad móvil completa para clientes públicos sin librerías "caja negra":

1. **OAuth 2.0 con PKCE (RFC 7636):**
   - Generación criptográfica de `code_verifier` de 64 caracteres de alta entropía.
   - Cálculo de `code_challenge` SHA-256 codificado en Base64URL sin relleno.
   - Uso de `WebBrowser.openAuthSessionAsync` para abrir el navegador seguro del sistema operativo (sin WebViews embebidas vulnerables).
   - Manejo de Deep Linking (`unisabana-auth://oauth/callback` y soporte Expo Go).
   - Verificación estricta de parámetro `state` anti-CSRF.
   - Intercambio seguro en `POST /auth/oauth/token` con verificación de hash en el backend.

2. **Almacenamiento Seguro Nativo & Silent Refresh Queue:**
   - **Separación estricta de memoria:** `access_token` vive únicamente en memoria RAM volátil (`useRef`), destruyéndose al matar el proceso.
   - `refresh_token` duradero persistido en el enclave seguro nativo de hardware (`expo-secure-store` con `WHEN_UNLOCKED_THIS_DEVICE_ONLY` en iOS Keychain / Android Keystore).
   - Interceptor HTTP (`src/api/client.ts`) que ante respuestas `401 Unauthorized` retiene y encola las peticiones concurrentes, ejecuta una única llamada a `POST /auth/refresh`, actualiza el token en memoria y reintenta las peticiones transparentemente.

3. **Módulo Authenticator Propio (RFC 6238):**
   - **Cero librerías de alto nivel** (sin `otplib` ni `speakeasy`).
   - Implementación manual de HMAC-SHA1 (RFC 2104) con `ipad` (`0x36`) y `opad` (`0x5c`) + utilidades de hashing nativas.
   - Ventana de tiempo $T = \lfloor \text{UnixTimestamp} / 30 \rfloor$ en entero de 64 bits Big-Endian (8 bytes).
   - Truncamiento dinámico para extracción de código de 6 dígitos.
   - **100% Offline / Modo Avión:** cálculo matemático puramente local en el dispositivo.
   - Ingesta de semillas mediante escaneo QR con `expo-camera` (`otpauth://totp/...`) y entrada manual con validador Base32 en tiempo real.
   - UI con tipografía monoespaciada grande (`34px`), temporizador circular SVG (`CountdownRing`), barra de progreso con alerta cromática de urgencia (Azul $\to$ Ámbar $\to$ Rojo) y respuesta háptica.

4. **Step-Up Authentication & Anti-Replay:**
   - Recurso crítico (`GET /api/boveda-critica`): responde `403 Forbidden` (`error: "mfa_required"`, con `step_up_token`) si no se cuenta con elevación de privilegios.
   - Endpoint de verificación (`POST /auth/mfa/verify`): valida contra ventanas temporales $C-1$, $C$ y $C+1$ (tolerancia a desfase de reloj).
   - **Caché Anti-Replay:** almacena los códigos consumidos con TTL de 90s; si se intenta reutilizar el mismo código en la misma ventana, el backend responde `409 Conflict: Replay Attack Detected`.
   - Emisión de `elevated_token` con el claim `mfa_verified: true` (TTL de 10 minutos).

---

## 2. Puesta en Marcha

### Requisitos Previos
- Node.js (v18+)
- Python 3.12+ con entorno virtual en `backend-auth/.venv`
- Dispositivo móvil con **Expo Go** (SDK 58) o Emulador Android / Simulador iOS
- Teléfono y computador conectados a la misma red Wi-Fi (para pruebas en dispositivo físico)

---

### Terminal 1: Backend de Autenticación (FastAPI)

```bash
cd backend-auth
ACCESS_TTL_SECONDS=15 .venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000
```

> **Credenciales de demostración:**
> - Correo: `estudiante@unisabana.edu.co`
> - Contraseña: `sabana2026`
> - Semilla TOTP Demo: `JBSWY3DPEHPK3PXP`

- Portal de inicio de sesión: `http://localhost:8000/oauth/authorize`
- Pantalla de enrolamiento QR: `http://localhost:8000/mfa/enroll`

---

### Terminal 2: Aplicación Móvil (React Native / Expo)

```bash
cd mobile-app
npx expo start --lan
```

- Escanea el código QR desde la app **Expo Go** en tu celular.
- *Nota:* Si el computador tiene una IP específica en la red local (ej. `192.168.20.27`), puedes pasarla directamente:
  ```bash
  EXPO_PUBLIC_API_URL=http://192.168.20.27:8000 npx expo start --lan
  ```
- La app también cuenta con un botón en la pantalla de bienvenida para inspeccionar y ajustar la URL del backend en caliente.

> **Optimizaciones añadidas para iOS / iPhone 16 en Expo Go:**
> - **Input 2FA de 6 Celdas Visuales:** Cajas independientes de dígitos que eliminan fallos de fuentes monoespaciadas y espaciado de texto en iOS.
> - **Enrolamiento MFA UniSabana:** Botón de 1 toque para enrolar la cuenta localmente sin requerir un segundo dispositivo, además de botón para abrir `/mfa/enroll` en Safari.
> - **Bloqueo con Face ID / PIN:** Renderizado como Overlay Modal nativo en la raíz para evitar bucles de navegación; soporte para Face ID y longitudes de PIN de 4 a 6 dígitos con auto-limpieza.
> - **Respaldos Cifrados (.totp):** Modales dedicados de exportación e importación con Scrypt + AES-256-GCM y `expo-file-system/legacy`, sin depender de `Alert.prompt`.

---

## 3. Protocolo de las 5 Pruebas de Aceptación (Sustentación en Vivo)

| # | Prueba de Aceptación | Procedimiento en la App | Resultado Esperado |
| :- | :--- | :--- | :--- |
| **1** | **Flujo OAuth + PKCE con Navegador del Sistema** | En la pantalla de bienvenida, presionar **«Iniciar Sesión Institucional»**. El sistema abre el navegador nativo (no WebView). Presionar *«Rellenar credenciales demo»* y enviar. | El navegador redirige mediante deep link a la app móvil, se valida el parámetro `state` anti-CSRF, se intercambia el código por tokens y el `refresh_token` queda guardado en `SecureStore`. |
| **2** | **Paridad Estándar TOTP** | Abrir `http://<IP>:8000/mfa/enroll` en el computador. Escanear el QR con **Google Authenticator** oficial y en la app con **«Escanear QR»** (o usar la opción *«Cargar Cuenta UniSabana Demo»*). | Ambas aplicaciones muestran exactamente los mismos 6 dígitos al mismo tiempo. |
| **3** | **Cálculo Offline en Modo Avión** | Activar el **Modo Avión** del teléfono. Ir al módulo *«Autenticador TOTP»*, esperar a que el contador de 30s llegue a 0 y observar la actualización. | El código se actualiza matemáticamente en tiempo real sin conexión a internet y sin peticiones de red. |
| **4** | **Step-Up Authentication & Bóveda** | Entrar a *«Bóveda Crítica»*. La app captura el `403 Forbidden` (`mfa_required`) y abre el modal 2FA. Presionar *«Autocompletar desde mi autenticador UniSabana»* y confirmar. | El servidor verifica el TOTP y devuelve un `elevated_token` con `mfa_verified: true`, desbloqueando el expediente confidencial. |
| **5** | **Ataque de Repetición (Anti-Replay)** | Inmediatamente tras desbloquear la bóveda, presionar **«Ejecutar Prueba de Ataque de Repetición»** para reenviar el mismo código. | El backend rechaza la solicitud con **`409 Conflict: Replay Attack Detected`**, impidiendo el reuso del código en la misma ventana de tiempo. |

---

## 4. Ejecución de la Suite de Pruebas Automatizadas

```bash
# 1. Pruebas de Backend (FastAPI, PKCE, rotación de tokens, ventanas TOTP, Anti-Replay):
cd backend-auth
.venv/bin/pytest -v

# 2. Verificación de Tipos TypeScript (Móvil):
cd mobile-app
npx tsc --noEmit

# 3. Pruebas Unitarias de Frontend (Jest - HMAC, TOTP RFC 6238, PKCE, Silent Refresh Queue, Respaldo AES-GCM):
cd mobile-app
npm test

# 4. Compilación del Bundle de Producción de Android:
cd mobile-app
npx expo export --platform android
```

---

## 5. Estructura del Repositorio

```
.
├── backend-auth/
│   ├── app/
│   │   ├── main.py          # Servidor FastAPI, endpoints OAuth, PKCE, Step-Up y Anti-Replay
│   │   └── totp.py          # Algoritmo TOTP de referencia RFC 6238
│   ├── tests/
│   │   └── test_auth.py     # Suite de 10 pruebas automatizadas con TestClient
│   └── requirements.txt     # Dependencias de Python
├── mobile-app/
│   ├── app/
│   │   ├── welcome.tsx      # Pantalla de bienvenida institucional e inicio OAuth
│   │   ├── authenticator.tsx# Autenticador TOTP offline (Modo Avión)
│   │   ├── lock.tsx         # Pantalla de bloqueo por PIN / biometría
│   │   ├── settings.tsx     # Ajustes de privacidad, PIN y respaldos cifrados
│   │   ├── (app)/
│   │   │   ├── home.tsx     # Tablero principal de módulos
│   │   │   ├── boveda.tsx   # Bóveda protegida con Step-Up 2FA y prueba Anti-Replay
│   │   │   └── perfil.tsx   # Ficha de arquitectura de memoria y prueba de Silent Refresh
│   │   ├── add/
│   │   │   ├── manual.tsx   # Alta manual de cuenta con validación Base32
│   │   │   └── scan.tsx     # Escáner de código QR con expo-camera
│   │   └── account/[id].tsx # Detalle y edición de cuenta
│   ├── src/
│   │   ├── api/client.ts    # Cliente HTTP con Silent Refresh Queue ante 401
│   │   ├── auth/
│   │   │   ├── AuthContext.tsx # Contexto de autenticación y manejo de sesión
│   │   │   └── pkce.ts      # Generador PKCE S256 y validador de callback
│   │   ├── components/
│   │   │   ├── AccountRow.tsx   # Fila de cuenta con código, barra de urgencia y copia
│   │   │   ├── CountdownRing.tsx# Anillo regresivo SVG con cambio de color
│   │   │   └── PinPad.tsx       # Teclado numérico interactivo con haptics
│   │   ├── lib/
│   │   │   ├── hmac.ts      # HMAC-SHA1 RFC 2104 desde cero
│   │   │   ├── totp.ts      # Algoritmo TOTP RFC 6238 propio (Modo Avión)
│   │   │   ├── otpauth.ts   # Parser de URIs y decodificador Base32 propio
│   │   │   ├── storage.ts   # Almacenamiento seguro de cuentas
│   │   │   ├── lock.ts      # Lógica de PIN y biometría en SecureStore
│   │   │   └── backup.ts    # Respaldo cifrado con AES-256-GCM + Scrypt
│   │   └── theme/colors.ts  # Paleta de diseño institucional UniSabana
│   └── __tests__/           # 21 pruebas unitarias Jest
└── README.md
```
