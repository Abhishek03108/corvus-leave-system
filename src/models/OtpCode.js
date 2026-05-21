import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const OtpCode = sequelize.define(
  'OtpCode',
  {
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },

    otpHash: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  },
  {
    tableName: 'otp_codes',
    timestamps: true,
  }
);

export default OtpCode;
