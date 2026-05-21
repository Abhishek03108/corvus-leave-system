import User from './User.js';
import LeaveType from './LeaveType.js';
import LeaveBalance from './LeaveBalance.js';
import LeaveRequest from './LeaveRequest.js';
import LeaveStatusLog from './LeaveStatusLog.js';
import HolidayRule from './HolidayRule.js';
import Holiday from './Holiday.js';
import AuditLog from './AuditLog.js';
import OtpCode from './OtpCode.js';

// User & LeaveBalance
User.hasMany(LeaveBalance, { foreignKey: 'userId', as: 'leaveBalances', onDelete: 'CASCADE' });
LeaveBalance.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// LeaveType & LeaveBalance
LeaveType.hasMany(LeaveBalance, { foreignKey: 'leaveTypeId', as: 'leaveBalances', onDelete: 'CASCADE' });
LeaveBalance.belongsTo(LeaveType, { foreignKey: 'leaveTypeId', as: 'leaveType' });

// User & LeaveRequest
User.hasMany(LeaveRequest, { foreignKey: 'userId', as: 'leaveRequests', onDelete: 'CASCADE' });
LeaveRequest.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// LeaveType & LeaveRequest
LeaveType.hasMany(LeaveRequest, { foreignKey: 'leaveTypeId', as: 'leaveRequests', onDelete: 'CASCADE' });
LeaveRequest.belongsTo(LeaveType, { foreignKey: 'leaveTypeId', as: 'leaveType' });

// LeaveRequest & LeaveStatusLog
LeaveRequest.hasMany(LeaveStatusLog, { foreignKey: 'leaveRequestId', as: 'statusLogs', onDelete: 'CASCADE' });
LeaveStatusLog.belongsTo(LeaveRequest, { foreignKey: 'leaveRequestId', as: 'leaveRequest' });

// User & LeaveStatusLog (Who changed it)
User.hasMany(LeaveStatusLog, { foreignKey: 'changedBy', as: 'statusLogsChanged', onDelete: 'RESTRICT' });
LeaveStatusLog.belongsTo(User, { foreignKey: 'changedBy', as: 'changedByUser' });

// HolidayRule & Holiday
HolidayRule.hasMany(Holiday, { foreignKey: 'ruleId', as: 'holidays', onDelete: 'CASCADE' });
Holiday.belongsTo(HolidayRule, { foreignKey: 'ruleId', as: 'rule' });

// User & AuditLog
User.hasMany(AuditLog, { foreignKey: 'userId', as: 'auditLogs', onDelete: 'SET NULL' });
AuditLog.belongsTo(User, { foreignKey: 'userId', as: 'user' });

export {
  User,
  LeaveType,
  LeaveBalance,
  LeaveRequest,
  LeaveStatusLog,
  HolidayRule,
  Holiday,
  AuditLog,
  OtpCode,
};
