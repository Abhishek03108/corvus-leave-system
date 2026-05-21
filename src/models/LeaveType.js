import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const LeaveType = sequelize.define('LeaveType', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
  },
  defaultQuota: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'default_quota',
  },
}, {
  tableName: 'leave_types',
  timestamps: false,
  underscored: true,
});

export default LeaveType;
