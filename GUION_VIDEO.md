# Guion del video — 2 minutos y 30 segundos

El enunciado propone un **video opcional de respaldo de 60 a 90 segundos**, centrado en PKCE y Modo Avión. Esta versión de **2:30**, solicitada para la entrega, añade los cinco escenarios de aceptación y la renovación de sesión. Al final hay una versión de 90 segundos.

Los textos entre comillas son para narrar. Las indicaciones de pantalla no se leen. Los tiempos incluyen las acciones y las pausas; ensaya con cronómetro para ajustar tu velocidad.

## Antes de grabar

1. Sigue la instalación del [README](README.md). Arranca el backend con `ACCESS_TTL_SECONDS=15` y puerto `8010`; configura la misma URL en la app.
2. Abre `/mfa/enroll` en el computador y enrola **la misma semilla demo** en la app y Google Authenticator. Usa hora automática en los dispositivos. La semilla demo es `JBSWY3DPEHPK3PXP`.
3. Deja Expo Go y la pantalla del autenticador cargados antes de desconectarte. Durante la prueba offline no recargues la app ni abras una función que requiera la API.
4. Deja la app sin sesión institucional para grabar el inicio de sesión. El enrolamiento del autenticador puede estar preparado desde antes.
5. Ten listo el registro del backend para mostrar los estados HTTP. En la prueba de renovación, comprueba `401`, una sola llamada a `POST /auth/refresh` y los reintentos `200`. El resumen de la pantalla Perfil no cuenta las llamadas reales de renovación: respalda esa afirmación con el registro.
6. Graba la pantalla del teléfono y, mediante un recuadro o una segunda cámara, Google Authenticator y el registro del backend cuando corresponda. Usa únicamente las cuentas demo.

## 0:00–0:10 — Presentación

**Pantalla:** bienvenida de la app; título con tu nombre y el del proyecto.

**Narración:**

> “Presento nuestro laboratorio de seguridad móvil, desarrollado con React Native y FastAPI. Voy a demostrar autenticación con PKCE, códigos TOTP sin conexión y acceso protegido con segundo factor.”

## 0:10–0:40 — OAuth con PKCE

**Acción:** pulsa **Iniciar Sesión Institucional**. Muestra el navegador del sistema, usa **Rellenar credenciales demo**, completa el login y deja visible el regreso a la app.

**Narración:**

> “El inicio de sesión abre el navegador del sistema. La app genera un verificador aleatorio y su desafío SHA-256. Al regresar por deep link, verifica el parámetro state contra ataques CSRF. Después intercambia el código y el verificador por los tokens de sesión.”

**Apoyo visual breve:** `mobile-app/src/auth/pkce.ts` y la función `login` de `mobile-app/src/auth/AuthContext.tsx`, con el desafío, la validación de `state` y `openAuthSessionAsync` resaltados. Prepara el recuadro antes de editar el video.

## 0:40–1:00 — Tokens y renovación silenciosa

**Acción:** entra a **Perfil**. Deja pasar al menos 16 segundos desde la última respuesta que emitió tokens y pulsa **Lanzar 5 Peticiones Simultáneas**. Muestra los resultados y el registro del backend. Si al entrar a Perfil se renovó el token, cuenta la espera desde esa renovación.

**Narración:**

> “El token de acceso permanece en memoria y el de renovación se guarda en SecureStore. Con la sesión vencida, cinco peticiones comparten una sola renovación y se reintentan sin pedir otro inicio de sesión.”

**Resultado que debes capturar:** respuestas `200` y una única llamada a `/auth/refresh` para ese grupo de peticiones. Ajusta el corte al resultado real de tu grabación.

## 1:00–1:15 — Paridad con Google Authenticator

**Acción:** abre el autenticador propio y muestra al lado Google Authenticator, ambos con la misma semilla y en el mismo instante.

**Narración:**

> “Con la misma semilla, nuestra app y Google Authenticator muestran los mismos seis dígitos. El cálculo implementa HMAC-SHA1 y truncamiento dinámico, sin librerías de alto nivel de TOTP.”

## 1:15–1:50 — Prueba real en Modo Avión

**Acción:** activa Modo Avión y comprueba que **Wi-Fi y datos móviles estén apagados**; algunos teléfonos conservan Wi-Fi al activar Modo Avión. Regresa al autenticador y mantén una toma continua hasta que el contador llegue a cero y cambie el código. Reserva los últimos segundos para recuperar la conexión antes de abrir la bóveda.

**Narración al principio:**

> “Activo Modo Avión y apago Wi-Fi. El código se calcula con la semilla y el reloj del teléfono. Mantengo la toma hasta que termina la ventana de treinta segundos y aparece el siguiente código, sin conexión.”

**Pausa:** deja ver el contador y la actualización. No cortes ni aceleres la espera que demuestra el funcionamiento offline.

**Narración al reconectar:**

> “Restauro la conexión para validar el segundo factor en el servidor.”

## 1:50–2:15 — Step-Up y bóveda

**Acción:** abre **Bóveda** con sesión sin elevar. Muestra `403 Forbidden` y el modal. Pulsa **Autocompletar desde mi autenticador UniSabana**; este botón genera y envía el código automáticamente. Muestra la bóveda abierta y `200 OK`.

**Narración:**

> “La bóveda rechaza la sesión normal con un 403 y exige segundo factor. Envío el TOTP: el servidor lo valida y devuelve un token elevado con mfa_verified. Ahora permite consultar el recurso protegido. Iniciar sesión por sí solo no concede acceso a la bóveda.”

## 2:15–2:25 — Protección Anti-Replay

**Acción:** pulsa inmediatamente **Ejecutar Prueba de Ataque de Repetición**. Captura `409` y **Replay Attack Detected**. Conserva esta acción seguida de la validación anterior, preferiblemente dentro de la misma ventana de 30 segundos.

**Narración:**

> “Reenvío el mismo código recién utilizado. El servidor responde 409: detectó la repetición y bloqueó su reutilización.”

## 2:25–2:30 — Cierre

**Pantalla:** resultado Anti-Replay y enlace del repositorio.

**Narración:**

> “El repositorio incluye la app, el backend y las instrucciones para reproducir las pruebas.”

**Enlace:** https://github.com/rubxo/taller-totp

## Versión de 90 segundos según el enunciado

| Tiempo | Qué mostrar | Qué decir |
| --- | --- | --- |
| 0:00–0:05 | Bienvenida y título. | “Demostramos PKCE y un autenticador TOTP propio que funciona sin conexión.” |
| 0:05–0:35 | Login completo en navegador del sistema y regreso a la app; recuadro del código PKCE. | “La app genera un verificador y un desafío SHA-256. Abre el navegador del sistema y regresa por deep link. Valida state y envía el código junto con el verificador. El servidor comprueba PKCE antes de emitir tokens. El token de acceso queda en memoria y el de renovación en SecureStore.” |
| 0:35–0:45 | App y Google Authenticator simultáneos. | “Con la misma semilla, ambos autenticadores generan el mismo código mediante HMAC-SHA1 y truncamiento dinámico.” |
| 0:45–1:20 | Modo Avión, Wi-Fi apagado y toma continua hasta la actualización del código. | “Desactivo la conectividad. El contador llega a cero y el código cambia utilizando solamente la semilla y la hora del teléfono.” Después, deja correr la toma. |
| 1:20–1:30 | Nuevo código y enlace del repositorio. | “La actualización sin conexión demuestra el cálculo local de TOTP. El repositorio contiene la aplicación, el backend y los pasos para ejecutar el laboratorio.” |

## Alcance de este guion

Este documento prepara la demostración; no sustituye una grabación ni acredita resultados en el teléfono. Narra las respuestas y los códigos que realmente aparezcan durante tu ensayo. Si la misma ventana TOTP ya se consumió en un ensayo anterior, espera una nueva ventana antes de volver a abrir la bóveda.
