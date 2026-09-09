"""
departments.py — freight desk helpers.

A super user runs exactly one freight desk: air or sea. That desk is stored in
profiles.department, but not consistently — the same desk appears as 'sea',
'Sea' and (for air) 'air'. Compare through normalize_department() rather than
against the raw string, otherwise 'Sea' and 'sea' look like different desks.
"""

AIR = 'AIR'
SEA = 'SEA'

_AIR_SPELLINGS = {'air', 'airfreight', 'air freight'}
_SEA_SPELLINGS = {'sea', 'seafreight', 'sea freight', 'ocean'}


def normalize_department(value):
    """
    Map a stored department to 'AIR' / 'SEA', or None when it is not a freight
    desk (empty, 'Sales', 'operations', ...).
    """
    key = (value or '').strip().lower()
    if key in _AIR_SPELLINGS:
        return AIR
    if key in _SEA_SPELLINGS:
        return SEA
    return None


def is_super_user(role):
    """True for any stored spelling of the super user role ('Super User', 'superuser')."""
    return (role or '').replace(' ', '').replace('_', '').replace('-', '').lower() == 'superuser'
