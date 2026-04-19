/**
 * Arduino Uno R3 + ESP8266 (AT firmware) + I2C LCD 1602 — weather station.
 * Fetches compact JSON from GET /api/device (see packages/api + @repo/weather-core).
 *
 * Libraries (Arduino Library Manager): ArduinoJson, LiquidCrystal I2C (Frank de Brabander).
 * Copy secrets.h.example to secrets.h and set WIFI_SSID / WIFI_PASSWORD.
 */

#include <Arduino.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <ArduinoJson.h>
#include <SoftwareSerial.h>
#include "secrets.h"

#ifndef WIFI_SSID
#error Copy firmware/arduino-weather-station/secrets.h.example to secrets.h and define WIFI_SSID / WIFI_PASSWORD
#endif

// Wiring: SoftwareSerial <-> ESP8266 UART; LCD I2C SDA=A4, SCL=A5 (Uno)
static const uint8_t ESP8266_RX_ARDUINO_PIN = 10;
static const uint8_t ESP8266_TX_ARDUINO_PIN = 11;
static const uint8_t LCD_I2C_ADDR = 0x27;

static const char API_HOST[] = "adruino-weather-web.vercel.app";
static const char API_PATH[] = "/api/device";
static const unsigned long FETCH_INTERVAL_MS = 15UL * 60UL * 1000UL;
static const unsigned long SCROLL_STEP_MS = 400;
static const uint32_t ESP_SERIAL_BAUD = 9600;

SoftwareSerial espSerial(ESP8266_RX_ARDUINO_PIN, ESP8266_TX_ARDUINO_PIN);
LiquidCrystal_I2C lcd(LCD_I2C_ADDR, 16, 2);

static char rxBuf[1800];
static char scrollBuf[140];
static uint16_t scrollLen;
static uint16_t scrollPos;

static uint8_t syncHour;
static uint8_t syncMinute;
static unsigned long syncAtMillis;

static int8_t nowTempC;
static uint16_t nowWeatherCode;

static unsigned long lastFetchMillis;
static unsigned long lastScrollStepMillis;
static unsigned long lastLine1DrawMillis;
static bool haveForecast;

static bool sendAtRaw(const char *line, uint32_t timeoutMs);
static bool waitForSubstring(const char *needle, uint32_t timeoutMs);
static bool waitForPrompt(char marker, uint32_t timeoutMs);
static void drainEsp(uint16_t ms);
static bool connectWifi();
static bool httpsGetDeviceJson();
static bool extractJsonObject(const char *raw, char *out, size_t outSize);
static void applyDeviceJson(const char *json);
static void drawLine1();
static void drawLine2Window();

void setup() {
  Serial.begin(115200);
  espSerial.begin(ESP_SERIAL_BAUD);

  lcd.init();
  lcd.backlight();
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print(F("Weather boot"));
  lcd.setCursor(0, 1);
  lcd.print(F("ESP8266 AT"));

  delay(400);
  sendAtRaw("AT", 2000);
  sendAtRaw("ATE0", 2000);
  sendAtRaw("AT+CWMODE=1", 2000);

  if (!connectWifi()) {
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print(F("WiFi failed"));
    while (true) {
      delay(1000);
    }
  }

  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print(F("WiFi OK"));
  delay(400);

  lastFetchMillis = 0;
  haveForecast = false;
}

void loop() {
  const unsigned long now = millis();

  if (lastFetchMillis == 0 || now - lastFetchMillis >= FETCH_INTERVAL_MS) {
    lcd.setCursor(0, 1);
    lcd.print(F("Fetching...     "));
    if (httpsGetDeviceJson()) {
      lastFetchMillis = millis();
      drawLine1();
    } else {
      lcd.setCursor(0, 1);
      lcd.print(F("Fetch error     "));
    }
  }

  if (now - lastLine1DrawMillis >= 1000) {
    lastLine1DrawMillis = now;
    drawLine1();
  }

  if (scrollLen > 16 && now - lastScrollStepMillis >= SCROLL_STEP_MS) {
    lastScrollStepMillis = now;
    scrollPos++;
    if (scrollPos >= scrollLen) {
      scrollPos = 0;
    }
    drawLine2Window();
  } else if (scrollLen > 0 && scrollLen <= 16 && now - lastScrollStepMillis >= SCROLL_STEP_MS) {
    lastScrollStepMillis = now;
    drawLine2Window();
  }

  delay(20);
}

static void drainEsp(uint16_t ms) {
  unsigned long t0 = millis();
  while (millis() - t0 < ms) {
    while (espSerial.available()) {
      espSerial.read();
    }
    delay(3);
  }
}

static bool sendAtRaw(const char *line, uint32_t timeoutMs) {
  espSerial.print(line);
  espSerial.print(F("\r\n"));
  return waitForSubstring("OK", timeoutMs);
}

static bool waitForSubstring(const char *needle, uint32_t timeoutMs) {
  size_t idx = 0;
  const size_t nlen = strlen(needle);
  unsigned long start = millis();
  while (millis() - start < timeoutMs) {
    while (espSerial.available()) {
      char c = (char)espSerial.read();
      Serial.write(c);
      if (c == needle[idx]) {
        idx++;
        if (idx >= nlen) {
          return true;
        }
      } else {
        idx = (c == needle[0]) ? 1 : 0;
      }
    }
  }
  return false;
}

static bool waitForPrompt(char marker, uint32_t timeoutMs) {
  unsigned long start = millis();
  while (millis() - start < timeoutMs) {
    while (espSerial.available()) {
      char c = (char)espSerial.read();
      Serial.write(c);
      if (c == marker) {
        return true;
      }
    }
  }
  return false;
}

static bool connectWifi() {
  char cmd[96];
  snprintf(cmd, sizeof cmd, "AT+CWJAP=\"%s\",\"%s\"", WIFI_SSID, WIFI_PASSWORD);
  espSerial.print(cmd);
  espSerial.print(F("\r\n"));
  return waitForSubstring("WIFI GOT IP", 25000);
}

static bool extractJsonObject(const char *raw, char *out, size_t outSize) {
  const char *a = strchr(raw, '{');
  const char *b = strrchr(raw, '}');
  if (!a || !b || b <= a) {
    return false;
  }
  size_t len = (size_t)(b - a + 1);
  if (len >= outSize) {
    return false;
  }
  memcpy(out, a, len);
  out[len] = '\0';
  return true;
}

static void applyDeviceJson(const char *json) {
  StaticJsonDocument<768> doc;
  DeserializationError err = deserializeJson(doc, json);
  if (err) {
    return;
  }

  haveForecast = true;
  syncHour = (uint8_t)constrain((int)doc["lh"], 0, 23);
  syncMinute = (uint8_t)constrain((int)doc["lm"], 0, 59);
  syncAtMillis = millis();
  nowTempC = (int8_t)constrain((int)doc["t"], -40, 50);
  nowWeatherCode = (uint16_t)abs((int)doc["w"]);

  char *p = scrollBuf;
  char *end = scrollBuf + sizeof(scrollBuf) - 2;
  JsonArray st = doc["st"].as<JsonArray>();
  for (JsonVariant v : st) {
    int h = (int)v["h"];
    int t = (int)v["t"];
    int w = (int)v["w"];
    int n = snprintf(p, (size_t)(end - p), " %dh %+dc w%d ", h, t, w);
    if (n <= 0 || p + n >= end) {
      break;
    }
    p += n;
  }
  *p = '\0';
  scrollLen = strlen(scrollBuf);
  if (scrollLen == 0) {
    strncpy(scrollBuf, " --- ", sizeof(scrollBuf));
    scrollLen = strlen(scrollBuf);
  }
  scrollPos = 0;
}

static void drawLine1() {
  if (!haveForecast) {
    lcd.setCursor(0, 0);
    lcd.print(F(" Waiting data   "));
    return;
  }

  unsigned long addMin = (millis() - syncAtMillis) / 60000UL;
  unsigned long total = (unsigned long)syncHour * 60UL + (unsigned long)syncMinute + addMin;
  uint8_t hh = (uint8_t)((total / 60UL) % 24UL);
  uint8_t mm = (uint8_t)(total % 60UL);

  char line[17];
  snprintf(line, sizeof line, "%02u:%02u %dC w%u", hh, mm, (int)nowTempC, (unsigned)nowWeatherCode);
  lcd.setCursor(0, 0);
  lcd.print(line);
  for (size_t i = strlen(line); i < 16; i++) {
    lcd.print(' ');
  }
}

static void drawLine2Window() {
  if (scrollLen == 0) {
    return;
  }
  if (scrollLen <= 16) {
    lcd.setCursor(0, 1);
    lcd.print(scrollBuf);
    for (uint16_t i = scrollLen; i < 16; i++) {
      lcd.print(' ');
    }
    return;
  }
  char window[17];
  for (uint8_t i = 0; i < 16; i++) {
    uint16_t idx = (uint16_t)((scrollPos + i) % scrollLen);
    window[i] = scrollBuf[idx];
  }
  window[16] = '\0';
  lcd.setCursor(0, 1);
  lcd.print(window);
}

static bool httpsGetDeviceJson() {
  espSerial.print(F("AT+CIPSSLSIZE=4096\r\n"));
  delay(80);
  drainEsp(200);

  char cmd[96];
  snprintf(cmd, sizeof cmd, "AT+CIPSTART=\"SSL\",\"%s\",443", API_HOST);
  if (!sendAtRaw(cmd, 20000)) {
    sendAtRaw("AT+CIPCLOSE", 2000);
    return false;
  }

  char request[200];
  int reqLen = snprintf(request, sizeof request,
                        "GET %s HTTP/1.1\r\n"
                        "Host: %s\r\n"
                        "Connection: close\r\n"
                        "\r\n",
                        API_PATH, API_HOST);
  if (reqLen <= 0 || reqLen >= (int)sizeof(request)) {
    sendAtRaw("AT+CIPCLOSE", 2000);
    return false;
  }

  char cipsend[40];
  snprintf(cipsend, sizeof cipsend, "AT+CIPSEND=%d", reqLen);
  espSerial.print(cipsend);
  espSerial.print(F("\r\n"));
  if (!waitForPrompt('>', 8000)) {
    sendAtRaw("AT+CIPCLOSE", 2000);
    return false;
  }
  espSerial.write((const uint8_t *)request, (size_t)reqLen);
  if (!waitForSubstring("SEND OK", 12000)) {
    sendAtRaw("AT+CIPCLOSE", 2000);
    return false;
  }

  uint16_t pos = 0;
  unsigned long t0 = millis();
  unsigned long lastRx = millis();
  while (millis() - t0 < 15000) {
    while (espSerial.available() && pos + 1 < sizeof(rxBuf)) {
      rxBuf[pos++] = (char)espSerial.read();
      lastRx = millis();
    }
    if (pos > 0 && millis() - lastRx > 1200) {
      break;
    }
    delay(2);
  }
  rxBuf[pos] = '\0';

  sendAtRaw("AT+CIPCLOSE", 2000);

  char json[768];
  if (!extractJsonObject(rxBuf, json, sizeof json)) {
    return false;
  }

  applyDeviceJson(json);
  drawLine2Window();
  return true;
}
