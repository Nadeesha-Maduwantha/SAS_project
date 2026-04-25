import requests
import os
from dotenv import load_dotenv

load_dotenv()

CARGOWISE_API_URL = os.getenv('CARGOWISE_API_URL')
CARGOWISE_USERNAME = os.getenv('CARGOWISE_USERNAME')
CARGOWISE_PASSWORD = os.getenv('CARGOWISE_PASSWORD')

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