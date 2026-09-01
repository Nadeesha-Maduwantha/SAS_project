from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait

SETTINGS_PATH = "/admin/security-settings"


def _goto_settings(driver, wait, base_url):
    driver.get(f"{base_url}{SETTINGS_PATH}")
    wait.until(lambda d: "Security Settings" in d.page_source)
    # RouterLoadingOverlay (a full-screen route-transition overlay) can still
    # be fading out here and intercepts clicks at the top of the viewport —
    # same issue fixed earlier for the login flow.
    wait.until(lambda d: not d.find_elements(By.CSS_SELECTOR, '[data-testid="route-loading-overlay"]'))
    # The save button reads "Loading…" (and is disabled) until the real
    # settings GET responses land — interacting/saving before that would
    # race the initial load and risk writing hardcoded defaults back over
    # real values for whichever section hasn't loaded yet.
    wait.until(
        lambda d: d.find_element(By.CSS_SELECTOR, '[data-testid="save-settings-btn"]').text != "Loading…"
    )


def _click(driver, element):
    """Native click, falling back to a JS click if something transient
    (the route overlay, the sticky top bar mid-layout) is momentarily
    covering the element's hit-test point."""
    try:
        element.click()
    except Exception:
        driver.execute_script("arguments[0].click();", element)


def _set_input(driver, testid, value):
    field = driver.find_element(By.CSS_SELECTOR, f'[data-testid="{testid}"]')
    field.clear()
    field.send_keys(str(value))


def _set_checkbox(driver, testid, checked):
    box = driver.find_element(By.CSS_SELECTOR, f'[data-testid="{testid}"]')
    if box.is_selected() != checked:
        _click(driver, box)


def _save_and_wait(driver, wait):
    save_btn = driver.find_element(By.CSS_SELECTOR, '[data-testid="save-settings-btn"]')
    _click(driver, save_btn)
    # Saving does real Supabase round-trips (settings write + audit log,
    # x2 endpoints) — can outrun the default 10s wait.
    WebDriverWait(driver, 25).until(lambda d: "Saving..." not in save_btn.text)
    error = driver.find_elements(By.CSS_SELECTOR, '[data-testid="settings-error"]')
    assert not error, f"Save failed: {error[0].text if error else ''}"
    assert "Saved" in save_btn.text


def test_security_settings_page_loads(admin_session, wait, base_url):
    _goto_settings(admin_session, wait, base_url)
    assert admin_session.find_element(By.CSS_SELECTOR, '[data-testid="save-settings-btn"]')
    for heading in (
        "Password Policy",
        "Two-Factor Authentication",
        "Session Management",
        "Login Security",
        "Security Notifications",
    ):
        assert heading in admin_session.page_source


def test_password_policy_full_round_trip(admin_session, wait, base_url):
    _goto_settings(admin_session, wait, base_url)

    _set_input(admin_session, "input-minLength", 14)
    _set_input(admin_session, "input-expiryDays", 60)
    for key, want in (
        ("checkbox-requireUppercase", True),
        ("checkbox-requireLowercase", True),
        ("checkbox-requireNumbers", True),
        ("checkbox-requireSpecialChars", False),
        ("checkbox-preventReuse", True),
    ):
        _set_checkbox(admin_session, key, want)

    _save_and_wait(admin_session, wait)

    _goto_settings(admin_session, wait, base_url)
    wait.until(lambda d: d.find_element(By.CSS_SELECTOR, '[data-testid="input-minLength"]').get_attribute("value") == "14")
    assert admin_session.find_element(By.CSS_SELECTOR, '[data-testid="input-expiryDays"]').get_attribute("value") == "60"
    assert admin_session.find_element(By.CSS_SELECTOR, '[data-testid="checkbox-requireUppercase"]').is_selected() is True
    assert admin_session.find_element(By.CSS_SELECTOR, '[data-testid="checkbox-requireSpecialChars"]').is_selected() is False
    assert admin_session.find_element(By.CSS_SELECTOR, '[data-testid="checkbox-preventReuse"]').is_selected() is True


def test_two_factor_toggle_and_save(admin_session, wait, base_url):
    _goto_settings(admin_session, wait, base_url)

    checkbox = admin_session.find_element(By.CSS_SELECTOR, '[data-testid="checkbox-requireForAdmins"]')
    was_checked = checkbox.is_selected()
    checkbox.click()
    assert checkbox.is_selected() != was_checked

    _save_and_wait(admin_session, wait)

    _goto_settings(admin_session, wait, base_url)
    reloaded = admin_session.find_element(By.CSS_SELECTOR, '[data-testid="checkbox-requireForAdmins"]')
    assert reloaded.is_selected() != was_checked

    # Restore original value so this test doesn't permanently flip the
    # account's live 2FA requirement as a side effect of running it.
    if reloaded.is_selected() != was_checked:
        reloaded.click()
        _save_and_wait(admin_session, wait)


def test_session_management_full_round_trip(admin_session, wait, base_url):
    _goto_settings(admin_session, wait, base_url)

    _set_input(admin_session, "input-timeoutMinutes", 45)
    _set_input(admin_session, "input-maxConcurrentSessions", 2)
    for key, want in (
        ("checkbox-autoLogoutOnInactivity", True),
        ("checkbox-requireReauthForSensitive", False),
        ("checkbox-rememberDevice", True),
    ):
        _set_checkbox(admin_session, key, want)

    _save_and_wait(admin_session, wait)

    _goto_settings(admin_session, wait, base_url)
    wait.until(lambda d: d.find_element(By.CSS_SELECTOR, '[data-testid="input-timeoutMinutes"]').get_attribute("value") == "45")
    assert admin_session.find_element(By.CSS_SELECTOR, '[data-testid="input-maxConcurrentSessions"]').get_attribute("value") == "2"
    assert admin_session.find_element(By.CSS_SELECTOR, '[data-testid="checkbox-autoLogoutOnInactivity"]').is_selected() is True
    assert admin_session.find_element(By.CSS_SELECTOR, '[data-testid="checkbox-requireReauthForSensitive"]').is_selected() is False
    assert admin_session.find_element(By.CSS_SELECTOR, '[data-testid="checkbox-rememberDevice"]').is_selected() is True


def test_login_security_full_round_trip(admin_session, wait, base_url):
    _goto_settings(admin_session, wait, base_url)

    _set_input(admin_session, "input-maxFailedAttempts", 4)
    _set_input(admin_session, "input-lockoutDurationMinutes", 20)
    for key, want in (
        ("checkbox-enableIPRestrictions", False),
        ("checkbox-sendSuspiciousAlerts", True),
        ("checkbox-allowUnrecognizedDevices", False),
    ):
        _set_checkbox(admin_session, key, want)

    _save_and_wait(admin_session, wait)

    _goto_settings(admin_session, wait, base_url)
    wait.until(lambda d: d.find_element(By.CSS_SELECTOR, '[data-testid="input-maxFailedAttempts"]').get_attribute("value") == "4")
    assert admin_session.find_element(By.CSS_SELECTOR, '[data-testid="input-lockoutDurationMinutes"]').get_attribute("value") == "20"
    assert admin_session.find_element(By.CSS_SELECTOR, '[data-testid="checkbox-enableIPRestrictions"]').is_selected() is False
    assert admin_session.find_element(By.CSS_SELECTOR, '[data-testid="checkbox-sendSuspiciousAlerts"]').is_selected() is True
    assert admin_session.find_element(By.CSS_SELECTOR, '[data-testid="checkbox-allowUnrecognizedDevices"]').is_selected() is False


def test_security_notifications_full_round_trip(admin_session, wait, base_url):
    _goto_settings(admin_session, wait, base_url)

    for key, want in (
        ("checkbox-notifyFailedAttempts", True),
        ("checkbox-notifyPasswordChanges", False),
        ("checkbox-notifyPermissionChanges", True),
        ("checkbox-notifyNewDeviceLogin", True),
        ("checkbox-dailySummaryEmail", False),
    ):
        _set_checkbox(admin_session, key, want)

    _save_and_wait(admin_session, wait)

    _goto_settings(admin_session, wait, base_url)
    wait.until(lambda d: d.find_element(By.CSS_SELECTOR, '[data-testid="checkbox-notifyPasswordChanges"]').is_selected() is False)
    assert admin_session.find_element(By.CSS_SELECTOR, '[data-testid="checkbox-notifyFailedAttempts"]').is_selected() is True
    assert admin_session.find_element(By.CSS_SELECTOR, '[data-testid="checkbox-notifyPermissionChanges"]').is_selected() is True
    assert admin_session.find_element(By.CSS_SELECTOR, '[data-testid="checkbox-notifyNewDeviceLogin"]').is_selected() is True
    assert admin_session.find_element(By.CSS_SELECTOR, '[data-testid="checkbox-dailySummaryEmail"]').is_selected() is False


def test_password_min_length_input_updates(admin_session, wait, base_url):
    _goto_settings(admin_session, wait, base_url)

    field = admin_session.find_element(By.CSS_SELECTOR, '[data-testid="input-minLength"]')
    field.clear()
    field.send_keys("16")
    assert field.get_attribute("value") == "16"
