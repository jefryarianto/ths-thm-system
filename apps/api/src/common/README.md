# Common — Shared Utilities

Shared modules yang digunakan oleh semua modul:

- **decorators/** — Custom decorators (@CurrentUser, @Roles, @Public, @District, @Region, @Branch)
- **filters/** — Exception filters (HttpException, PrismaException, ValidationException)
- **guards/** — Auth guards (JwtGuard, RolesGuard, DistrictGuard, RegionGuard, BranchGuard)
- **interceptors/** — Response interceptors (TransformInterceptor, LoggingInterceptor, AuditInterceptor)
- **pipes/** — Validation pipes (ZodValidationPipe, ParseIdPipe, FileSizePipe)
- **dto/** — Shared Data Transfer Objects (PaginationDto, FilterDto, ApiResponse)
- **qr/** — QR code generation & validation utilities