import { NextFunction, Request, Response } from 'express';
import TokenService from './services/TokenService';

export default (tokenService: TokenService) =>
    async (req: Request, res: Response, next: NextFunction) => {
        if (req.headers.authorization) {
            try {
                res.locals.user = await tokenService.toUser((req.headers.authorization).substring(7));
            } catch (error) {
                // todo error is status code.. ? see user class
                res.locals.userError = error;
            }
        }
        next();
    };