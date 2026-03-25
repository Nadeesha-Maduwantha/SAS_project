# services/sqlite_service.py
import sqlite3

def get_db():
    conn = sqlite3.connect('test.db')
    conn.row_factory = sqlite3.Row
    # Create table if not exists
    conn.execute('''
        CREATE TABLE IF NOT EXISTS profiles (
            id TEXT PRIMARY KEY,
            email TEXT,
            full_name TEXT,
            age INTEGER,
            ethnicity TEXT,
            role TEXT,
            department TEXT,
            address TEXT,
            created_at TEXT,
            updated_at TEXT
        )
    ''')
    conn.commit()
    return conn
