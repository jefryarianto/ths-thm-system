import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { writeFileSync } from 'fs';
import { AppModule } from '../src/app.module';

async function generateSwaggerSpec() {
  // If swagger generation is not required (e.g., in CI), create a minimal file and exit
  if (process.env.SKIP_SWAGGER) {
    writeFileSync('./swagger.json', JSON.stringify({ openapi: '3.0.0', info: { title: 'Placeholder', version: '0.0.0' } }, null, 2));
    console.log('Skipping detailed swagger generation');
    return;
  }
  try {
  // Ensure development environment for CI to avoid production env validation
  process.env.NODE_ENV = 'development';
  // In GitHub Actions, skip detailed swagger generation
  if (process.env.GITHUB_ACTIONS) {
    process.env.SKIP_SWAGGER = 'true';
  }
  // Skip DB connection when generating swagger in CI or environments without a DB
  process.env.SKIP_DB_CONNECT = 'true';
  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });

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
  console.log('Swagger generation completed');
  }
}

generateSwaggerSpec().catch(err => {
  console.error('Error generating swagger:', err);
  process.exit(1);
});
