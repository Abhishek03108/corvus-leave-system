import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const HolidayRule = sequelize.define('HolidayRule', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
  },
  type: {
    type: DataTypes.ENUM('fixed', 'variable'),
    allowNull: false,
  },
  fixedMonth: {
    type: DataTypes.INTEGER
  },
  
  fixedDay: {
    type: DataTypes.INTEGER
  },
  seededDate2026: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    field: 'seeded_date_2026',
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active',
  },
}, {
  tableName: 'holiday_rules',
  timestamps: false,
  underscored: true,
});

export default HolidayRule;
