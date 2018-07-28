import { Router } from 'express';
import { OAuth2Client } from 'google-auth-library';
import { LoginTicket, TokenPayload } from 'google-auth-library/build/src/auth/loginticket';
import { INTERNAL_SERVER_ERROR, UNAUTHORIZED } from 'http-status-codes';
import * as request from 'request-promise-native';
import { ExternalType } from '../models/User';
import MailService from '../services/MailService';
import TokenService from '../services/TokenService';

export default ((tokenService: TokenService, mailService: MailService,
                 WEB_ROOT: string, GOOGLE_CLIENT_ID: string, FACEBOOK_APP_ID: string, FACEBOOK_APP_SECRET: string) => {
    const authenticationRouter: Router = Router();
    /** an email for login was requested. login==register */
    authenticationRouter.get('/requesttokenmail', (req, res) => {
        const token: string = tokenService.create({
            email: req.query.email, // validity check not necessary, nodemailer handles this
        });
        const url = `${WEB_ROOT}/#/login?token=${token}`;
        mailService.sendMail(req.query.email, 'Your Login Mail - ??', `
                    Hello, <br>
                    here is the link to log in to ??:<br>
                    <a href="${url}">${url}</a><br>
                    Or paste in the token manually:<br>
                    ${token}<br>
                    Bye`)
            .then(res.end)
            .catch((error: any) => {
                // todo analyze error and reply with fitting status code + type
                res.status(INTERNAL_SERVER_ERROR).send(error.code);
            });
    });
    /** post google token, return jwt */
    authenticationRouter.post('/googletokenlogin', async (req, res) => {
        const googleOAuth2Client = await new OAuth2Client(GOOGLE_CLIENT_ID);
        const payload: TokenPayload | undefined = await (async () => {
            let loginTicket: LoginTicket | null;
            try {
                loginTicket = await googleOAuth2Client.verifyIdToken(({ // todo can this even throw?? docs pleeeease
                    audience: GOOGLE_CLIENT_ID,
                    idToken: req.query.googletoken,
                }));
            } catch (error) {
                return undefined;
            }
            if (!loginTicket) {
                return undefined;
            }
            return loginTicket.getPayload() || undefined;
        })();
        if (!payload) {
            res.status(UNAUTHORIZED).end();
            return;
        }
        // todo check exists .sub and .email
        const token = tokenService.create({
            email: payload.email,
            externalIdentifier: payload.sub,
            externalType: ExternalType.GOOGLE,
            name: payload.name,
            picture: payload.picture,
        });
        res.send(token);
    });
    /** post facebook token, return jwt */
    authenticationRouter.post('/facebooktokenlogin', async (req, res) => {
        let result = await request.get(`https://graph.facebook.com/debug_token?input_token=${req.query.facebooktoken}&access_token=${FACEBOOK_APP_ID}|${FACEBOOK_APP_SECRET}`);
        let { data } = JSON.parse(result);
        if (data.app_id !== FACEBOOK_APP_ID || !data.is_valid) {
            res.status(UNAUTHORIZED).send('Facebook says the data is not valid.');
        }
        result = await request.get(`https://graph.facebook.com/me?access_token=${req.query.facebooktoken}`);
        data = JSON.parse(result);
        const token = tokenService.create({
            externalIdentifier: data.user_id,
            externalType: ExternalType.FACEBOOK,
            name: data.name,
        });
        res.send(token);
    });
    return authenticationRouter;
});
