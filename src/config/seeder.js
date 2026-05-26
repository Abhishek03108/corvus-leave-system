import { User, LeaveType, LeaveBalance, HolidayRule, Holiday } from '../models/index.js';
import sequelize from './database.js';

const LEAVE_TYPES_SEED = [
  { id: '22222222-2222-2222-2222-222222222222', name: 'Sick Leave', defaultQuota: 7 },
  { id: '33333333-3333-3333-3333-333333333333', name: 'Casual Leave', defaultQuota: 10 },
  { id: '44444444-4444-4444-4444-444444444444', name: 'Emergency Leave', defaultQuota: 5 },
];

const USERS_SEED = [
  { id: '85c7a0d4-1a3b-4c4d-9e5f-f6a7b8c9d0e1', fullName: 'Raj Kishore Kumar', workEmail: 'raj@thecorvusstudio.com', designation: 'Founder/CEO', department: 'Leadership', employeeType: 'Full Time', joiningDate: '2026-02-08', contactNumber: '8709810330', personalEmail: 'rajkishorek.3d@gmail.com', role: 'admin', status: 'active' },
  { id: '95c7a0d4-1a3b-4c4d-9e5f-f6a7b8c9d0e2', fullName: 'Yash Divraniya', workEmail: 'yash@thecorvusstudio.com', designation: 'Co-Founder', department: 'Leadership', employeeType: 'Full Time', joiningDate: '2026-02-08', contactNumber: '9879106762', personalEmail: 'yroy357@gmail.com', role: 'admin', status: 'active' },
  { id: 'b5c7a0d4-1a3b-4c4d-9e5f-f6a7b8c9d0e4', fullName: 'Nihar Shah', workEmail: 'nihar@thecorvusstudio.com', designation: 'COO', department: 'Management', employeeType: 'Full Time', joiningDate: '2026-02-08', contactNumber: '8401880741', personalEmail: 'niharshah200206@gmail.com', role: 'senior_manager', status: 'active' },
  { id: 'c5c7a0d4-1a3b-4c4d-9e5f-f6a7b8c9d0e5', fullName: 'Aryan Murali', workEmail: 'aryan@thecorvusstudio.com', designation: 'Team Lead', department: 'Production', employeeType: 'Freelancer', joiningDate: '2026-02-08', contactNumber: '9727179331', personalEmail: 'aaryankandampully@gmail.com', role: 'manager', status: 'active' },
  { id: 'd5c7a0d4-1a3b-4c4d-9e5f-f6a7b8c9d0e6', fullName: 'Keshav Bheemanapalli', workEmail: 'keshav@thecorvusstudio.com', designation: 'Creative Head', department: 'Creative', employeeType: 'Freelancer', joiningDate: '2026-02-08', contactNumber: '9346190608', personalEmail: 'keshavbheemanapalli@gmail.com', role: 'employee', status: 'active' },
  { id: 'e5c7a0d4-1a3b-4c4d-9e5f-f6a7b8c9d0e7', fullName: 'Prajwal T R', workEmail: 'prajwal@thecorvusstudio.com', designation: '2D/3D Artist', department: 'Production', employeeType: 'Intern', joiningDate: '2026-12-02', contactNumber: '9482628754', personalEmail: 'trprajwal531@gmail.com', role: 'employee', status: 'active' },
  { id: '05c7a0d4-1a3b-4c4d-9e5f-f6a7b8c9d0e9', fullName: 'Sanchit Thakur', workEmail: 'sanchit@thecorvusstudio.com', designation: 'Concept Artist', department: 'Creative', employeeType: 'Intern', joiningDate: '2026-02-22', contactNumber: '6204337530', personalEmail: 'thakur.sanchit64@gmail.com', role: 'employee', status: 'active' },
  { id: '15c7a0d4-1a3b-4c4d-9e5f-f6a7b8c9d0ea', fullName: 'Chintan P', workEmail: 'chintan@thecorvusstudio.com', designation: '3D Modeler', department: 'Production', employeeType: 'Freelancer', joiningDate: '2026-03-07', contactNumber: '8511706745', personalEmail: 'chintanpadhiyar1155@gmail.com', role: 'employee', status: 'active' },
  { id: '25c7a0d4-1a3b-4c4d-9e5f-f6a7b8c9d0eb', fullName: 'Ronika Walia', workEmail: 'ronika@thecorvusstudio.com', designation: '3D Artist', department: 'Production', employeeType: 'Intern', joiningDate: '2026-03-30', contactNumber: '7973770135', personalEmail: 'ronikawalia872@gmail.com', role: 'employee', status: 'active' },
  { id: '35c7a0d4-1a3b-4c4d-9e5f-f6a7b8c9d0ec', fullName: 'Ruchita Keshkamat', workEmail: 'ruchita@thecorvusstudio.com', designation: '3D Modeller', department: 'Production', employeeType: 'Intern', joiningDate: '2026-05-09', contactNumber: '9049327256', personalEmail: 'ruchitakeshkamatp013@gmail.com', role: 'employee', status: 'active' },
  { id: '45c7a0d4-1a3b-4c4d-9e5f-f6a7b8c9d0ed', fullName: 'Arjun A.R Nair', workEmail: 'arjun@thecorvusstudio.com', designation: '3D Modeller', department: 'Production', employeeType: 'Intern', joiningDate: '2026-05-13', contactNumber: '9148751624', personalEmail: 'arjunarn0019@gmail.com', role: 'employee', status: 'active' },
  { id: '55c7a0d4-1a3b-4c4d-9e5f-f6a7b8c9d0ee', fullName: 'Sujan Khunti', workEmail: 'sujan@thecorvusstudio.com', designation: 'Concept Artist', department: 'Creative', employeeType: 'Intern', joiningDate: '2026-05-11', contactNumber: '9104587150', personalEmail: 'maybesujan911@gmail.com', role: 'employee', status: 'active' },
];

const HOLIDAY_RULES_SEED = [
  { id: 'a1111111-1111-1111-1111-111111111111', name: 'New Year', type: 'fixed', fixedMonth: 1, fixedDay: 1, seededDate2026: null },
  { id: 'a2222222-2222-2222-2222-222222222222', name: 'Sankranti', type: 'variable', fixedMonth: null, fixedDay: null, seededDate2026: '2026-01-14' },
  { id: 'a3333333-3333-3333-3333-333333333333', name: 'Republic Day', type: 'fixed', fixedMonth: 1, fixedDay: 26, seededDate2026: null },
  { id: 'a4444444-4444-4444-4444-444444444444', name: 'Maha Shivaratri', type: 'variable', fixedMonth: null, fixedDay: null, seededDate2026: '2026-02-15' },
  { id: 'a5555555-5555-5555-5555-555555555555', name: 'Holi', type: 'variable', fixedMonth: null, fixedDay: null, seededDate2026: '2026-03-04' },
  { id: 'a6666666-6666-6666-6666-666666666666', name: 'Ugadi', type: 'variable', fixedMonth: null, fixedDay: null, seededDate2026: '2026-03-20' },
  { id: 'a7777777-7777-7777-7777-777777777777', name: 'Ram Navami', type: 'variable', fixedMonth: null, fixedDay: null, seededDate2026: '2026-03-28' },
  { id: 'a8888888-8888-8888-8888-888888888888', name: 'Ambedkar Jayanthi', type: 'fixed', fixedMonth: 4, fixedDay: 14, seededDate2026: null },
  { id: 'a9999999-9999-9999-9999-999999999999', name: 'May Day', type: 'fixed', fixedMonth: 5, fixedDay: 1, seededDate2026: null },
  { id: 'b1111111-1111-1111-1111-111111111111', name: 'Independence Day', type: 'fixed', fixedMonth: 8, fixedDay: 15, seededDate2026: null },
  { id: 'b2222222-2222-2222-2222-222222222222', name: 'Raksha Bandhan', type: 'variable', fixedMonth: null, fixedDay: null, seededDate2026: '2026-08-28' },
  { id: 'b3333333-3333-3333-3333-333333333333', name: 'Onam', type: 'variable', fixedMonth: null, fixedDay: null, seededDate2026: '2026-08-26' },
  { id: 'b4444444-4444-4444-4444-444444444444', name: 'Ganesh Chaturthi', type: 'variable', fixedMonth: null, fixedDay: null, seededDate2026: '2026-09-14' },
  { id: 'b5555555-5555-5555-5555-555555555555', name: 'Gandhi Jayanti', type: 'fixed', fixedMonth: 10, fixedDay: 2, seededDate2026: null },
  { id: 'b6666666-6666-6666-6666-666666666666', name: 'Dussehra', type: 'variable', fixedMonth: null, fixedDay: null, seededDate2026: '2026-10-19' },
  { id: 'b7777777-7777-7777-7777-777777777777', name: 'Diwali', type: 'variable', fixedMonth: null, fixedDay: null, seededDate2026: '2026-11-08' },
  { id: 'b8888888-8888-8888-8888-888888888888', name: 'Chhath Puja', type: 'variable', fixedMonth: null, fixedDay: null, seededDate2026: '2026-11-14' },
  { id: 'b9999999-9999-9999-9999-999999999999', name: 'Christmas', type: 'fixed', fixedMonth: 12, fixedDay: 25, seededDate2026: null },
];

export const seedDatabase = async () => {
  const transaction = await sequelize.transaction();
  try {
    console.log('[Seeder] Seeding database...');

    // Seed Leave Types
    for (const lt of LEAVE_TYPES_SEED) {
      await LeaveType.findOrCreate({
        where: { id: lt.id },
        defaults: lt,
        transaction,
      });
    }
    console.log('[Seeder] Leave Types seeded.');

    // Seed Users and Leave Balances
    for (const u of USERS_SEED) {
      const [userInstance, created] = await User.findOrCreate({
        where: { id: u.id },
        defaults: u,
        transaction,
      });

      if (!created) {
        await userInstance.update({
          fullName: u.fullName,
          designation: u.designation,
          department: u.department,
          employeeType: u.employeeType,
          joiningDate: u.joiningDate,
          contactNumber: u.contactNumber,
          personalEmail: u.personalEmail,
          role: u.role,
          status: u.status,
        }, { transaction });
      }

      // Create leave balances if not already present
      for (const lt of LEAVE_TYPES_SEED) {
        await LeaveBalance.findOrCreate({
          where: { userId: userInstance.id, leaveTypeId: lt.id },
          defaults: {
            balance: lt.defaultQuota,
          },
          transaction,
        });
      }
    }
    console.log('[Seeder] Users & Leave Balances seeded.');

    // Seed Holiday Rules & Holidays (for 2026)
    for (const hr of HOLIDAY_RULES_SEED) {
      const [rule] = await HolidayRule.findOrCreate({
        where: { id: hr.id },
        defaults: hr,
        transaction,
      });

      // Generate Holiday Date
      let holidayDate = null;
      if (hr.type === 'fixed') {
        holidayDate = `2026-${String(hr.fixedMonth).padStart(2, '0')}-${String(hr.fixedDay).padStart(2, '0')}`;
      } else {
        holidayDate = hr.seededDate2026;
      }

      if (holidayDate) {
        await Holiday.findOrCreate({
          where: { ruleId: rule.id },
          defaults: {
            ruleId: rule.id,
            holidayDate,
            name: hr.name,
          },
          transaction,
        });
      }
    }
    console.log('[Seeder] Holiday Rules & Holidays (2026) seeded.');

    await transaction.commit();
    console.log('[Seeder] Seeding completed successfully.');
  } catch (error) {
    await transaction.rollback();
    console.error('[Seeder] Seeding failed:', error);
    throw error;
  }
};

// Check if this script was executed directly
if (process.argv[1]?.endsWith('seeder.js')) {
  (async () => {
    try {
      await sequelize.authenticate();
      await seedDatabase();
      process.exit(0);
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  })();
}
