import { verifyToken } from '../utils/token.js';
import prisma from '../utils/prisma.js';

export const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];

      const decoded = verifyToken(token);
      
      if (decoded.role === 'Passenger') {
        req.user = await prisma.user.findUnique({ where: { id: decoded.id } });
      } else if (decoded.role === 'Driver') {
        req.user = await prisma.driver.findUnique({ where: { id: decoded.id } });
      } else if (decoded.role === 'Admin') {
        req.user = await prisma.admin.findUnique({ where: { id: decoded.id } });
      } else {
        throw new Error('Invalid role in token');
      }
      
      if (!req.user) {
         res.status(401);
         throw new Error('User not found');
      }

      req.user.role = decoded.role;
      next();
    } catch (error) {
      res.status(401);
      next(new Error('Not authorized, token failed'));
    }
  }

  if (!token) {
    res.status(401);
    next(new Error('Not authorized, no token'));
  }
};

export const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'Admin') {
    next();
  } else {
    res.status(403);
    next(new Error('Admin access only'));
  }
};
