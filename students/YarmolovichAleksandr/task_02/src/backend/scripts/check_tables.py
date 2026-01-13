import sqlite3
con = sqlite3.connect('instance/dev.db')
cur = con.cursor()
cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
print(cur.fetchall())
con.close()