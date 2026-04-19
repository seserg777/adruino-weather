# Arduino weather station firmware

Targets **Arduino Uno R3**, **ESP8266** (AT firmware, e.g. ESP-01), **I2C LCD 1602** (PCF8574 backpack). Polls **`GET /api/device`** on the deployed base URL (compact JSON from `@repo/weather-core`).

## Prerequisites

1. **Arduino IDE** or **PictoBlox** (or any tool that uploads a `.ino` to Uno).
2. Libraries (Arduino Library Manager):
   - **ArduinoJson** by Benoit Blanchon (v6.x)
   - **LiquidCrystal I2C** by Frank de Brabander (often `LiquidCrystal_I2C`)
3. **secrets**: copy `secrets.h.example` to `secrets.h` and set `WIFI_SSID` / `WIFI_PASSWORD`. `secrets.h` is gitignored.

## UART speed

The sketch uses **9600 baud** on `SoftwareSerial` for robust reception on Uno. If your ESP8266 defaults to 115200, either:

- Reconfigure the module once (e.g. `AT+UART_DEF=9600,8,1,0,3`) via serial, **or**
- Change `ESP_SERIAL_BAUD` in the sketch to match the module (115200 may be unreliable on `SoftwareSerial`).

## PictoBlox

Use a mode that allows **custom `.ino`** / **Arduino C++** so you can keep this sketch in sync with the repo. Flow: edit here → copy into PictoBlox if needed → Upload to Uno.

## API

- **Production (after deploy):** `https://adruino-weather-web.vercel.app/api/device`
- Response shape: `{ "v":1, "lh", "lm", "t", "w", "st":[{ "h","t","w" }, ...] }` — see `packages/weather-core/src/device.ts`.

## TLS / AT prototype

See **`AT_TLS_CHECKLIST.md`** in this folder for a manual serial test of HTTPS to Vercel using ESP8266 AT commands (same host/path as the sketch).
