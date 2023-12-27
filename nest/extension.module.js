const { Module } = require('@nestjs/common');
const AppController = require('./extension.controller');

@Module({
  imports: [],
  controllers: [AppController],
})
export class AppModule {}
