import * as adminService from '../services/adminService.js';

export const createEmployee = async (req, res, next) => {
  try {
    const adminId = req.user.id;
    const ipAddress = req.ip;
    const result = await adminService.createEmployee(adminId, req.body, ipAddress);
    return res.status(201).json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const updateEmployee = async (req, res, next) => {
  try {
    const adminId = req.user.id;
    const { id } = req.params;
    const ipAddress = req.ip;
    const result = await adminService.updateEmployee(adminId, id, req.body, ipAddress);
    return res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getAuditLogs = async (req, res, next) => {
  try {
    const result = await adminService.getAuditLogs();
    return res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const overrideLeaveBalance = async (req, res, next) => {
  try {
    const adminId = req.user.id;
    const { employeeId, leaveTypeId, newBalance } = req.body;
    const ipAddress = req.ip;
    
    const result = await adminService.overrideLeaveBalance(adminId, employeeId, leaveTypeId, newBalance, ipAddress);
    return res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
