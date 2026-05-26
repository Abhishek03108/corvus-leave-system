-- Step 1: Add only the truly missing columns to users
ALTER TABLE users ADD COLUMN employee_type TEXT DEFAULT 'Full Time';
ALTER TABLE users ADD COLUMN personal_email TEXT;

-- Step 2: Create missing tables
CREATE TABLE IF NOT EXISTS leave_types (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  default_quota INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS leave_balances (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  leave_type_id INTEGER NOT NULL,
  balance REAL NOT NULL DEFAULT 0,
  used REAL NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, leave_type_id)
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  action TEXT NOT NULL,
  performed_by INTEGER,
  target_user_id INTEGER,
  details TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Step 3: Update existing Raj Kishore with full data
UPDATE users SET
  full_name = 'Raj Kishore Kumar',
  designation = 'CEO',
  department = 'Leadership',
  employee_type = 'Full Time',
  joining_date = '2026-02-08',
  contact_number = '8709810330',
  personal_email = 'rajkishorek.3d@gmail.com'
WHERE work_email = 'raj@thecorvusstudio.com';

-- Step 4: Insert all 13 remaining employees
INSERT OR IGNORE INTO users (full_name, work_email, role, status, designation, department, employee_type, joining_date, contact_number, personal_email) VALUES
('Yash Divraniya',          'yash@thecorvusstudio.com',    'admin',          'active', 'Co-Founder',                        'Leadership',  'Full Time',  '2026-02-08', '9879106762', 'yroy357@gmail.com'),
('Soumya Muralidhar Achari','soumya@thecorvusstudio.com',  'manager',        'active', 'Executive Lead (Operations / HR)',   'Operations',  'Full Time',  '2026-02-08', '9449102046', 'soumyaachari2004@gmail.com'),
('Nihar Shah',              'nihar@thecorvusstudio.com',   'senior_manager', 'active', 'COO / Engineering',                 'Engineering', 'Full Time',  '2026-02-08', '8401880741', 'niharshah200206@gmail.com'),
('Aryan Murali',            'aryan@thecorvusstudio.com',   'manager',        'active', 'Team Lead',                         'Production',  'Freelancer', '2026-02-08', '9727179331', 'aaryankandampully@gmail.com'),
('Keshav Bheemanapalli',    'keshav@thecorvusstudio.com',  'employee',       'active', 'Creative Head',                     'Creative',    'Freelancer', '2026-02-08', '9346190608', 'keshavbheemanapalli@gmail.com'),
('Prajwal T R',             'prajwal@thecorvusstudio.com', 'employee',       'active', '2D/3D Artist',                      'Production',  'Intern',     '2026-12-02', '9482628754', 'trprajwal531@gmail.com'),
('Tanya K',                 'tanya@thecorvusstudio.com',   'employee',       'active', '2D Artist',                         'Creative',    'Intern',     '2026-02-10', '7411394691', 'tan142k3@gmail.com'),
('Sanchit Thakur',          'sanchit@thecorvusstudio.com', 'employee',       'active', 'Concept Artist',                    'Creative',    'Intern',     '2026-02-22', '6204337530', 'thakur.sanchit64@gmail.com'),
('Chintan P',               'chintan@thecorvusstudio.com', 'employee',       'active', '3D Modeler',                        'Production',  'Freelancer', '2026-03-07', '8511706745', 'chintanpadhiyar1155@gmail.com'),
('Ronika Walia',            'ronika@thecorvusstudio.com',  'employee',       'active', '3D Artist',                         'Production',  'Intern',     '2026-03-30', '7973770135', 'ronikawalia872@gmail.com'),
('Ruchita Keshkamat',       'ruchita@thecorvusstudio.com', 'employee',       'active', '3D Modeller',                       'Production',  'Intern',     '2026-05-09', '9049327256', 'ruchitakeshkamatp013@gmail.com'),
('Arjun A.R Nair',          'arjun@thecorvusstudio.com',   'employee',       'active', '3D Modeller',                       'Production',  'Intern',     '2026-05-13', '9148751624', 'arjunarn0019@gmail.com'),
('Sujan Khunti',            'sujan@thecorvusstudio.com',   'employee',       'active', 'Concept Artist',                    'Creative',    'Intern',     '2026-05-11', '9104587150', 'maybesujan911@gmail.com');

-- Step 5: Seed leave types
INSERT OR IGNORE INTO leave_types (id, name, default_quota) VALUES
(1, 'Sick Leave', 7),
(2, 'Casual Leave', 10);

-- Step 6: Seed leave balances for every user x every leave type
INSERT OR IGNORE INTO leave_balances (user_id, leave_type_id, balance, used)
SELECT u.id, lt.id, lt.default_quota, 0
FROM users u
CROSS JOIN leave_types lt;
