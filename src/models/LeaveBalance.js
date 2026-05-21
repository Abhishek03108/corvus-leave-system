import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const LeaveBalance = sequelize.define('LeaveBalance', {
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
  balance: {
    type: DataTypes.DECIMAL(5, 1),
    allowNull: false,
  },
}, {
  tableName: 'leave_balances',
  timestamps: false,
  underscored: true,
});

export default LeaveBalance;
