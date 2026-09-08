# Selenium E2E tests

Browser tests for the login flow, Security Settings (2FA, password policy, etc.)
and Audit Trail pages, driven against the real frontend + backend.

## 1. Install dependencies

From `Backend/`, with your existing venv active:

```
pip install -r requirements-test.txt
```

Selenium 4.6+ ships "Selenium Manager", which downloads the matching
chromedriver automatically — you just need Chrome installed locally.

## 2. Start the app (two terminals)

```
# Terminal 1 - backend
cd Backend
python app.py          # runs on http://localhost:5000

# Terminal 2 - frontend
cd SAS
npm run dev             # runs on http://localhost:3000
```

## 3. Set test credentials

Most tests need a real admin account to log in through the UI. Set:

```
# PowerShell
$env:SAS_TEST_ADMIN_EMAIL = "your-admin@example.com"
$env:SAS_TEST_ADMIN_PASSWORD = "your-password"

# bash
export SAS_TEST_ADMIN_EMAIL=your-admin@example.com
export SAS_TEST_ADMIN_PASSWORD=your-password
```

Tests that need `admin_session` are skipped automatically if these aren't set
(e.g. login-page-only tests still run without them).

Other optional env vars (see `conftest.py`):

- `SAS_FRONTEND_URL` — defaults to `http://localhost:3000`
- `SAS_TEST_HEADLESS` — set to `false` to watch the browser run

## 4. Run the tests

```
cd Backend
pytest tests/selenium
```

Run a single file or test:

```
pytest tests/selenium/test_login.py
pytest tests/selenium/test_security_settings.py -k toggle_two_factor
```

## What's covered

- `test_login.py` — form rendering, client-side email validation, invalid
  credentials error, successful login redirect.
- `test_security_settings.py` — page load, toggling "Require 2FA for admins"
  and saving, editing the min password length field.
- `test_audit_trail.py` — page load, module/severity filters actually narrow
  the table, pagination, CSV export button.

## Extending to other pages

The pattern used throughout:

1. Add a stable `data-testid="..."` attribute to the element in the React
   component (selects/checkboxes/buttons had none before this change — text
   and CSS-class selectors break on copy or style edits).
2. Locate it in the test with `driver.find_element(By.CSS_SELECTOR, '[data-testid="..."]')`.
3. Reuse the `admin_session` fixture from `conftest.py` for any page behind
   the admin login.

Follow the same steps for other admin pages (users, shipments, alerts, etc.)
as they get real markup.
