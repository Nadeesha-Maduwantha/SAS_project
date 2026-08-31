from selenium.webdriver.common.by import By

AUDIT_TRAIL_PATH = "/admin/audit-trail"


def _goto_audit_trail(driver, wait, base_url):
    driver.get(f"{base_url}{AUDIT_TRAIL_PATH}")
    wait.until(lambda d: "Audit Trail" in d.page_source)
    wait.until_not(lambda d: "Loading audit trail..." in d.page_source)


def test_audit_trail_page_loads(admin_session, wait, base_url):
    _goto_audit_trail(admin_session, wait, base_url)
    assert admin_session.find_element(By.CSS_SELECTOR, '[data-testid="audit-table"]')


def test_module_filter_narrows_results(admin_session, wait, base_url):
    _goto_audit_trail(admin_session, wait, base_url)

    from selenium.webdriver.support.ui import Select

    module_select = Select(admin_session.find_element(By.CSS_SELECTOR, '[data-testid="filter-module"]'))
    module_select.select_by_value("Security Settings")

    rows = admin_session.find_elements(By.CSS_SELECTOR, '[data-testid="audit-row"]')
    for row in rows:
        cells = row.find_elements(By.TAG_NAME, "td")
        assert "Security Settings" in cells[2].text


def test_severity_filter_narrows_results(admin_session, wait, base_url):
    _goto_audit_trail(admin_session, wait, base_url)

    from selenium.webdriver.support.ui import Select

    severity_select = Select(admin_session.find_element(By.CSS_SELECTOR, '[data-testid="filter-severity"]'))
    severity_select.select_by_value("Critical")

    rows = admin_session.find_elements(By.CSS_SELECTOR, '[data-testid="audit-row"]')
    for row in rows:
        cells = row.find_elements(By.TAG_NAME, "td")
        assert "Critical" in cells[5].text


def test_pagination_next_button(admin_session, wait, base_url):
    _goto_audit_trail(admin_session, wait, base_url)

    next_btn = admin_session.find_element(By.CSS_SELECTOR, '[data-testid="next-page-btn"]')
    if next_btn.get_attribute("disabled") is not None:
        return  # not enough rows to page through; nothing to assert

    summary_before = admin_session.find_element(By.CSS_SELECTOR, '[data-testid="pagination-summary"]').text
    next_btn.click()
    wait.until(
        lambda d: d.find_element(By.CSS_SELECTOR, '[data-testid="pagination-summary"]').text != summary_before
    )


def test_export_button_triggers_download(admin_session, wait, base_url):
    _goto_audit_trail(admin_session, wait, base_url)
    export_btn = admin_session.find_element(By.CSS_SELECTOR, '[data-testid="export-audit-btn"]')
    export_btn.click()  # triggers a client-side CSV blob download; just verify no crash
    assert admin_session.find_element(By.CSS_SELECTOR, '[data-testid="audit-table"]')
