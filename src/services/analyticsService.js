import { Op } from 'sequelize';
import { User, LeaveRequest, LeaveType } from '../models/index.js';
import { BadRequestError } from '../utils/errors.js';

// Define standard studio departments
const STUDIO_DEPARTMENTS = ['Production', 'Creative', 'Engineering', 'Leadership', 'Operations'];
const LEAVE_RISK_THRESHOLD = 2; // Threshold for warning when multiple people from same dept are off

export const getMonthlyLeaveAnalytics = async (month, year, filters, currentUser) => {
  const selectedMonth = parseInt(month) || new Date().getMonth() + 1;
  const selectedYear = parseInt(year) || new Date().getFullYear();

  if (selectedMonth < 1 || selectedMonth > 12) {
    throw new BadRequestError('Month must be between 1 and 12.');
  }

  // Calculate first and last day of month
  const startDateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
  const tempDate = new Date(selectedYear, selectedMonth, 0); // last day of month
  const endDateStr = tempDate.toISOString().split('T')[0];
  const daysInMonth = tempDate.getDate();

  // Define database query filters
  const whereClause = {
    status: {
      [Op.ne]: 'rejected',
    },
    fromDate: {
      [Op.lte]: endDateStr,
    },
    toDate: {
      [Op.gte]: startDateStr,
    },
  };

  // RBAC & Filter implementation (Nihar Shah behaves as second admin)
  if (currentUser.role === 'manager' && currentUser.workEmail !== 'nihar@thecorvusstudio.com') {
    // Managers can only see people in their department
    whereClause['$user.department$'] = currentUser.department;
  } else if (filters.department) {
    whereClause['$user.department$'] = filters.department;
  }

  if (filters.leaveTypeId) {
    whereClause.leaveTypeId = filters.leaveTypeId;
  }
  if (filters.status) {
    whereClause.status = filters.status;
  }

  const requests = await LeaveRequest.findAll({
    where: whereClause,
    include: [
      {
        model: User,
        as: 'user',
        attributes: ['fullName', 'department', 'employeeType', 'role'],
      },
      {
        model: LeaveType,
        as: 'leaveType',
        attributes: ['name'],
      },
    ],
  });

  // Analytics Structures
  const daysData = {};
  const tooltips = {};
  const riskAlerts = {};
  const departmentsFound = new Set();

  for (let d = 1; d <= daysInMonth; d++) {
    daysData[d] = {};
    tooltips[d] = [];
  }

  requests.forEach((req) => {
    const dept = req.user.department || 'Unassigned';
    departmentsFound.add(dept);

    const fromTs = new Date(req.fromDate).getTime();
    const toTs = new Date(req.toDate).getTime();

    // Privacy Masking for employees
    const maskedName = currentUser.role === 'employee' ? 'Team Member' : req.user.fullName;

    for (let d = 1; d <= daysInMonth; d++) {
      const currentDateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const currentTs = new Date(currentDateStr).getTime();

      if (currentTs >= fromTs && currentTs <= toTs) {
        // Person is on leave on this day
        if (!daysData[d][dept]) {
          daysData[d][dept] = 0;
        }

        const leaveCountDelta = req.isHalfDay ? 0.5 : 1;
        daysData[d][dept] += leaveCountDelta;

        tooltips[d].push({
          employeeName: maskedName,
          department: dept,
          leaveType: req.leaveType.name,
          status: req.status,
          dates: `${req.fromDate} to ${req.toDate}`,
        });

        // Trigger Risk Threshold Check
        if (daysData[d][dept] > LEAVE_RISK_THRESHOLD) {
          if (!riskAlerts[currentDateStr]) {
            riskAlerts[currentDateStr] = [];
          }
          if (!riskAlerts[currentDateStr].includes(dept)) {
            riskAlerts[currentDateStr].push(dept);
          }
        }
      }
    }
  });

  // Assemble Series
  const uniqueDepts = Array.from(new Set([...STUDIO_DEPARTMENTS, ...departmentsFound]));
  const series = [];

  uniqueDepts.forEach((dept) => {
    // If manager, only output their own department series (Nihar behaves as second admin)
    if (currentUser.role === 'manager' && currentUser.workEmail !== 'nihar@thecorvusstudio.com' && dept !== currentUser.department) {
      return;
    }

    const dataPoints = [];
    for (let d = 1; d <= daysInMonth; d++) {
      dataPoints.push(daysData[d][dept] || 0);
    }

    series.push({
      name: dept,
      data: dataPoints,
    });
  });

  return {
    series,
    tooltips,
    daysInMonth,
    riskAlerts,
    monthName: tempDate.toLocaleString('default', { month: 'long', year: 'numeric' }),
  };
};

/**
 * Enterprise Add-on: Returns general system statistics for Dashboard KPI Cards
 */
export const getDashboardStats = async (currentUser) => {
  const whereClause = {};

  if (currentUser.role === 'manager' && currentUser.workEmail !== 'nihar@thecorvusstudio.com') {
    whereClause['$user.department$'] = currentUser.department;
  }

  // 1. Pending approval requests
  const pendingCount = await LeaveRequest.count({
    where: {
      ...whereClause,
      status: { [Op.in]: ['pending', 'pending_medical'] },
    },
    include: [{ model: User, as: 'user' }],
  });

  // 2. Active employees count
  const employeeCount = (currentUser.role === 'manager' && currentUser.workEmail !== 'nihar@thecorvusstudio.com')
    ? await User.count({ where: { department: currentUser.department, status: 'active' } })
    : await User.count({ where: { status: 'active' } });

  // 3. Today's active leaves
  const todayStr = new Date().toISOString().split('T')[0];
  const todayLeaves = await LeaveRequest.findAll({
    where: {
      ...whereClause,
      status: 'approved',
      fromDate: { [Op.lte]: todayStr },
      toDate: { [Op.gte]: todayStr },
    },
    include: [{ model: User, as: 'user', attributes: ['fullName', 'department', 'designation'] }],
  });

  return {
    pendingApprovals: pendingCount,
    activeEmployees: employeeCount,
    todayOnLeaveCount: todayLeaves.length,
    todayOnLeaveList: todayLeaves.map((l) => ({
      fullName: l.user.fullName,
      department: l.user.department,
      designation: l.user.designation,
    })),
  };
};
