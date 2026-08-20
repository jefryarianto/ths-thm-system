import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Prisma error code for unique constraint violation.
 */
const PRISMA_UNIQUE_VIOLATION = 'P2002';

export interface CsvDuplicateTables {
  /** Whether to check the `anggota` table for existing emails/names */
  anggota?: boolean;
  /** Whether to check the `calonAnggota` table for existing emails/names */
  calonAnggota?: boolean;
  /** For soft-deleted tables, filter out deleted rows */
  anggotaDeletedFilter?: boolean;
}

export interface CsvImportOptions<T> {
  /** Module name for audit logging (e.g. 'candidates', 'members') */
  module: string;
  /** Maximum allowed rows per import (default: 500) */
  maxRows?: number;
  /** Which tables to check for existing duplicates */
  duplicateTables?: CsvDuplicateTables;
  /**
   * Process a single row. Called for each row that passes duplicate checks.
   * Return success=true if the row was processed successfully, skip=true to
   * skip without counting as error, or success=false with an error message.
   */
  rowProcessor: (
    row: T,
    helpers: ImportRowHelpers,
  ) => Promise<{ success: boolean; skip?: boolean; error?: string; warning?: string }>;
  /**
   * Extract the email from a row (lowercased/trimmed) for duplicate checking.
   * Return undefined/null to skip email check for this row.
   */
  extractEmail?: (row: T) => string | null | undefined;
  /**
   * Extract the name from a row (lowercased/trimmed) for duplicate checking.
   * Return undefined/null to skip name check for this row.
   */
  extractName?: (row: T) => string | null | undefined;
  /**
   * Optional pre-populated existing email set (e.g. from a previous import batch).
   * If not provided, the service will query the DB.
   */
  existingEmails?: Set<string>;
  /**
   * Optional pre-populated existing name set.
   */
  existingNames?: Set<string>;
}

export interface ImportRowHelpers {
  /** The email (lowercased/trimmed) used for duplicate checking */
  email: string | undefined;
  /** The name (lowercased/trimmed) used for duplicate checking */
  namaLengkap: string;
  /** Track intra-CSV duplicates: call after successful insert */
  addIntraCsv(email: string | undefined, namaLengkap: string): void;
}

export interface CsvImportResult {
  success: number;
  incomplete: number;
  errors: number;
  warnings: number;
  details: Array<{ row: unknown; error: string; warning?: string; missingFields?: string[]; memberId?: string }>;
}

// ─── Unified Import Pipeline — field & config interfaces ───

/**
 * Definition of a single column/field in the import CSV.
 */
export interface ImportFieldDefinition {
  /** Backend field name (e.g. 'nama_lengkap') */
  key: string;
  /** Display label (e.g. 'Nama Lengkap') */
  label: string;
  /** Whether this field is required */
  required: boolean;
  /** Field type for validation & template generation */
  type: 'string' | 'date' | 'enum' | 'phone' | 'email';
  /** Alternative CSV column names accepted for this field */
  aliases: string[];
  /** For enum type, the allowed values */
  enumValues?: string[];
  /** Example value for template generation */
  example?: string;
}

/**
 * A single validation rule for an import column.
 */
export interface ImportValidator {
  field: string;
  rule: 'required' | 'email' | 'phone' | 'enum' | 'date' | 'regex' | 'minLength' | 'maxLength';
  params?: Record<string, string>;
  message?: string;
}

/**
 * Per-module import configuration — one source of truth per entity.
 */
export interface ImportModuleConfig {
  /** Module identifier (e.g. 'candidates', 'members') */
  module: string;
  /** Human-readable label */
  label: string;
  /** Column / field definitions */
  fields: ImportFieldDefinition[];
  /** Validation rules */
  validators: ImportValidator[];
  /** Which DB tables to check for existing duplicates */
  duplicateTables: CsvDuplicateTables;
  /**
   * Row processor: called for each row that passes duplicate checks.
   * This is the module-specific logic that creates/updates records.
   */
  rowProcessor: (
    row: Record<string, unknown>,
    helpers: ImportRowHelpers,
  ) => Promise<{ success: boolean; skip?: boolean; error?: string; warning?: string }>;
}

/**
 * Result of a dry-run / preview validation (no DB writes).
 */
export interface ImportPreviewResult {
  validRows: number;
  invalidRows: number;
  totalRows: number;
  warnings: string[];
  duplicateEmails: string[];
  duplicateNames: string[];
  columns: Array<{ name: string; matched: boolean; required: boolean }>;
  rows: Array<{ index: number; valid: boolean; errors: string[] }>;
}

@Injectable()
export class CsvImportService {
  private readonly logger = new Logger(CsvImportService.name);
  private readonly DEFAULT_MAX_ROWS = 500;

  // ─── Module Config Registry ───
  private readonly moduleConfigs = new Map<string, ImportModuleConfig>();

  /**
   * Register a module's import configuration.
   * Called during module initialisation (e.g. in onModuleInit).
   */
  registerModuleConfig(config: ImportModuleConfig): void {
    this.moduleConfigs.set(config.module, config);
    this.logger.log(`Registered import config for module "${config.module}" (${config.fields.length} fields)`);
  }

  /**
   * Get a module's import configuration by name.
   */
  getModuleConfig(module: string): ImportModuleConfig | undefined {
    return this.moduleConfigs.get(module);
  }

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Safely parse a date string value. Returns a Date if valid, null otherwise.
   */
  parseDateField(value: string | null | undefined): Date | null {
    if (!value || typeof value !== 'string') return null;
    const trimmed = value.trim();
    if (!trimmed) return null;
    const date = new Date(trimmed);
    if (isNaN(date.getTime())) return null;
    return date;
  }

  /**
   * Run a complete CSV import pipeline:
   * 1. Row limit check
   * 2. Batch DB duplicate check (configurable tables)
   * 3. Row-by-row processing with intra-CSV duplicate tracking
   * 4. Audit log
   */
  async importRows<T>(
    data: T[],
    options: CsvImportOptions<T>,
  ): Promise<CsvImportResult> {
    const maxRows = options.maxRows ?? this.DEFAULT_MAX_ROWS;
    if (data.length > maxRows) {
      throw new BadRequestException(
        `Maksimal ${maxRows} baris data per import. File Anda memiliki ${data.length} baris.`,
      );
    }

    const result: CsvImportResult = { success: 0, incomplete: 0, errors: 0, warnings: 0, details: [] };

    // Extract emails and names from all rows for batch duplicate check
    const emails = (
      options.extractEmail
        ? data.map((row) => options.extractEmail!(row)).filter(Boolean)
        : data
            .map((row) => (row as Record<string, unknown>).email?.toString().trim().toLowerCase())
            .filter(Boolean)
    ) as string[];

    const names = (
      options.extractName
        ? data.map((row) => options.extractName!(row)).filter(Boolean)
        : data
            .map((row) => {
              const r = row as Record<string, unknown>;
              return (r.nama_lengkap || r.nama || r.name || '').toString().trim().toLowerCase();
            })
            .filter(Boolean)
    ) as string[];

    // Use provided sets or query DB
    const existingEmails = options.existingEmails ?? (await this.batchCheckEmails(emails, options.duplicateTables));
    const existingNames = options.existingNames ?? (await this.batchCheckNames(names, options.duplicateTables));

    // Process each row
    for (const row of data) {
      try {
        const email = options.extractEmail
          ? options.extractEmail(row) ?? undefined
          : (row as Record<string, unknown>).email?.toString().trim().toLowerCase();

        const namaLengkap = options.extractName
          ? options.extractName(row) ?? ''
          : (
              (row as Record<string, unknown>).nama_lengkap ||
              (row as Record<string, unknown>).nama ||
              (row as Record<string, unknown>).name ||
              ''
            ).toString().trim().toLowerCase();

        // Check duplicate email
        if (email && existingEmails.has(email)) {
          result.errors++;
          result.details.push({
            row,
            error: `Email "${email}" sudah terdaftar`,
          });
          continue;
        }

        // Check duplicate name
        if (namaLengkap && existingNames.has(namaLengkap)) {
          result.errors++;
          result.details.push({
            row,
            error: `Nama "${namaLengkap}" sudah terdaftar`,
          });
          continue;
        }

        // Process the row
        const helpers: ImportRowHelpers = {
          email,
          namaLengkap,
          addIntraCsv(e, n) {
            if (e) existingEmails.add(e);
            if (n) existingNames.add(n);
          },
        };

        const processed = await options.rowProcessor(row, helpers);

        if (processed.skip) {
          result.incomplete++;
          continue; // Count as incomplete (not success, not error)
        }

        if (processed.success) {
          // Track intra-CSV duplicates
          if (email) existingEmails.add(email);
          if (namaLengkap) existingNames.add(namaLengkap);
          result.success++;

          // Non-blocking warnings (e.g. duplicate phone) surfaced in result + import log
          if (processed.warning) {
            result.warnings++;
            result.details.push({ row, error: '', warning: processed.warning });
          }
        } else {
          result.errors++;
          result.details.push({
            row,
            error: processed.error || 'Gagal memproses baris',
          });
        }        } catch (error) {
          result.errors++;
          // Check for unique constraint violation (P2002) and provide a user-friendly message
          if ((error as Record<string, string>).code === PRISMA_UNIQUE_VIOLATION) {
            const meta = (error as Record<string, { target?: string[] }>).meta;
            const field = meta?.target?.join(', ') || 'field';
            result.details.push({
              row,
              error: `Data sudah terdaftar (${field})`,
            });
          } else {
            result.details.push({
              row,
              error: (error as Error).message,
            });
          }
        }
    }

    // Write audit trail
    if (result.success > 0 || result.errors > 0) {
      this.logImportAudit(options.module, data.length, result);
    }

    return result;
  }

  /**
   * Batch query existing emails from the specified tables.
   */
  private async batchCheckEmails(
    emails: string[],
    tables?: CsvDuplicateTables,
  ): Promise<Set<string>> {
    if (emails.length === 0) return new Set<string>();

    const checkAnggota = tables?.anggota ?? true;
    const checkCalon = tables?.calonAnggota ?? false;

    const queries: Promise<{ email: string | null }[]>[] = [];

    if (checkAnggota) {
      queries.push(
        this.prisma.anggota.findMany({
          where: {
            email: { in: emails, mode: 'insensitive' },
            ...(tables?.anggotaDeletedFilter ? { deletedAt: null } : {}),
          },
          select: { email: true },
        }),
      );
    }

    if (checkCalon) {
      queries.push(
        this.prisma.calonAnggota.findMany({
          where: { email: { in: emails, mode: 'insensitive' } },
          select: { email: true },
        }),
      );
    }

    if (queries.length === 0) return new Set<string>();

    const results = await Promise.all(queries);
    const allEmails = results
      .flat()
      .map((e) => e.email?.toLowerCase() || '')
      .filter(Boolean);

    return new Set(allEmails);
  }

  /**
   * Batch query existing names from the specified tables.
   */
  private async batchCheckNames(
    names: string[],
    tables?: CsvDuplicateTables,
  ): Promise<Set<string>> {
    if (names.length === 0) return new Set<string>();

    const checkAnggota = tables?.anggota ?? true;
    const checkCalon = tables?.calonAnggota ?? false;

    const queries: Promise<{ namaLengkap: string | null }[]>[] = [];

    if (checkAnggota) {
      queries.push(
        this.prisma.anggota.findMany({
          where: {
            namaLengkap: { in: names, mode: 'insensitive' },
            ...(tables?.anggotaDeletedFilter ? { deletedAt: null } : {}),
          },
          select: { namaLengkap: true },
        }),
      );
    }

    if (checkCalon) {
      queries.push(
        this.prisma.calonAnggota.findMany({
          where: { namaLengkap: { in: names, mode: 'insensitive' } },
          select: { namaLengkap: true },
        }),
      );
    }

    if (queries.length === 0) return new Set<string>();

    const results = await Promise.all(queries);
    const allNames = results
      .flat()
      .map((n) => n.namaLengkap?.toLowerCase() || '')
      .filter(Boolean);

    return new Set(allNames);
  }

  /**
   * Run validation rules against a single row without writing to DB.
   * Returns an array of error messages; empty = valid.
   */
  validateRow(
    row: Record<string, unknown>,
    validators: ImportValidator[],
    _fields?: ImportFieldDefinition[],
  ): string[] {
    const errors: string[] = [];

    for (const v of validators) {
      const value = row[v.field] as string | undefined;

      switch (v.rule) {
        case 'required':
          if (!value || String(value).trim() === '') {
            errors.push(v.message || `${v.field} tidak boleh kosong`);
          }
          break;
        case 'email':
          if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim())) {
            errors.push(v.message || `Format ${v.field} tidak valid`);
          }
          break;
        case 'phone':
          if (value) {
            const cleaned = String(value).replace(/[\s-]/g, '');
            if (!/^(\+?62|0)\d{8,13}$/.test(cleaned)) {
              errors.push(v.message || `Format ${v.field} tidak valid (mulai 0/+62, 9-14 digit)`);
            }
          }
          break;
        case 'enum':
          if (value) {
            const allowed = v.params?.values?.split(',') || [];
            if (allowed.length > 0 && !allowed.includes(String(value).toUpperCase())) {
              errors.push(v.message || `${v.field} harus salah satu dari: ${allowed.join(', ')}`);
            }
          }
          break;
        case 'date':
          if (value && isNaN(new Date(String(value)).getTime())) {
            errors.push(v.message || `Format tanggal ${v.field} tidak valid`);
          }
          break;
        case 'regex':
          if (value && v.params?.pattern) {
            try {
              const regex = new RegExp(v.params.pattern);
              if (!regex.test(String(value))) {
                errors.push(v.message || `${v.field} tidak valid`);
              }
            } catch {
              // Invalid regex pattern — skip
            }
          }
          break;
        case 'minLength': {
          const min = parseInt(v.params?.value || '0', 10);
          if (value && String(value).length < min) {
            errors.push(v.message || `${v.field} minimal ${min} karakter`);
          }
          break;
        }
        case 'maxLength': {
          const max = parseInt(v.params?.value || '999', 10);
          if (value && String(value).length > max) {
            errors.push(v.message || `${v.field} maksimal ${max} karakter`);
          }
          break;
        }
      }
    }

    return errors;
  }

  /**
   * Validate an array of rows without any DB writes.
   * Returns per-row errors and aggregate stats.
   */
  validateRows<T extends Record<string, unknown>>(
    data: T[],
    config: ImportModuleConfig,
  ): ImportPreviewResult {
    const warnings: string[] = [];
    const duplicateEmails = new Set<string>();
    const duplicateNames = new Set<string>();
    const intraEmailTracker = new Set<string>();
    const intraNameTracker = new Set<string>();

    // Handle empty data gracefully
    if (data.length === 0) {
      return {
        validRows: 0,
        invalidRows: 0,
        totalRows: 0,
        warnings: ['File tidak memiliki baris data'],
        duplicateEmails: [],
        duplicateNames: [],
        columns: config.fields.map((f) => ({
          name: f.key,
          matched: false,
          required: f.required,
        })),
        rows: [],
      };
    }

    // Detect unknown columns
    const knownKeys = new Set(config.fields.map((f) => f.key));
    for (const alias of config.fields.flatMap((f) => f.aliases)) knownKeys.add(alias);

    const unknownCols = Object.keys(data[0]).filter((k) => !knownKeys.has(k));
    if (unknownCols.length > 0) {
      warnings.push(`Kolom tidak dikenal: ${unknownCols.join(', ')} — akan diabaikan`);
    }

    const rows = data.map((row, rowIndex) => {
      const errors: string[] = [];

      // Run field validators
      const fieldErrors = this.validateRow(row, config.validators, config.fields);
      errors.push(...fieldErrors);

      // Intra-CSV duplicate email check
      const email = (row.email || '').toString().trim().toLowerCase();
      if (email) {
        if (intraEmailTracker.has(email)) {
          errors.push(`Email "${email}" duplikat dalam file yang sama`);
          duplicateEmails.add(email);
        }
        intraEmailTracker.add(email);
      }

      // Intra-CSV duplicate name check
      const namaLengkap = (
        row.nama_lengkap || row.nama || row.name || ''
      ).toString().trim().toLowerCase();
      if (namaLengkap) {
        if (intraNameTracker.has(namaLengkap)) {
          errors.push(`Nama "${namaLengkap}" duplikat dalam file yang sama`);
          duplicateNames.add(namaLengkap);
        }
        intraNameTracker.add(namaLengkap);
      }

      return { index: rowIndex, valid: errors.length === 0, errors };
    });

    const validRows = rows.filter((r) => r.valid).length;
    const invalidRows = rows.filter((r) => !r.valid).length;

    // Build column mapping
    const firstRowKeys = data.length > 0 ? Object.keys(data[0]) : [];
    const columns = config.fields.map((f) => {
      const matched = firstRowKeys.some(
        (k) => k === f.key || f.aliases.includes(k),
      );
      return { name: f.key, matched, required: f.required };
    });

    return {
      validRows,
      invalidRows,
      totalRows: data.length,
      warnings,
      duplicateEmails: [...duplicateEmails],
      duplicateNames: [...duplicateNames],
      columns,
      rows,
    };
  }

  /**
   * Dry-run an import: run duplicate checks against the DB and validate all
   * rows, but do NOT write anything. Returns a full preview result.
   */
  async dryRun<T extends Record<string, unknown>>(
    data: T[],
    module: string,
  ): Promise<ImportPreviewResult & { dbDuplicates: { emails: string[]; names: string[] } }> {
    const config = this.moduleConfigs.get(module);
    if (!config) {
      throw new BadRequestException(`Module "${module}" tidak memiliki konfigurasi import`);
    }

    // Run client-side validation first
    const preview = this.validateRows(data, config);

    // Check DB duplicates (can't be done in client-only validateRows)
    const emails = data
      .map((r) => (r.email || '').toString().trim().toLowerCase())
      .filter(Boolean);
    const names = data
      .map((r) => (r.nama_lengkap || r.nama || r.name || '').toString().trim().toLowerCase())
      .filter(Boolean);

    const [existingEmails, existingNames] = await Promise.all([
      this.batchCheckEmails(emails, config.duplicateTables),
      this.batchCheckNames(names, config.duplicateTables),
    ]);

    // Merge DB duplicate info into the preview rows
    for (const row of preview.rows) {
      const r = data[row.index];
      const email = (r.email || '').toString().trim().toLowerCase();
      const nama = (r.nama_lengkap || r.nama || r.name || '').toString().trim().toLowerCase();

      if (email && existingEmails.has(email)) {
        row.errors.push(`Email "${email}" sudah terdaftar di sistem`);
        row.valid = false;
      }
      if (nama && existingNames.has(nama)) {
        row.errors.push(`Nama "${nama}" sudah terdaftar di sistem`);
        row.valid = false;
      }
    }

    // Recalculate after merging
    const validRows = preview.rows.filter((r) => r.valid).length;
    const invalidRows = preview.rows.filter((r) => !r.valid).length;

    return {
      ...preview,
      validRows,
      invalidRows,
      rows: preview.rows,
      dbDuplicates: {
        emails: [...existingEmails],
        names: [...existingNames],
      },
    };
  }

  /**
   * Generate a CSV string from an array of records, using field definitions
   * to determine header order and column names.
   */
  /**
   * Escape a single CSV field value.
   * Handles commas, quotes, newlines, and formula injection characters.
   */
  private escapeCsvValue(value: string): string {
    // Prevent CSV formula injection: prefix =, +, -, @ with an actual tab character
    const formulaChars = ["=", "+", "-", "@"];
    let escaped = value;
    if (formulaChars.includes(escaped.charAt(0))) {
      escaped = "	" + escaped;
    }
    // Wrap in quotes if contains comma, quote, actual newline, or carriage return
    if (escaped.includes(",") || escaped.includes("\"") || escaped.includes("\n") || escaped.includes("\r")) {
      return `"${escaped.replace(/"/g, '""')}"`;
    }
    return escaped;
  }
  /**
   * Generate a CSV template string with headers and a sample row.
   * Useful for providing downloadable CSV templates for import.
   */
  generateTemplate(fields: ImportFieldDefinition[]): string {
    const headers = fields.map((f) => f.key);
    const sampleRow = fields.map((f) => f.example || '');
    return [headers.join(','), sampleRow.join(',')].join('\n');
  }

  /**
   * Log import to the audit trail. Fire-and-forget with .catch().
   */
  private logImportAudit(
    module: string,
    totalRows: number,
    result: CsvImportResult,
  ): void {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (this.prisma as any).importLog
      .create({
        data: {
          module,
          totalRows,
          successRows: result.success,
          errorRows: result.errors + result.incomplete,
          details: result.details.length > 0 ? result.details.slice(0, 100) : undefined,
        },
      })
      .catch((err: Error) =>
        this.logger.warn('Failed to write import log:', err.message),
      );
  }
}
