import requests
import os
from dotenv import load_dotenv

load_dotenv()

CARGOWISE_API_URL = os.getenv('CARGOWISE_API_URL')
CARGOWISE_USERNAME = os.getenv('CARGOWISE_USERNAME')
CARGOWISE_PASSWORD = os.getenv('CARGOWISE_PASSWORD')

# Which CargoWise API fields are shipment milestones, and where each one's
# data comes from. When the API starts sending a new milestone, add one
# entry here — no schema change needed, it lands in shipments.milestones.
MILESTONE_FIELDS = {
    'cargo_ready':  {'date': 'cargo_ready_date',  'status': None},
    'cargo_pickup': {'date': 'cargo_pickup_date', 'status': 'pickup_date_status'},
}

def build_milestones(item):
    """Build the shipments.milestones jsonb value from one API record."""
    return {
        name: {
            'date': item.get(src['date']),
            'status': item.get(src['status']) if src['status'] else None,
        }
        for name, src in MILESTONE_FIELDS.items()
    }

def get_access_token():
    try:
        response = requests.post(
            f'{CARGOWISE_API_URL}/auth/login',
            data={
                'username': CARGOWISE_USERNAME,
                'password': CARGOWISE_PASSWORD,
                'grant_type': 'password'
            },
            timeout=30
        )
        response.raise_for_status()
        return response.json().get('access_token')
    except Exception as e:
        print(f'Login error: {e}')
        return None

# to use token to fetch data from api
def fetch_shipments_from_api():
    try:
        token = get_access_token()
        if not token:
            return []

        response = requests.get(
            f'{CARGOWISE_API_URL}/cargo-pickup-date',
            headers={'Authorization': f'Bearer {token}'},
            timeout=30
        )
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f'CargoWise API error: {e}')
        return []