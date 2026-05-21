import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  fullName: {
    type: DataTypes.STRING(150),
    allowNull: false,
    field: 'full_name',
  },
  workEmail: {
    type: DataTypes.STRING(190),
    allowNull: false,
    unique: true,
    field: 'work_email',
    validate: {
      isEmail: true,
      isWorkEmail(value) {
        if (!value.endsWith('@thecorvusstudio.com')) {
          throw new Error('Only emails ending with @thecorvusstudio.com are allowed.');
        }
      },
    },
  },
  personalEmail: {
    type: DataTypes.STRING(190),
    allowNull: true,
    field: 'personal_email',
    validate: {
      isEmail: true,
    },
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  designation: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  department: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  employeeType: {
    type: DataTypes.ENUM('Intern', 'Part Time', 'Freelancer', 'Full Time'),
    defaultValue: 'Full Time',
    allowNull: false,
    field: 'employee_type',
  },
  joiningDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    field: 'joining_date',
  },
  contactNumber: {
    type: DataTypes.STRING(20),
    allowNull: true,
    field: 'contact_number',
  },
  profileImage: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'profile_image',
  },
  location: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  gender: {
    type: DataTypes.ENUM('Male', 'Female', 'Other'),
    allowNull: true,
  },
  role: {
    type: DataTypes.ENUM('employee', 'manager', 'senior_manager', 'admin'),
    defaultValue: 'employee',
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive'),
    defaultValue: 'active',
    allowNull: false,
  },
}, {
  tableName: 'users',
  timestamps: true,
  underscored: true,
});

export default User;
