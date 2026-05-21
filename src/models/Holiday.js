import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Holiday = sequelize.define('Holiday', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  ruleId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'rule_id',
  },
  holidayDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    unique: true,
    field: 'holiday_date',
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
}, {
  tableName: 'holidays',
  timestamps: false,
  underscored: true,
});

export default Holiday;
