const { Module } = require('@nestjs/common');
const AppController = require('./app.controller');

@Module({
  imports: [],
  controllers: [AppController],
})
export class AppModule {}
