import { Op } from 'sequelize';
import sequelize from '../config/database.js';
import { User, LeaveType, LeaveBalance, LeaveRequest, LeaveStatusLog, Holiday, AuditLog } from '../models/index.js';
import { sendLeaveStatusEmail, sendLeaveAppliedEmail } from './mailService.js';
import { BadRequestError, NotFoundError, ForbiddenError } from '../utils/errors.js';

/**
 * Calculates working days between two dates, excluding weekends and official holidays
 */
export const calculateWorkingDays = async (fromDateStr, toDateStr, isHalfDay = false) => {
  if (isHalfDay) return 0.5;

  const start = new Date(fromDateStr);
  const end = new Date(toDateStr);
  
  if (start > end) {
    throw new BadRequestError('Start date cannot be after end date.');
  }

  // Fetch all holidays falling within the date range
  const holidays = await Holiday.findAll({
    where: {
      holidayDate: {
        [Op.between]: [fromDateStr, toDateStr],
      },
    },
  });

  const holidayDates = new Set(holidays.map(h => h.holidayDate));
  let count = 0;
  let current = new Date(start);

  while (current <= end) {
    const dayOfWeek = current.getDay();
    const dateStr = current.toISOString().split('T')[0];

    // Exclude Sunday (0) and Saturday (6) and official holidays
    if (dayOfWeek !== 0 && dayOfWeek !== 6 && !holidayDates.has(dateStr)) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }

  return count;
};

export const applyLeave = async (userId, data, ipAddress) => {
  const { leaveTypeId, fromDate, toDate, isHalfDay, reason, medicalDocumentPath } = data;

  const leaveType = await LeaveType.findByPk(leaveTypeId);
  if (!leaveType) {
    throw new NotFoundError('Selected leave type does not exist.');
  }

  const leaveCount = await calculateWorkingDays(fromDate, toDate, isHalfDay);
  if (leaveCount === 0) {
    throw new BadRequestError('Selected date range contains no working days (weekends or holidays only).');
  }

  // Fetch user balance
  const leaveBalance = await LeaveBalance.findOne({
    where: { userId, leaveTypeId },
  });

  if (!leaveBalance) {
    throw new NotFoundError('Leave balance record not found for this user.');
  }

  // Fetch pending leaves count to prevent double booking
  const pendingRequests = await LeaveRequest.findAll({
    where: {
      userId,
      leaveTypeId,
      status: { [Op.in]: ['pending', 'pending_medical'] },
    },
  });

  const pendingCount = pendingRequests.reduce((sum, req) => sum + parseFloat(req.leaveCount), 0);
  const availableBalance = parseFloat(leaveBalance.balance) - pendingCount;

  if (leaveCount > availableBalance) {
    throw new BadRequestError(`Insufficient leave balance. Requested: ${leaveCount}, Available (excluding pending requests): ${availableBalance}`);
  }

  // Sick Leave Compliance Rule:
  // If Leave Type is "Sick Leave" and count >= 3 days, medical certificate document must be provided.
  let status = 'pending';
  if (leaveType.name.toLowerCase().includes('sick') && leaveCount >= 3) {
    if (!medicalDocumentPath) {
      status = 'pending_medical'; // flag as pending medical compliance
    }
  }

  const newRequest = await LeaveRequest.create({
    userId,
    leaveTypeId,
    fromDate,
    toDate,
    isHalfDay,
    leaveCount,
    reason,
    status,
    medicalDocumentPath,
  });

  // Create audit log
  await AuditLog.create({
    userId,
    action: 'LEAVE_APPLIED',
    details: `Applied for ${leaveCount} day(s) of ${leaveType.name} from ${fromDate} to ${toDate}. Status: ${status}`,
    ipAddress,
  });

  const user = await User.findByPk(userId);
  const employeeName = user ? user.fullName : 'Employee';

  // Trigger Notification Email async
  sendLeaveAppliedEmail(employeeName, {
    fromDate,
    toDate,
    leaveCount,
    leaveTypeName: leaveType.name,
    reason,
    status
  }).catch(err => console.error('[Notification Applied Email Error]:', err));

  return newRequest;
};

export const updateLeaveStatus = async (requestId, managerId, status, managerComment, ipAddress) => {
  if (!['approved', 'rejected', 'pending_medical'].includes(status)) {
    throw new BadRequestError('Invalid status selection.');
  }

  const transaction = await sequelize.transaction();
  try {
    const request = await LeaveRequest.findByPk(requestId, {
      include: [
        { model: User, as: 'user' },
        { model: LeaveType, as: 'leaveType' },
      ],
      transaction,
    });

    if (!request) {
      throw new NotFoundError('Leave request not found.');
    }

    if (request.status === 'approved' || request.status === 'rejected') {
      throw new BadRequestError('This leave request has already been finalized.');
    }

    if (request.status === 'pending_medical') {
      throw new BadRequestError('Cannot approve/reject a request pending medical document. User must upload document first.');
    }

    const oldStatus = request.status;

    // If approved, deduct from leave balance
    if (status === 'approved') {
      const balanceRecord = await LeaveBalance.findOne({
        where: { userId: request.userId, leaveTypeId: request.leaveTypeId },
        transaction,
      });

      if (!balanceRecord) {
        throw new NotFoundError('Leave balance record not found.');
      }

      if (parseFloat(balanceRecord.balance) < parseFloat(request.leaveCount)) {
        throw new BadRequestError('Employee does not have sufficient leave balance to finalize approval.');
      }

      balanceRecord.balance = parseFloat(balanceRecord.balance) - parseFloat(request.leaveCount);
      await balanceRecord.save({ transaction });
    }

    // Update leave request details
    request.status = status;
    request.managerComment = managerComment;
    await request.save({ transaction });

    // Create status transition log
    await LeaveStatusLog.create({
      leaveRequestId: request.id,
      changedBy: managerId,
      oldStatus,
      newStatus: status,
      comment: managerComment,
    }, { transaction });

    // Create audit log
    await AuditLog.create({
      userId: managerId,
      action: `LEAVE_${status.toUpperCase()}`,
      details: `Leave request ID ${request.id} for employee ${request.user.fullName} was ${status}.`,
      ipAddress,
    }, { transaction });

    await transaction.commit();

    // Trigger Notification Email async
    sendLeaveStatusEmail(request.user.workEmail, request.user.fullName, {
      fromDate: request.fromDate,
      toDate: request.toDate,
      leaveCount: request.leaveCount,
      leaveTypeName: request.leaveType.name,
      status,
      managerComment,
    }).catch(err => console.error('[Notification Email Error]:', err));

    return request;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

export const getPersonalBalances = async (userId) => {
  return await LeaveBalance.findAll({
    where: { userId },
    include: [{ model: LeaveType, as: 'leaveType', attributes: ['name', 'defaultQuota'] }],
  });
};

export const getPersonalRequests = async (userId) => {
  return await LeaveRequest.findAll({
    where: { userId },
    include: [{ model: LeaveType, as: 'leaveType', attributes: ['name'] }],
    order: [['createdAt', 'DESC']],
  });
};

export const getTeamRequests = async (managerUser) => {
  const whereClause = {};

  // Managers only see requests from their department. Admins and senior_managers see all.
  if (managerUser.role === 'manager') {
    whereClause['$user.department$'] = managerUser.department;
  }

  return await LeaveRequest.findAll({
    include: [
      {
        model: User,
        as: 'user',
        attributes: ['fullName', 'department', 'designation', 'profileImage'],
      },
      {
        model: LeaveType,
        as: 'leaveType',
        attributes: ['name'],
      },
    ],
    where: whereClause,
    order: [['createdAt', 'DESC']],
  });
};

export const updateMedicalDocument = async (requestId, userId, medicalDocumentPath, ipAddress) => {
  if (!medicalDocumentPath) {
    throw new BadRequestError('Medical document path / URL is required.');
  }

  const request = await LeaveRequest.findByPk(requestId, {
    include: [{ model: LeaveType, as: 'leaveType' }]
  });

  if (!request) {
    throw new NotFoundError('Leave request not found.');
  }

  // Ensure the request belongs to the user
  if (request.userId !== userId) {
    throw new ForbiddenError('You do not have permission to update this leave request.');
  }

  // Verify the 5-day grace period from the request creation date
  const requestDate = new Date(request.createdAt);
  const diffTime = Date.now() - requestDate.getTime();
  const diffDays = diffTime / (1000 * 60 * 60 * 24);

  if (diffDays > 5) {
    throw new BadRequestError('The 5-day grace period to upload a prescription has expired.');
  }

  // Update the medical document path
  request.medicalDocumentPath = medicalDocumentPath;

  // If the request was previously flagged as pending_medical, transition it to pending
  if (request.status === 'pending_medical') {
    request.status = 'pending';
  }

  await request.save();

  // Create audit log
  await AuditLog.create({
    userId,
    action: 'LEAVE_DOCUMENT_UPLOADED',
    details: `Uploaded medical document for leave request ID ${request.id}. Path: ${medicalDocumentPath}`,
    ipAddress,
  });

  return request;
};
