import os

import pytest
from selenium.webdriver.common.by import By

ADMIN_EMAIL = os.environ.get("SAS_TEST_ADMIN_EMAIL")
ADMIN_PASSWORD = os.environ.get("SAS_TEST_ADMIN_PASSWORD")


def test_login_page_renders(driver, wait, base_url):
    driver.get(base_url)
    wait.until(lambda d: "Welcome Back" in d.page_source)
    assert driver.find_element(By.ID, "email").is_displayed()
    assert driver.find_element(By.ID, "password").is_displayed()


def test_submit_disabled_until_valid_email(driver, wait, base_url):
    driver.get(base_url)
    wait.until(lambda d: d.find_elements(By.CSS_SELECTOR, '[data-testid="login-submit-btn"]'))
    submit = driver.find_element(By.CSS_SELECTOR, '[data-testid="login-submit-btn"]')
    assert submit.get_attribute("disabled") is not None

    driver.find_element(By.ID, "email").send_keys("not-an-email")
    assert submit.get_attribute("disabled") is not None

    driver.find_element(By.ID, "email").send_keys("@example.com")
    assert submit.get_attribute("disabled") is None


def test_invalid_credentials_show_error(driver, wait, base_url):
    driver.get(base_url)
    driver.find_element(By.ID, "email").send_keys("nonexistent-user@example.com")
    driver.find_element(By.ID, "password").send_keys("wrong-password")
    driver.find_element(By.CSS_SELECTOR, '[data-testid="login-submit-btn"]').click()

    error = wait.until(
        lambda d: d.find_element(By.CSS_SELECTOR, '[data-testid="login-error"]')
    )
    assert error.is_displayed()
    assert error.text.strip() != ""


def test_successful_login_redirects_to_admin_dashboard(admin_session):
    assert "/admin/" in admin_session.current_url


def test_2fa_required_shows_otp_screen(driver, wait, base_url):
    """
    Only meaningful while Security Settings -> Two-Factor Auth -> "Required
    for admin users" is on for the test account — otherwise this account
    logs straight through and admin_session above is the one that exercises
    that path. Confirms /api/auth/login's 2FA trigger actually reaches the
    frontend: a real code gets emailed and the OTP entry screen renders,
    rather than asserting anything about the code's value (it's a real
    email, not recoverable here).
    """
    if not ADMIN_EMAIL or not ADMIN_PASSWORD:
        pytest.skip(
            "Set SAS_TEST_ADMIN_EMAIL and SAS_TEST_ADMIN_PASSWORD to run tests "
            "that require an authenticated admin session."
        )

    driver.get(base_url)
    wait.until(lambda d: d.find_element(By.ID, "email"))
    driver.find_element(By.ID, "email").send_keys(ADMIN_EMAIL)
    driver.find_element(By.ID, "password").send_keys(ADMIN_PASSWORD)
    driver.find_element(By.CSS_SELECTOR, '[data-testid="login-submit-btn"]').click()

    wait.until(lambda d: "Check Your Email" in d.page_source)
    assert driver.find_element(By.ID, "otp").is_displayed()
