#!/bin/sh
set -e

CONFIG=/usr/share/nginx/html/config.js

cat > "$CONFIG" <<EOF
// public/config.js — generated at container startup
window.__APP_CONFIG__ = {
  TIMESHEET_API_ENDPOINT: "${TIMESHEET_API_ENDPOINT:-http://13.204.95.26:5000}",
  USER_MANAGEMENT_URL: "${USER_MANAGEMENT_URL:-http://13.204.95.26:8000}",
  BASE_URL: "${BASE_URL:-http://13.204.95.26:9999}",
  PMS_BASE_URL: "${PMS_BASE_URL:-http://13.204.95.26:8080}",
  MSOffice_USER_MANAGEMENT_URL: "${MSOffice_USER_MANAGEMENT_URL:-http://13.204.95.26:8082}",
  EMPLOYEE_ONBOARDING_URL: "${EMPLOYEE_ONBOARDING_URL:-http://13.204.95.26:8081}",
  RMS_BASE_URL: "${RMS_BASE_URL:-http://13.204.95.26:8002}",
  AP_BASE_URL: "${AP_BASE_URL:-http://localhost:8000/apm}",
};
EOF

exec "$@"
