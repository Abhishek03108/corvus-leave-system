import { SignJWT, jwtVerify } from 'jose';

const getSecret = (value) => new TextEncoder().encode(value);

export const signAccessToken = async ({ userId, role, email }, secret) => {
  return await new SignJWT({ userId, role, email })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getSecret(secret));
};

export const signRefreshToken = async ({ userId }, secret) => {
  return await new SignJWT({ userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getSecret(secret));
};

export const verifyToken = async (token, secret) => {
  const { payload } = await jwtVerify(token, getSecret(secret));
  return payload;
};
