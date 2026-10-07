import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { writeFileSync } from 'fs';
import { AppModule } from '../src/app.module';

async function generateSwaggerSpec() {
  // Skip DB connection when generating swagger in CI or environments without a DB
  process.env.SKIP_DB_CONNECT = 'true';
  const app = await NestFactory.create(AppModule, { logger: false });

  const config = new DocumentBuilder()
    .setTitle('THS-THM API')
    .setDescription('API Documentation for THS-THM System Manajemen')
    .setVersion('1.0')
    .addBearerAuth()
    .addServer('http://localhost:3001', 'Development')
    .addServer('https://ths-thm-api.onrender.com', 'Production')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  writeFileSync('./swagger.json', JSON.stringify(document, null, 2));

  console.log('swagger.json generated successfully');
  await app.close();
}

generateSwaggerSpec();
