import { User, LeaveBalance, LeaveType, AuditLog } from '../models/index.js';
import { BadRequestError, NotFoundError } from '../utils/errors.js';

export const getUserProfile = async (userId) => {
  const user = await User.findByPk(userId);
  if (!user) {
    throw new NotFoundError('Employee profile not found.');
  }
  return user;
};

export const updateProfile = async (userId, data, ipAddress) => {
  const user = await User.findByPk(userId);
  if (!user) {
    throw new NotFoundError('Employee profile not found.');
  }

  const { personalEmail, contactNumber, profileImage, location, gender } = data;

  user.personalEmail = personalEmail !== undefined ? personalEmail : user.personalEmail;
  user.contactNumber = contactNumber !== undefined ? contactNumber : user.contactNumber;
  user.profileImage = profileImage !== undefined ? profileImage : user.profileImage;
  user.location = location !== undefined ? location : user.location;
  user.gender = gender !== undefined ? gender : user.gender;

  await user.save();

  await AuditLog.create({
    userId,
    action: 'PROFILE_UPDATED',
    details: 'User updated personal profile fields.',
    ipAddress,
  });

  return user;
};

export const getEmployeeList = async (currentUser) => {
  // Employees/Managers can see a list of team members (stripped down payload for privacy)
  const attributes = ['id', 'fullName', 'designation', 'department', 'employeeType', 'joiningDate', 'profileImage', 'status'];
  
  if (currentUser.role === 'employee') {
    return await User.findAll({
      where: { status: 'active' },
      attributes,
      order: [['fullName', 'ASC']],
    });
  }

  // Managers and Admins can see all user details
  return await User.findAll({
    order: [['fullName', 'ASC']],
  });
};
