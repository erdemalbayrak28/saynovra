#!/usr/bin/env bash
# Starts or stops the three apps on throwaway demo databases for screen capture.
#   servers.sh start <work_dir>   fresh demo DBs + a random demo password in <work_dir>
#   servers.sh stop  <work_dir>
# The real projects are only read: DATABASE_URL points into <work_dir> and logins use the demo password.
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
APPS="${APPS_DIR:-/c/Users/Monster/Desktop}"
WORK="$2"
mkdir -p "$WORK"

stop() {
  [ -f "$WORK/pids" ] || return 0
  while read -r pid; do taskkill //F //PID "$pid" >/dev/null 2>&1 || true; done < "$WORK/pids"
  rm -f "$WORK/pids"
}

launch() { # launch <log> <command...>
  local log="$1"; shift
  "$@" > "$WORK/$log" 2>&1 &
  sleep 0.5
  cat "/proc/$!/winpid" >> "$WORK/pids"
}

case "$1" in
  stop) stop ;;
  start)
    stop
    rm -f "$WORK/crm-demo.db" "$WORK/muhasebe-demo.db"
    python -c "import secrets,sys;open(sys.argv[1],'w').write(secrets.token_urlsafe(12))" "$(cygpath -m "$WORK/demo.pw")"
    export DEMO_PASSWORD="$(cat "$WORK/demo.pw")"
    WORK_W="$(cygpath -m "$WORK")"

    DATABASE_URL="sqlite:///$WORK_W/crm-demo.db" \
      launch crm.log "$APPS/nazay-uuygulama/venv/Scripts/python.exe" "$HERE/serve_crm.py" "$(cygpath -m "$APPS/nazay-uuygulama")" 8011

    DATABASE_URL="sqlite:///$WORK_W/muhasebe-demo.db" APP_USERNAME=demo APP_PASSWORD="$DEMO_PASSWORD" \
      SECRET_KEY="$(python -c 'import secrets;print(secrets.token_hex(16))')" \
      launch muhasebe.log "$APPS/nazay muhasebe/.venv/Scripts/python.exe" "$HERE/serve_muhasebe.py" "$(cygpath -m "$APPS/nazay muhasebe")" 5011

    launch site.log python -m http.server 4178 --bind 127.0.0.1 --directory "$(cygpath -m "$APPS/tercume-bahce")"

    sleep 5
    for url in http://127.0.0.1:8011/ http://127.0.0.1:5011/giris http://127.0.0.1:4178/nazaybahce/ http://127.0.0.1:4178/nazaytercume/; do
      curl -s -o /dev/null -m 5 -w "%{http_code} $url\n" "$url"
    done
    ;;
esac
