# ESP8266 AT: HTTPS GET prototype (`/api/device`)

Use this to verify **TLS to Vercel** before relying on the Uno sketch. Connect a USB–serial adapter to the ESP8266 (3.3 V logic), 9600 or 115200 8N1, send commands ending with `CR+LF`.

## Preconditions

- Firmware: **AT** (not Arduino sketch on ESP).
- Single connection: `AT+CIPMUX=0`
- Station mode: `AT+CWMODE=1`
- Join Wi-Fi: `AT+CWJAP="SSID","PASSWORD"` until you see `WIFI GOT IP`.

## SSL buffer (many AT versions)

```text
AT+CIPSSLSIZE=4096
```

## Open SSL connection

Replace host if you use another deployment:

```text
AT+CIPSTART="SSL","adruino-weather-web.vercel.app",443
```

Expect `CONNECT` / `OK` (exact wording depends on AT build).

## HTTP request

Adjust `Host` if needed.

```text
AT+CIPSEND=86
```

After the `>` prompt, send (single line breaks `\r\n`):

```http
GET /api/device HTTP/1.1
Host: adruino-weather-web.vercel.app
Connection: close

```

You should receive `+IPD` chunks then a JSON body starting with `{"v":1,`. Close: `AT+CIPCLOSE`.

## If SSL fails

- Update AT firmware to a build with **TLS 1.2** and adequate root CAs for Vercel.
- Confirm the hostname matches your deployment (typos: `adruino` vs `arduino` in the URL).

## Note on production URL

The `/api/device` route is served by the Next.js app in this monorepo. It appears on your Vercel URL **after** you deploy a build that includes this route.
