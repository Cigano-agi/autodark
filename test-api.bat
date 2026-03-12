@echo off
set "API_KEY=sk_aykke6mp4owf9pjtv4k1xubga0t12gu7nljjm72bls8wwjhv"
set "URL=https://api.ai33.pro/v1/chat/completions"

echo Testing API connection with curl.exe...
echo URL: %URL%
echo.

curl.exe -v -X POST "%URL%" ^
  -H "Content-Type: application/json" ^
  -H "Authorization: Bearer %API_KEY%" ^
  -d "{\"model\": \"gpt-4o-mini\", \"messages\": [{\"role\": \"user\", \"content\": \"hi\"}], \"max_tokens\": 5}"

echo.
echo.
echo Test complete.
