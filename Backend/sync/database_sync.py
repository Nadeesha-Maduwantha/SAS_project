
import os
import sys


sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.events import EVENT_JOB_ERROR, EVENT_JOB_EXECUTED
from dotenv import load_dotenv
import time

load_dotenv()

from sync.milestone_sync import run_milestone_sync
from sync.database_sync_log import get_recent_logs, get_last_sync



SYNC_INTERVAL_MINUTES = 30


def job_milestone_sync():
    """
    This is the function the scheduler calls every X minutes.
    It runs the full milestone sync and prints the result.
    """
    print(f"\n[sync_runner] Running scheduled milestone sync...")
    result = run_milestone_sync()


    print(f"[sync_runner] Result: {result['status'].upper()}")
    print(f"  Total:   {result.get('total', 0)}")
    print(f"  Updated: {result.get('updated', 0)}")
    print(f"  Created: {result.get('created', 0)}")
    print(f"  Errors:  {len(result.get('errors', []))}")
    print(f"  Time:    {result.get('duration_ms', 0)}ms")

    # NOTIFICATION HOOK

    if result.get('status') == 'failed':
        _notify_sync_failed(result)
    elif result.get('errors'):
        _notify_partial_errors(result)


def _notify_sync_failed(result: dict):
    """
    Called when the entire sync fails.
    Placeholder — will be replaced with real notification logic later.
    """
    print(f"[sync_runner] ⚠ SYNC FAILED — notification would be sent here")
    print(f"  Error: {result.get('error', 'Unknown error')}")
    # TODO: send email / Slack / SMS alert here


def _notify_partial_errors(result: dict):
    """
    Called when some shipments failed during sync.
    Placeholder — will be replaced with real notification logic later.
    """
    error_count = len(result.get('errors', []))
    print(f"[sync_runner] ⚠ {error_count} shipment(s) had errors — notification would be sent here")
    for err in result.get('errors', [])[:3]:  # show first 3 errors
        print(f"  {err.get('job_number', '?')}: {err.get('error', '?')}")
    # TODO: send email / Slack / SMS alert here


def start_scheduler():
    """
    Creates and starts the APScheduler background scheduler.
    Call this from app.py to run the scheduler in the same process as Flask.

    Example in app.py:
        from sync.database_sync import start_scheduler
        start_scheduler()
    """
    scheduler = BackgroundScheduler()


    scheduler.add_job(
        func=job_milestone_sync,
        trigger='interval',
        minutes=SYNC_INTERVAL_MINUTES,
        id='milestone_sync',
        name='Milestone Sync',
        misfire_grace_time=60,
        replace_existing=True,
    )

    # Log when jobs run or error
    def on_job_event(event):
        if event.exception:
            print(f"[sync_runner] Scheduler job CRASHED: {event.exception}")
        else:
            print(f"[sync_runner] Scheduler job finished successfully")

    scheduler.add_listener(on_job_event, EVENT_JOB_ERROR | EVENT_JOB_EXECUTED)

    scheduler.start()
    print(f"[sync_runner] Scheduler started — milestone sync every {SYNC_INTERVAL_MINUTES} minutes")
    return scheduler



if __name__ == '__main__':
    print("[sync_runner] Starting standalone scheduler...")
    scheduler = start_scheduler()

    # Run once immediately on startup
    print("[sync_runner] Running initial sync...")
    job_milestone_sync()

    # Keep the process alive so the scheduler keeps running
    try:
        while True:
            time.sleep(60)
    except (KeyboardInterrupt, SystemExit):
        scheduler.shutdown()
        print("[sync_runner] Scheduler stopped")


