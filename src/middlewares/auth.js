import { verifyToken, extractToken } from '../utils/auth.js';

export default async function authenticate(request, reply) {
  const authHeader = request.headers.authorization;
  const token = extractToken(authHeader);
  
  if (!token) {
    return reply.code(401).send({ success: false, message: 'No token provided' });
  }
  
  const decoded = verifyToken(token);
  
  if (!decoded) {
    return reply.code(401).send({ success: false, message: 'Invalid or expired token' });
  }
  
  request.user = decoded;
};
