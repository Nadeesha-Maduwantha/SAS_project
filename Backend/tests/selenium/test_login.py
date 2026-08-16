from selenium.webdriver.common.by import By


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
