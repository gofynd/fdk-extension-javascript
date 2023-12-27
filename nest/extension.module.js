const { Module } = require('@nestjs/common');
const ExtensionController = require('./extension.controller');

@Module({
  imports: [],
  controllers: [ExtensionController],
})
export class ExtensionModule {}
