import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

const PORT = 3000;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const DEV_SERVER = 'http://localhost:5173';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Only needed in development, where frontend and backend run on different ports.
  if (!IS_PRODUCTION) {
    app.enableCors({ origin: DEV_SERVER });
  }

  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('Warmachine Analyzer')
      .setDescription('Meta analysis for Warmachine lists')
      .setVersion('1.0')
      .build(),
  );
  SwaggerModule.setup('api', app, document);

  app.useGlobalPipes(new ValidationPipe({ transform: true }));
  await app.listen(PORT, '0.0.0.0');
}

bootstrap().catch((error) => {
  console.error('Failed to start application:', error);
  process.exit(1);
});
