import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { AppModule } from './app.module';
import { TempFileUtil } from './common/utils/temp-file.util';
import { FfmpegUtil } from './common/utils/ffmpeg.util';
import { RedisUtil } from './common/utils/redis.util';
import { ConfigService } from '@nestjs/config';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { AppConstants } from './common/constants/app.constants';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  
  try {
    logger.log('🚀 Starting NestJS application...');
    
    logger.log('📁 Initializing temp directory...');
    await TempFileUtil.initialize();
    logger.log('✅ Temp directory initialized');

    logger.log('🎬 Configuring FFmpeg...');
    FfmpegUtil.configure();

    logger.log('🔧 Creating NestJS application...');
    const app = await NestFactory.create(AppModule, {
      logger: ['error', 'warn', 'log', 'debug', 'verbose'],
    });
    
    const configService = app.get(ConfigService);
    
    logger.log('🔌 Testing Redis connection...');
    try {
      const redisHost = configService.get<string>('REDIS_HOST', AppConstants.REDIS_DEFAULT_HOST);
      const redisPort = configService.get<number>('REDIS_PORT', AppConstants.REDIS_DEFAULT_PORT);
      const redisPassword = configService.get<string>('REDIS_PASSWORD');
      
      logger.debug(`Connecting to Redis at ${redisHost}:${redisPort}...`);
      const redisConnected = await RedisUtil.testConnection(redisHost, redisPort, redisPassword);
      if (!redisConnected) {
        logger.warn('⚠️  Warning: Redis connection test failed. Queue processing may not work.');
        logger.warn('   Make sure Redis is running and accessible.');
        logger.warn(`   Expected Redis at: ${redisHost}:${redisPort}`);
        logger.warn('   Run: docker run -d -p 6379:6379 --name redis-yt redis:latest');
      } else {
        logger.log('✅ Redis connection successful');
      }
    } catch (error) {
      logger.error('❌ Error testing Redis connection:', error);
    }
    
    logger.log('🌐 Configuring CORS...');
    const frontendUrl = configService.get<string>('FRONTEND_URL', AppConstants.DEFAULT_FRONTEND_URL);
    app.enableCors({
      origin: frontendUrl,
      credentials: true,
    });
    logger.log(`✅ CORS enabled for: ${frontendUrl}`);

    logger.log('🛡️  Configuring global exception filter...');
    app.useGlobalFilters(new HttpExceptionFilter());

    logger.log('🔄 Configuring global interceptors...');
    app.useGlobalInterceptors(new LoggingInterceptor(), new TransformInterceptor());

    logger.log('✅ Configuring validation pipes...');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
        exceptionFactory: (errors) => {
          const messages = errors.map((error) => {
            return Object.values(error.constraints || {}).join(', ');
          });
          return new HttpException(
            {
              success: false,
              error: {
                message: messages.join('; '),
                code: 'VALIDATION_ERROR',
              },
            },
            HttpStatus.BAD_REQUEST,
          );
        },
      }),
    );

    const port = configService.get<number>('PORT', AppConstants.DEFAULT_PORT);
    logger.log(`🌍 Starting server on port ${port}...`);
    await app.listen(port);
    logger.log(`✅ NestJS server running on http://localhost:${port}`);
    logger.log('📝 API endpoint: http://localhost:3001/analyze');
  } catch (error) {
    logger.error('❌ Failed to start application:', error);
    if (error instanceof Error) {
      logger.error('Stack trace:', error.stack);
    }
    process.exit(1);
  }
}

bootstrap().catch((error) => {
  console.error('❌ Unhandled error in bootstrap:', error);
  process.exit(1);
});

