# Agente WhatsApp (local)

Agente de WhatsApp que se conecta a un numero real usando Baileys (WhatsApp Web,
sin la API de Meta ni Twilio) y responde con un modelo de lenguaje a traves de
OpenRouter. Incluye un dashboard local hecho con Next.js para ver las
conversaciones, intervenir de forma manual y cambiar cada chat entre modo IA
(responde el bot) y modo Humano (respondes tu desde el dashboard).

Todo corre en localhost. Los datos se guardan en SQLite (`./data/messages.db`) y
la sesion de WhatsApp en la carpeta `./auth/`.

## Requisitos

- Node.js 20 o superior (recomendado 22). Comprueba tu version con `node -v`.
- Una cuenta de OpenRouter (https://openrouter.ai) con su API key.
- Un telefono con WhatsApp para escanear el codigo QR.

Nota sobre Windows y better-sqlite3: este proyecto usa better-sqlite3 v12, que
trae binarios precompilados. No hace falta instalar Visual Studio Build Tools.

## Instalacion

Instala las dependencias:

```bash
npm install
```

Crea tu archivo de variables de entorno a partir del ejemplo:

```bash
cp .env.example .env.local
```

Edita `.env.local` con tus datos:

```
OPENROUTER_API_KEY=sk-or-...
OPENROUTER_MODEL=openai/gpt-4o-mini
```

Sobre el modelo: se recomienda `openai/gpt-4o-mini`. Los modelos con sufijo
`:free` de OpenRouter tienen limites muy estrictos (alrededor de 50 peticiones
al dia sin creditos) y fallan con error 429 en uso real. El modelo gpt-4o-mini
cuesta unos centavos al mes para un volumen normal.

## Uso en desarrollo

Se necesitan dos procesos: el bot y el dashboard.

```bash
# Terminal 1: el bot de WhatsApp
npm run start:bot

# Terminal 2: el dashboard
npm run dev
```

Pasos:

1. Abre http://localhost:3000.
2. Veras la pantalla "Conectar numero" con un codigo QR.
3. En tu telefono: WhatsApp, Dispositivos vinculados, Vincular un dispositivo, y
   escanea el QR.
4. Al conectar, la pantalla pasa sola al dashboard.

La sesion queda guardada en `./auth/`. En reinicios posteriores del bot no se
vuelve a pedir el QR mientras la sesion siga activa.

El QR principal se escanea desde el navegador. En la terminal del bot tambien se
imprime un QR en modo texto como respaldo para depurar.

## Como funciona

- Mensaje entrante: se guarda en SQLite. Si el chat esta en modo IA, el bot
  llama al modelo con el historial reciente mas el system prompt y responde. Si
  esta en modo Humano, solo se guarda y no responde.
- Mensaje humano (escrito desde el dashboard): se guarda y se pone en la cola
  `outbox`. El proceso del bot la revisa cada 2 segundos y lo envia por
  WhatsApp. El bot y el dashboard son procesos separados y no comparten memoria,
  asi que la base de datos es el canal de comunicacion entre ambos.
- Interruptor IA / Humano por chat, arriba del panel derecho.
- Borrado de la conversacion con confirmacion.
- Desconexion del numero desde la barra superior (borra la sesion y vuelve al
  QR).

## Personalizar el bot

El system prompt esta en:

```
src/lib/system-prompt.ts
```

Ahi pones las instrucciones de tu negocio: tono, que puede y que no puede hacer,
cuando derivar a una persona, etc.

## Despliegue en produccion (EasyPanel o Nixpacks, sin Docker)

1. El `Procfile` usa `web: npm run start:all`, que levanta el bot y la web
   juntos.
2. El archivo `nixpacks.toml` fija Node 22 y las herramientas de build.
3. Volumenes persistentes obligatorios: monta `/app/data` y `/app/auth`. Sin
   ellos, cada nuevo despliegue pierde las conversaciones y obliga a volver a
   escanear el QR.

Aviso de seguridad importante: el dashboard NO tiene autenticacion. Si lo
expones a internet, cualquiera con la URL podra leer todas tus conversaciones de
WhatsApp y enviar mensajes haciendose pasar por ti. Antes de exponerlo, pon
autenticacion basica a nivel de proxy (EasyPanel, Caddy o Nginx) o usa
Cloudflare Access. Esto es un requisito bloqueante para produccion.

## Solucion de problemas

- El QR no aparece: asegurate de que `npm run start:bot` este corriendo.
  Reinicialo si lleva mas de 10 segundos sin generar el QR.
- Bucle con `code=440` (connectionReplaced): en tu telefono, borra los
  dispositivos vinculados de pruebas anteriores. Si sigue, cambia la IP del
  servidor o espera unas horas.
- `code=405`: la version de WhatsApp Web esta desactualizada. El bot ya descarga
  la ultima version al arrancar, asi que reinicialo.
- Error `429` del modelo: estas usando un modelo `:free` saturado. Cambia
  `OPENROUTER_MODEL` a `openai/gpt-4o-mini`.
- Procesos colgados en Windows: si Ctrl+C no cierra el bot, busca el proceso con
  `tasklist | findstr node` y cierralo con `taskkill /PID <pid> /F`.

## Mejoras pendientes (v2)

- Envio de imagenes salientes (por ejemplo fotos de productos).
- Function calling real con las tools de OpenRouter.
- Cambio automatico a modo Humano cuando el bot dice una frase concreta
  (deteccion por expresion regular en `handler.ts`).
- WebSocket en lugar de polling.
- Autenticacion basica integrada en Next.js (middleware).

## Stack

Next.js 16, React 19, TypeScript, Tailwind 4, @whiskeysockets/baileys,
better-sqlite3, OpenRouter (con el SDK de openai), pino, qrcode, tsx y
concurrently.
