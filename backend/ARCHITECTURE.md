# Backend Architecture

## 📁 Project Structure

```
src/
├── app.module.ts                 # Root application module
├── main.ts                       # Application entry point
│
├── common/                       # Shared/common functionality
│   ├── config/                    # Configuration
│   │   ├── config.schema.ts      # Environment variable validation
│   │   └── redis.config.ts       # Redis configuration factory
│   ├── constants/                # Application constants
│   │   └── app.constants.ts       # All magic numbers/strings
│   ├── decorators/                # Custom decorators
│   │   └── api-response.decorator.ts
│   ├── dto/                       # Shared DTOs
│   │   └── api-response.dto.ts    # Standard API response format
│   ├── exceptions/                # Custom exception classes
│   │   └── app.exceptions.ts      # Hierarchical exceptions
│   ├── filters/                   # Exception filters
│   │   └── http-exception.filter.ts
│   ├── guards/                     # Guards
│   │   └── validation.guard.ts
│   ├── interceptors/              # Interceptors
│   │   ├── logging.interceptor.ts
│   │   └── transform.interceptor.ts
│   ├── interfaces/                # Service contracts
│   │   ├── cache.interface.ts
│   │   ├── mood-analysis.interface.ts
│   │   └── video-processing.interface.ts
│   ├── modules/                   # Shared modules
│   │   └── shared.module.ts
│   ├── pipes/                     # Custom pipes
│   │   └── validation.pipe.ts
│   └── utils/                      # Utility functions
│       ├── ffmpeg.util.ts
│       ├── redis.util.ts
│       ├── temp-file.util.ts
│       └── youtube.util.ts
│
├── analyze/                       # Analysis feature module
│   ├── dto/                        # Feature-specific DTOs
│   │   ├── analyze-video.dto.ts
│   │   └── invalidate-cache.dto.ts
│   ├── analyze.controller.ts      # HTTP controller
│   ├── analyze.service.ts         # Business logic
│   └── analyze.module.ts          # Module definition
│
├── video/                          # Video processing module
│   ├── video.service.ts
│   └── video.module.ts
│
├── frames/                         # Frame extraction module
│   ├── frames.service.ts
│   └── frames.module.ts
│
├── audio/                          # Audio processing module
│   ├── audio.service.ts
│   └── audio.module.ts
│
├── transcription/                  # Transcription module
│   ├── transcription.service.ts
│   └── transcription.module.ts
│
├── mood/                           # Mood analysis module
│   ├── mood.service.ts
│   └── mood.module.ts
│
├── aggregation/                    # Result aggregation module
│   ├── aggregation.service.ts
│   └── aggregation.module.ts
│
├── cache/                          # Caching module
│   ├── cache.service.ts
│   └── cache.module.ts
│
└── queue/                          # Queue processing module
    ├── processors/
    │   └── chunk.processor.ts
    └── queue.module.ts
```

## 🏗️ Architecture Principles

### 1. **Separation of Concerns**
   - **Controllers**: Handle HTTP requests/responses only
   - **Services**: Contain business logic
   - **DTOs**: Data transfer objects with validation
   - **Interfaces**: Define service contracts

### 2. **Dependency Injection**
   - All services use NestJS DI
   - Dependencies injected via constructor
   - Easy to test and mock

### 3. **Module Organization**
   - Feature-based modules
   - Each feature is self-contained
   - Clear module boundaries

### 4. **Error Handling**
   - Custom exception classes
   - Global exception filter
   - Consistent error responses

### 5. **Configuration Management**
   - Environment variable validation
   - Centralized configuration
   - Type-safe configuration access

## 📋 Best Practices Applied

### ✅ **DTOs (Data Transfer Objects)**
- Separate DTOs for requests/responses
- Validation decorators on DTOs
- Type-safe data transfer

### ✅ **Interfaces**
- Service contracts defined as interfaces
- Easy to swap implementations
- Better testability

### ✅ **Constants**
- All magic numbers/strings in constants file
- Type-safe constants
- Single source of truth

### ✅ **Exception Handling**
- Hierarchical exception classes
- Specific exceptions for different error types
- Consistent error codes

### ✅ **Interceptors**
- Logging interceptor for request/response logging
- Transform interceptor for consistent responses
- Global application

### ✅ **Configuration**
- Environment variable validation
- Configuration factories
- Type-safe config access

### ✅ **Validation**
- DTO validation with class-validator
- Custom validation pipes
- Clear error messages

## 🔄 Request Flow

```
HTTP Request
    ↓
Controller (DTO validation)
    ↓
Service (Business logic)
    ↓
Domain Services (Video, Mood, etc.)
    ↓
External Services (OpenAI, Redis, etc.)
    ↓
Response (via Interceptors)
    ↓
HTTP Response
```

## 🧪 Testing Strategy

### Unit Tests
- Test services in isolation
- Mock dependencies
- Test business logic

### Integration Tests
- Test module interactions
- Test API endpoints
- Test database/Redis interactions

### E2E Tests
- Test complete workflows
- Test error scenarios
- Test performance

## 📚 Code Organization Rules

1. **One feature per module**
2. **DTOs in feature/dto folder**
3. **Interfaces in common/interfaces**
4. **Constants in common/constants**
5. **Utils in common/utils**
6. **Shared functionality in common/modules**

## 🎯 Benefits

1. **Maintainability**: Clear structure, easy to navigate
2. **Testability**: Services can be easily mocked
3. **Scalability**: Easy to add new features
4. **Type Safety**: TypeScript throughout
5. **Consistency**: Standardized patterns
6. **Documentation**: Self-documenting code structure

