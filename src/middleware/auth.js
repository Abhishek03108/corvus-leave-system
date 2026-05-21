import { verifyToken } from '../utils/jwt.js';

export const auth = async (c, next) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json(
      { status: 'fail', message: 'Unauthorized: Missing or invalid token format.' },
      401
    );
  }

  const token = authHeader.substring(7);
  try {
    const payload = await verifyToken(token, c.env.JWT_SECRET);
    c.set('user', payload);
    await next();
  } catch (error) {
    return c.json(
      { status: 'fail', message: 'Unauthorized: Invalid or expired token.' },
      401
    );
  }
};
