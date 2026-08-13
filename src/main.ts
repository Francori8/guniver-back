import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Habilitar cookie-parser para leer cookies en requests
  app.use(cookieParser());

  // Configurar CORS para permitir requests desde el frontend
  const allowedOrigins = [
    'http://localhost:3001',
    'http://192.168.1.61:3001',
    ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
  ];
  app.enableCors({
    origin: allowedOrigins,
    credentials: true, // Permite enviar cookies
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Guniverse')
    .setDescription('La descripción de mi API increíble')
    .setVersion('0.1')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Ingresa el token JWT',
        in: 'header',
      },
      'JWT-auth',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    deepScanRoutes: true,
    ignoreGlobalPrefix: false,
    operationIdFactory: (controllerKey: string, methodKey: string) => methodKey,
    extraModels: [],
    include: [],
  });

  // ✅ CORREGIR: swaggerOptions va EN EL SETUP, no en createDocument
  SwaggerModule.setup('api', app, document, {
    swaggerOptions: {
      persistAuthorization: true, // ← AQUÍ va persistAuthorization
      persistAuth: true,
      tryItOutEnabled: true,
      displayRequestDuration: true,
      docExpansion: 'none',
    },
  });

  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
