import re
import phonenumbers
from phonenumbers import NumberParseException

FULL_NAME_MIN_LENGTH = 2
FULL_NAME_MAX_LENGTH = 100
_INVALID_NAME_CHARS = re.compile(r'[0-9<>{}\\/;"]')


def validate_full_name(name) -> str | None:
    """Returns an error message if `name` is invalid, else None. Rejects
    digits and markup-like punctuation but otherwise allows international
    letters, spaces, hyphens, apostrophes and periods."""
    if not isinstance(name, str) or not name.strip():
        return "Full name is required."
    name = name.strip()
    if len(name) < FULL_NAME_MIN_LENGTH:
        return f"Full name must be at least {FULL_NAME_MIN_LENGTH} characters."
    if len(name) > FULL_NAME_MAX_LENGTH:
        return f"Full name must be {FULL_NAME_MAX_LENGTH} characters or fewer."
    if _INVALID_NAME_CHARS.search(name):
        return "Full name contains invalid characters."
    return None


def validate_phone_number(phone) -> str | None:
    """Returns an error message if `phone` is invalid, else None. An empty
    string/None is valid — the phone number is optional and clearable.

    Validated with Google's libphonenumber (the `phonenumbers` package)
    against the number's own country's real numbering plan, so this works
    for any country rather than one hardcoded format. Since there's no
    single default country here, the number must be given in international
    format with a leading '+countrycode' — libphonenumber has no other way
    to know which country's rules to check it against."""
    if phone is None:
        return None
    if not isinstance(phone, str):
        return "Phone number must be text."
    phone = phone.strip()
    if phone == '':
        return None
    if not phone.startswith('+'):
        return "Phone number must include a country code, e.g. +14155552671."
    try:
        parsed = phonenumbers.parse(phone, None)
    except NumberParseException:
        return "Phone number is not a valid phone number."
    if not phonenumbers.is_valid_number(parsed):
        return "Phone number is not valid for the specified country."
    return None
