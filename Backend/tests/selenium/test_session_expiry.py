from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait


def test_expired_session_shows_message_on_login_page(driver, wait, base_url):
    driver.get(f"{base_url}/?session=expired")

    error = wait.until(
        lambda d: d.find_element(By.CSS_SELECTOR, '[data-testid="login-error"]')
    )
    assert error.is_displayed()
    assert "session has expired" in error.text.lower()


def test_expired_session_clears_stale_local_storage(driver, wait, base_url):
    # Seed stale client-side session state the way a real login would have,
    # then confirm the expired-session landing clears it rather than leaving
    # components like ProfileDropdown reading a stale signed-in user.
    driver.get(base_url)
    driver.execute_script(
        "localStorage.setItem('access_token', 'stale-token');"
        "localStorage.setItem('user_role', 'admin');"
        "localStorage.setItem('user_email', 'stale@example.com');"
    )

    driver.get(f"{base_url}/?session=expired")
    wait.until(lambda d: d.find_element(By.CSS_SELECTOR, '[data-testid="login-error"]'))

    assert driver.execute_script("return localStorage.getItem('access_token')") is None
    assert driver.execute_script("return localStorage.getItem('user_role')") is None


def test_protected_route_without_session_redirects_without_message(driver, wait, base_url):
    # No token at all is a different case from an expired one — shouldn't
    # claim a session expired when there was never one to begin with.
    driver.delete_all_cookies()
    driver.get(f"{base_url}/admin/dashboard")

    wait.until(lambda d: "Welcome Back" in d.page_source)
    assert "session=expired" not in driver.current_url


def test_auto_logout_on_inactivity(admin_session):
    """
    Real end-to-end check of the Security Settings "Session Timeout" /
    "Auto-logout on inactivity" values — these were previously only ever
    saved and displayed, nothing enforced them. Requires whatever is
    currently configured in Security Settings to have autoLogoutOnInactivity
    enabled and a short timeoutMinutes (tested against 1 minute); runs for
    up to ~100s of real wall-clock time since there's no way to fast-forward
    a live inactivity timer.
    """
    # admin_session already landed on /admin/... — deliberately do nothing
    # else here; any real mouse/keyboard/scroll activity would reset the
    # inactivity timer this test is trying to observe.
    WebDriverWait(admin_session, 100).until(lambda d: "session=timeout" in d.current_url)

    error = admin_session.find_element(By.CSS_SELECTOR, '[data-testid="login-error"]')
    assert error.is_displayed()
    assert "inactivity" in error.text.lower()

    assert admin_session.execute_script("return localStorage.getItem('access_token')") is None
