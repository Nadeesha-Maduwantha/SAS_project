
from services.supabase_client import supabase
from services.user_matching import resolve_relevant_profiles
from sync.milestone_sync import _sync_alerts_for_milestone


def run_backfill():
    critical = supabase.table('shipment_milestones').select('*').eq('is_critical', True).execute().data or []
    overdue = supabase.table('shipment_milestones').select('*').eq('status', 'overdue').execute().data or []

    by_id = {m['id']: m for m in critical}
    by_id.update({m['id']: m for m in overdue})
    milestones = list(by_id.values())
    print(f"Found {len(milestones)} alert-worthy milestones to backfill")

    shipment_ids = list({m['shipment_id'] for m in milestones})
    shipments = (
        supabase.table('shipments')
        .select('id, created_by_email, updated_by_email, sales_user_email')
        .in_('id', shipment_ids)
        .execute()
        .data or []
    )
    shipments_by_id = {s['id']: s for s in shipments}

    matched_count = 0
    admin_only_count = 0
    skipped = 0

    for m in milestones:
        shipment = shipments_by_id.get(m['shipment_id'])
        if not shipment:
            skipped += 1
            continue

        relevant_profiles = resolve_relevant_profiles(shipment)
        primary = relevant_profiles[0] if relevant_profiles else None

        supabase.table('shipment_milestones').update({
            'assigned_to': primary['full_name'] if primary else None,
            'assigned_email': primary['email'] if primary else None,
        }).eq('id', m['id']).execute()

        _sync_alerts_for_milestone(
            m['shipment_id'], m['id'], m['name'], m.get('notes'),
            m['is_critical'], m['status'], relevant_profiles,
        )

        if relevant_profiles:
            matched_count += 1
        else:
            admin_only_count += 1

    print(f"Done. matched={matched_count} admin_only={admin_only_count} skipped(no shipment)={skipped}")


if __name__ == '__main__':
    run_backfill()