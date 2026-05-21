import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const LeaveRequest = sequelize.define('LeaveRequest', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'user_id',
  },
  leaveTypeId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'leave_type_id',
  },
  fromDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    field: 'from_date',
  },
  toDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    field: 'to_date',
  },
  isHalfDay: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_half_day',
  },
  leaveCount: {
    type: DataTypes.DECIMAL(5, 1),
    allowNull: false,
    field: 'leave_count',
  },
  reason: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('pending', 'pending_medical', 'approved', 'rejected'),
    defaultValue: 'pending',
    allowNull: false,
  },
  managerComment: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'manager_comment',
  },
  medicalDocumentPath: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'medical_document_path',
  },
}, {
  tableName: 'leave_requests',
  timestamps: true,
  underscored: true,
});

export default LeaveRequest;
