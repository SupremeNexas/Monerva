#!/usr/bin/env bash
DB_DIR="/Users/supryo/Desktop/Expense-Tracker/postgres_data"
LOG_FILE="$DB_DIR/postgres.log"
PORT=5433

case "$1" in
  start)
    if /Library/PostgreSQL/15/bin/pg_ctl -D "$DB_DIR" status >/dev/null 2>&1; then
      echo "PostgreSQL is already running."
    else
      echo "Starting PostgreSQL on port $PORT..."
      /Library/PostgreSQL/15/bin/pg_ctl -D "$DB_DIR" -l "$LOG_FILE" -o "-p $PORT" start
      sleep 2
      if /Library/PostgreSQL/15/bin/pg_ctl -D "$DB_DIR" status >/dev/null 2>&1; then
        echo "PostgreSQL started successfully."
      else
        echo "Failed to start PostgreSQL. Check log: $LOG_FILE"
        exit 1
      fi
    fi
    ;;
  stop)
    echo "Stopping PostgreSQL..."
    /Library/PostgreSQL/15/bin/pg_ctl -D "$DB_DIR" stop
    ;;
  status)
    /Library/PostgreSQL/15/bin/pg_ctl -D "$DB_DIR" status
    ;;
  *)
    echo "Usage: $0 {start|stop|status}"
    exit 1
    ;;
esac
