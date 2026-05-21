import { User, LeaveBalance, LeaveType, AuditLog } from '../models/index.js';
import { BadRequestError, NotFoundError } from '../utils/errors.js';

export const createEmployee = async (adminId, data, ipAddress) => {
  const { fullName, workEmail, personalEmail, designation, department, employeeType, joiningDate, contactNumber, location, gender, role } = data;

  const normalizedEmail = workEmail.toLowerCase().trim();
  if (!normalizedEmail.endsWith('@thecorvusstudio.com')) {
    throw new BadRequestError('Access restricted to @thecorvusstudio.com domains.');
  }

  const existing = await User.findOne({ where: { workEmail: normalizedEmail } });
  if (existing) {
    throw new BadRequestError('An employee with this work email already exists.');
  }

  // Create User
  const user = await User.create({
    fullName,
    workEmail: normalizedEmail,
    personalEmail,
    designation,
    department,
    employeeType,
    joiningDate,
    contactNumber,
    location,
    gender,
    role,
  });

  // Automatically initialize leave balances
  const leaveTypes = await LeaveType.findAll();
  for (const lt of leaveTypes) {
    await LeaveBalance.create({
      userId: user.id,
      leaveTypeId: lt.id,
      balance: lt.defaultQuota,
    });
  }

  await AuditLog.create({
    userId: adminId,
    action: 'EMPLOYEE_CREATED',
    details: `Created user ${user.fullName} (${user.workEmail}) with role ${user.role}.`,
    ipAddress,
  });

  return user;
};

export const updateEmployee = async (adminId, employeeId, data, ipAddress) => {
  const user = await User.findByPk(employeeId);
  if (!user) {
    throw new NotFoundError('Employee not found.');
  }

  const { fullName, designation, department, employeeType, status, role, contactNumber, location } = data;

  user.fullName = fullName !== undefined ? fullName : user.fullName;
  user.designation = designation !== undefined ? designation : user.designation;
  user.department = department !== undefined ? department : user.department;
  user.employeeType = employeeType !== undefined ? employeeType : user.employeeType;
  user.status = status !== undefined ? status : user.status;
  user.role = role !== undefined ? role : user.role;
  user.contactNumber = contactNumber !== undefined ? contactNumber : user.contactNumber;
  user.location = location !== undefined ? location : user.location;

  await user.save();

  await AuditLog.create({
    userId: adminId,
    action: 'EMPLOYEE_UPDATED',
    details: `Updated info for ${user.fullName} (${user.workEmail}).`,
    ipAddress,
  });

  return user;
};

export const getAuditLogs = async () => {
  return await AuditLog.findAll({
    include: [{ model: User, as: 'user', attributes: ['fullName', 'workEmail'] }],
    order: [['createdAt', 'DESC']],
  });
};

export const overrideLeaveBalance = async (adminId, employeeId, leaveTypeId, newBalance, ipAddress) => {
  const balanceRecord = await LeaveBalance.findOne({
    where: { userId: employeeId, leaveTypeId },
    include: [{ model: LeaveType, as: 'leaveType' }, { model: User, as: 'user' }],
  });

  if (!balanceRecord) {
    throw new NotFoundError('Leave balance record not found.');
  }

  const oldBalance = balanceRecord.balance;
  balanceRecord.balance = newBalance;
  await balanceRecord.save();

  await AuditLog.create({
    userId: adminId,
    action: 'BALANCE_OVERRIDDEN',
    details: `Override leave balance of ${balanceRecord.leaveType.name} for ${balanceRecord.user.fullName}. Old: ${oldBalance}, New: ${newBalance}.`,
    ipAddress,
  });

  return balanceRecord;
};
