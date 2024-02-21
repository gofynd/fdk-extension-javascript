require("@babel/register");
const { Controller, Get, Bind, Res, Req, Next, HttpCode } = require('@nestjs/common');

@Controller('app')
class AppController {
    @Get('applications')
    @HttpCode(200)
    @Bind(Req(), Res(), Next())
    async getApplications(req, res, next) {
        try {
            return res.status(200).json({ user_id: req.user.user_id })
        }
        catch (error) {
            next(error)
        }
    }
}


module.exports = AppController;
