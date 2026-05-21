import * as leaveService from '../services/leaveService.js';

export const applyLeave = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const ipAddress = req.ip;
    const result = await leaveService.applyLeave(userId, req.body, ipAddress);
    return res.status(201).json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const updateStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const managerId = req.user.id;
    const { status, managerComment } = req.body;
    const ipAddress = req.ip;

    const result = await leaveService.updateLeaveStatus(id, managerId, status, managerComment, ipAddress);
    return res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getPersonalBalances = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const result = await leaveService.getPersonalBalances(userId);
    return res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getPersonalRequests = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const result = await leaveService.getPersonalRequests(userId);
    return res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getTeamRequests = async (req, res, next) => {
  try {
    const managerUser = req.user;
    const result = await leaveService.getTeamRequests(managerUser);
    return res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const updateMedicalDocument = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { medicalDocumentPath } = req.body;
    const ipAddress = req.ip;

    const result = await leaveService.updateMedicalDocument(id, userId, medicalDocumentPath, ipAddress);
    return res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
