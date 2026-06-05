import { Controller, Get, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiOkResponse, ApiCreatedResponse } from '@nestjs/swagger';
import { Roles } from '../decorators/roles.decorator';
import { RequireScope } from '../decorators/scope.decorator';
import { ApiKeyStore } from '../guards/api-key.guard';
import { CreateApiKeyDto, RevokeApiKeyDto } from '../dto/api-key-management.dto';
import { AuditService, AuditEventType } from '../services/audit.service';

/**
 * Controller for managing API keys at runtime.
 *
 * Restricted to superadmin only (national scope).
 * Provides endpoints for creating, listing, and revoking API keys
 * without requiring server restart.
 */
@ApiTags('API Key Management')
@ApiBearerAuth()
@Controller('api-keys')
export class ApiKeyManagementController {
  constructor(
    private readonly store: ApiKeyStore,
    private readonly auditService: AuditService,
  ) {}

  /**
   * List all registered API keys (shows preview, not full keys).
   */
  @Get()
  @Roles('superadmin')
  @RequireScope('national')
  @ApiOperation({ summary: 'List all API keys (superadmin only)', description: 'Returns preview of all registered API keys. Full key values are never exposed after creation.' })
  @ApiOkResponse({ description: 'List of API key previews with role and description' })
  findAll() {
    return {
      success: true,
      data: this.store.getAll(),
    };
  }

  /**
   * Create a new API key.
   * Returns the full key only once — store it securely.
   */
  @Post()
  @Roles('superadmin')
  @RequireScope('national')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new API key (superadmin only)' })
  @ApiCreatedResponse({ description: 'API key created successfully. Store the key securely — it will not be shown again.' })
  create(@Body() dto: CreateApiKeyDto) {
    const key = this.store.generateKey();
    this.store.register({
      key,
      role: dto.role,
      description: dto.description,
      scope: dto.scope,
    });

    this.auditService.logDataMutation({
      method: 'POST',
      path: '/api/api-keys',
      statusCode: 201,
      durationMs: 0,
      details: { action: 'api_key_create', description: dto.description, role: dto.role },
    });

    return {
      success: true,
      data: {
        key,
        role: dto.role,
        description: dto.description,
        scope: dto.scope,
      },
      message: 'API key berhasil dibuat. Simpan key ini dengan aman — tidak akan ditampilkan lagi.',
    };
  }

  /**
   * Revoke (delete) an API key.
   */
  @Post('revoke')
  @Roles('superadmin')
  @RequireScope('national')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke an API key (superadmin only)', description: 'Permanently removes an API key. Any integrations using this key will lose access immediately.' })
  @ApiOkResponse({ description: 'Revocation result — success indicates key was found and removed' })
  revoke(@Body() dto: RevokeApiKeyDto) {
    const removed = this.store.remove(dto.key);
    if (removed) {
      this.auditService.logDataMutation({
        method: 'POST',
        path: '/api/api-keys/revoke',
        statusCode: 200,
        durationMs: 0,
        details: { action: 'api_key_revoke' },
      });
    }

    return {
      success: removed,
      message: removed
        ? 'API key berhasil dicabut'
        : 'API key tidak ditemukan',
    };
  }
}
