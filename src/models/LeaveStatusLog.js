import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const LeaveStatusLog = sequelize.define('LeaveStatusLog', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  leaveRequestId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'leave_request_id',
  },
  changedBy: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'changed_by',
  },
  oldStatus: {
    type: DataTypes.STRING(20),
    allowNull: true,
    field: 'old_status',
  },
  newStatus: {
    type: DataTypes.STRING(20),
    allowNull: true,
    field: 'new_status',
  },
  comment: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: 'leave_request_status_logs',
  timestamps: true,
  updatedAt: false, // only logs creation
  underscored: true,
});

export default LeaveStatusLog;
