import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../Models/User.js';

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

interface AuthenticatedRequest extends Request {
    user?: {
        email: string;
        userId: string;
    };
}

export const authenticateToken = async (
    req: AuthenticatedRequest, 
    res: Response, 
    next: NextFunction
) => {
    try {
        const token = req.cookies.authToken;
        if (!token) {
            return res.status(401).json({ message: 'Access token required' });
        }
        jwt.verify(token, JWT_SECRET, async (err: any, decoded: any) => {
            if (err) {
                return res.status(403).json({ message: 'Invalid or expired token' });
            }
            try {
                const user = await User.findOne({ email: decoded.data });
                if (!user) {
                    return res.status(404).json({ message: 'User not found' });
                }
                req.user = {
                    email: decoded.data,
                    userId: decoded.userId 
                };
                next();
            } catch (dbError) {
                console.error('Database error in auth middleware:', dbError);
                return res.status(500).json({ message: 'Database error' });
            }
        });
    } catch (error) {
        console.error('Auth middleware error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};