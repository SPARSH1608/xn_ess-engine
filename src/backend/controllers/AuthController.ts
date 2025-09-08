import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { Resend } from 'resend';
import { User } from '../Models/User.js';
import { v4 as uuid } from 'uuid';
import { sendToKafka } from '../utils/KakfaFunctions.js';
import dotenv from 'dotenv'
dotenv.config()
const resend = new Resend(process.env.RESEND_API_KEY);
console.log('Resend API Key:', process.env.RESEND_API_KEY); 
const JWT_SECRET = process.env.JWT_SECRET || 'secret';

function sendMail(email: string, link: string) {
    console.log('------------', email, link);
    return resend.emails.send({
        from: 'onboarding@resend.dev',
        to: email,
        subject: 'Magic Link - Access Your Trading Account',
        html: `
            <h2>Welcome to Trading Platform</h2>
            <p>Click the link below to access your account:</p>
            <a href="${link}" style="background-color: #4CAF50; color: white; padding: 14px 20px; text-align: center; text-decoration: none; display: inline-block; border-radius: 4px;">
                Access Account
            </a>
            <p>This link expires in 1 hour.</p>
            <p>If you didn't request this, please ignore this email.</p>
        `
    });
}

export const signup: RequestHandler = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ message: 'Email is required' });
        }

        let existingUser = await User.findOne({ email });
        
        if (!existingUser) {
            const userId = uuid();
            const newUser = new User({
                userId,
                email,
                trades: []
            });
            
            await newUser.save();
            existingUser = newUser;
        }

        jwt.sign(
            { data: email, userId: existingUser.userId }, 
            JWT_SECRET, 
            { expiresIn: '1h' }, 
            async (err, token) => {
                if (err) {
                    console.error('JWT signing error:', err);
                    return res.status(500).json({ message: 'Error signing token' });
                }
                const link = `http://localhost:3000/api/v1/auth/verify?token=${token}`;

                try {
                    await sendMail(email, link);
                    return res.status(200).json({ 
                        message: 'Magic link sent to your email',
                        email: email
                    });
                } catch (emailError) {
                    console.error('Email sending error:', emailError);
                    return res.status(500).json({ message: 'Error sending email' });
                }
            }
        );

    } catch (error) {
        console.error('Signup error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

export const verify: RequestHandler = async (req, res) => {
    try {
        const token = req.query.token as string;
        console.log('Token received for verification:', token);
        if (!token) {
            return res.status(400).json({ message: 'Token is required' });
        }

        jwt.verify(token, JWT_SECRET, async (err, decoded: any) => {
            if (err) {
                console.error('JWT verification error:', err);
                return res.status(401).json({ message: 'Invalid or expired token' });
            }

            try {
                res.cookie('authToken', token, {
                    maxAge: 3600000
                });
               const userMessage = {
                userId: decoded.userId,
           
            };
            
            await sendToKafka('user', userMessage);
                return res.status(200).json({ 
                    message: 'Authentication successful',
                    user: {
                        email: decoded.data,
                        userId: decoded.userId
                    }
                });
            } catch (dbError) {
                console.error('Database error during verification:', dbError);
                return res.status(500).json({ message: 'Database error' });
            }
        });

    } catch (error) {
        console.error('Verification error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

export const signin:RequestHandler=async (req,res)=>{
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ message: 'Email is required' });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const token = jwt.sign(
            { data: email, userId: user.userId },
            JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.cookie('authToken', token, {
            maxAge: 3600000
        });

        return res.status(200).json({
            message: 'Signin successful',
            user: {
                email: user.email,
                userId: user.userId
            }
        });
    } catch (error) {
        console.error('Signin error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

export const logout: RequestHandler = (req, res) => {
    res.clearCookie('authToken');
    return res.status(200).json({ message: 'Logged out successfully' });
};

