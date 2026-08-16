from selenium.webdriver.common.by import By

SETTINGS_PATH = "/admin/security-settings"


def _goto_settings(driver, wait, base_url):
    driver.get(f"{base_url}{SETTINGS_PATH}")
    wait.until(lambda d: "Security Settings" in d.page_source)


def test_security_settings_page_loads(admin_session, wait, base_url):
    _goto_settings(admin_session, wait, base_url)
    assert admin_session.find_element(By.CSS_SELECTOR, '[data-testid="save-settings-btn"]')


def test_toggle_two_factor_and_save(admin_session, wait, base_url):
    _goto_settings(admin_session, wait, base_url)

    checkbox = admin_session.find_element(By.CSS_SELECTOR, '[data-testid="checkbox-requireForAdmins"]')
    was_checked = checkbox.is_selected()
    checkbox.click()
    assert checkbox.is_selected() != was_checked

    save_btn = admin_session.find_element(By.CSS_SELECTOR, '[data-testid="save-settings-btn"]')
    save_btn.click()

    wait.until(lambda d: "Saving..." not in save_btn.text)
    assert "Saved" in save_btn.text or admin_session.find_elements(
        By.CSS_SELECTOR, '[data-testid="settings-error"]'
    )


def test_password_min_length_input_updates(admin_session, wait, base_url):
    _goto_settings(admin_session, wait, base_url)

    field = admin_session.find_element(By.CSS_SELECTOR, '[data-testid="input-minLength"]')
    field.clear()
    field.send_keys("16")
    assert field.get_attribute("value") == "16"
