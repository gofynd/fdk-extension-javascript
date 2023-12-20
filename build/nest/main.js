const { AppModule } = require('./app.module');
const { NestFactory } = require('@nestjs/core');
async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    await app.listen(3000);
}
bootstrap();
//# sourceMappingURL=main.js.map