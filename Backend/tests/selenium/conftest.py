import os

import pytest
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait

FRONTEND_URL = os.environ.get("SAS_FRONTEND_URL", "http://localhost:3000")
ADMIN_EMAIL = os.environ.get("SAS_TEST_ADMIN_EMAIL")
ADMIN_PASSWORD = os.environ.get("SAS_TEST_ADMIN_PASSWORD")
HEADLESS = os.environ.get("SAS_TEST_HEADLESS", "true").lower() != "false"


@pytest.fixture
def base_url():
    return FRONTEND_URL


@pytest.fixture
def driver():
    options = Options()
    if HEADLESS:
        options.add_argument("--headless=new")
    options.add_argument("--window-size=1440,900")
    options.add_argument("--disable-gpu")
    driver = webdriver.Chrome(options=options)
    driver.implicitly_wait(2)
    yield driver
    driver.quit()


@pytest.fixture
def wait(driver):
    return WebDriverWait(driver, 10)


@pytest.fixture
def admin_session(driver, wait, base_url):
    """Logs in as an admin via the real login form and returns the driver
    positioned on the admin dashboard. Requires SAS_TEST_ADMIN_EMAIL and
    SAS_TEST_ADMIN_PASSWORD to be set to a real admin account.
    """
    if not ADMIN_EMAIL or not ADMIN_PASSWORD:
        pytest.skip(
            "Set SAS_TEST_ADMIN_EMAIL and SAS_TEST_ADMIN_PASSWORD to run tests "
            "that require an authenticated admin session."
        )

    from selenium.webdriver.common.by import By

    driver.get(base_url)
    wait.until(lambda d: d.find_element(By.ID, "email"))
    driver.find_element(By.ID, "email").send_keys(ADMIN_EMAIL)
    driver.find_element(By.ID, "password").send_keys(ADMIN_PASSWORD)
    driver.find_element(By.CSS_SELECTOR, '[data-testid="login-submit-btn"]').click()

    wait.until(lambda d: "/admin/" in d.current_url)
    return driver
