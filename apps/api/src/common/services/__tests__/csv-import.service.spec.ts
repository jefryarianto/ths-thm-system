import { Test, TestingModule } from '@nestjs/testing';
import { CsvImportService } from '../csv-import.service';
import { PrismaService } from '../../../prisma/prisma.service';

/**
 * Helper to access the private escapeCsvValue method on CsvImportService.
 */
function escapeCsvValue(service: CsvImportService, value: string): string {
  return (service as any).escapeCsvValue(value);
}

describe('CsvImportService — escapeCsvValue', () => {
  let service: CsvImportService;

  const mockPrisma = {};

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CsvImportService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<CsvImportService>(CsvImportService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ── Basic: no special chars ────────────────────────────

  it('should return a simple value unchanged', () => {
    expect(escapeCsvValue(service, 'Alice')).toBe('Alice');
  });

  it('should return an empty string unchanged', () => {
    expect(escapeCsvValue(service, '')).toBe('');
  });

  it('should leave numbers-as-strings unchanged', () => {
    expect(escapeCsvValue(service, '12345')).toBe('12345');
  });

  it('should leave strings with spaces unchanged', () => {
    expect(escapeCsvValue(service, 'hello world')).toBe('hello world');
  });

  // ── Comma handling ─────────────────────────────────────

  it('should wrap values containing commas in double quotes', () => {
    expect(escapeCsvValue(service, 'Alice, Bob')).toBe('"Alice, Bob"');
  });

  it('should wrap values ending with a comma', () => {
    expect(escapeCsvValue(service, 'trailing,')).toBe('"trailing,"');
  });

  // ── Double-quote handling ──────────────────────────────

  it('should double-escape double-quote characters', () => {
    // Input: He said "hello"
    // After replace: He said ""hello""
    // After wrap: "He said ""hello"""
    expect(escapeCsvValue(service, 'He said "hello"')).toBe('"He said ""hello"""');
  });

  it('should handle consecutive double quotes', () => {
    // Input: ""double""  (4 quotes, 6 letters = 10 chars)
    // Each " becomes "" → """"double"""" (8 quotes, 6 letters = 14 chars)
    // Wrap: " + """"double"""" + " = """""double""""" (5+6+5 = 16 chars)
    expect(escapeCsvValue(service, '""double""')).toBe('"""""double"""""');
  });

  it('should handle a single double-quote character', () => {
    // Input: " (1 char)
    // Each " becomes "" → "" (2 chars)
    // Wrap: " + "" + " = """ (3 chars)
    // Input: " (1 char)
    // Each " becomes "" → "" (2 chars)
    // Wrap: " + "" + " = """" (4 chars)
    expect(escapeCsvValue(service, '"')).toBe('""""');
  });

  // ── Newline handling ───────────────────────────────────

  it('should wrap values containing actual newlines in double quotes', () => {
    expect(escapeCsvValue(service, 'Line1\nLine2')).toBe('"Line1\nLine2"');
  });

  it('should handle values with multiple newlines', () => {
    expect(escapeCsvValue(service, 'A\nB\nC')).toBe('"A\nB\nC"');
  });

  it('should handle leading newline', () => {
    expect(escapeCsvValue(service, '\nstart')).toBe('"\nstart"');
  });

  it('should handle trailing newline', () => {
    expect(escapeCsvValue(service, 'end\n')).toBe('"end\n"');
  });

  // ── Carriage return handling ───────────────────────────

  it('should wrap values containing carriage returns in double quotes', () => {
    expect(escapeCsvValue(service, 'Hello\rWorld')).toBe('"Hello\rWorld"');
  });

  it('should wrap Windows-style CRLF line endings', () => {
    expect(escapeCsvValue(service, 'Line1\r\nLine2')).toBe('"Line1\r\nLine2"');
  });

  // ── Formula injection prevention ──────────────────────

  it('should prefix values starting with = to prevent formula injection', () => {
    // =SUM(A1:A10) → \t=SUM(A1:A10) (no comma → no wrap)
    expect(escapeCsvValue(service, '=SUM(A1:A10)')).toBe('\t=SUM(A1:A10)');
  });

  it('should prefix values starting with + to prevent formula injection', () => {
    // +1+2 → \t+1+2 (no comma → no wrap)
    expect(escapeCsvValue(service, '+1+2')).toBe('\t+1+2');
  });

  it('should prefix values starting with - to prevent formula injection', () => {
    // -1+2 → \t-1+2 (no comma → no wrap)
    expect(escapeCsvValue(service, '-1+2')).toBe('\t-1+2');
  });

  it('should prefix values starting with @ and also quote if value contains comma', () => {
    // @SUM(1,2) → \t@SUM(1,2) (contains comma → also wrapped)
    expect(escapeCsvValue(service, '@SUM(1,2)')).toBe('"\t@SUM(1,2)"');
  });

  it('should prefix values starting with @ alone (no comma)', () => {
    // @DANGER → \t@DANGER (no comma → no wrap)
    expect(escapeCsvValue(service, '@DANGER')).toBe('\t@DANGER');
  });

  it('should NOT prefix values starting with a letter', () => {
    expect(escapeCsvValue(service, 'Normal')).toBe('Normal');
  });

  it('should NOT prefix values starting with a number', () => {
    expect(escapeCsvValue(service, '12345')).toBe('12345');
  });

  it('should NOT prefix values starting with a space followed by =', () => {
    // The formula character must be the FIRST character
    expect(escapeCsvValue(service, ' =SUM()')).toBe(' =SUM()');
  });

  // ── Combined edge cases ────────────────────────────────

  it('should handle formula-injected values that also contain commas', () => {
    // =SUM(A1,B1) → \t=SUM(A1,B1) (contains comma → also wrapped)
    const result = escapeCsvValue(service, '=SUM(A1,B1)');
    expect(result).toBe('"\t=SUM(A1,B1)"');
  });

  it('should handle formula-injected values that also contain newlines', () => {
    const result = escapeCsvValue(service, '=SUM(\nA1)');
    expect(result).toBe('"\t=SUM(\nA1)"');
  });

  it('should handle values with both commas and quotes', () => {
    // a,b,"c" → contains comma AND quote → wrapped + doubled quotes
    const result = escapeCsvValue(service, 'a,b,"c"');
    expect(result).toBe('"a,b,""c"""');
  });

  it('should handle values with everything: formula, comma, quote, newline', () => {
    const result = escapeCsvValue(service, '=FUNC("x",\ny)');
    // Tab prefix, contains comma, quote, newline → all triggered
    expect(result).toBe('"\t=FUNC(""x"",\ny)"');
  });

  it('should handle a value with only special chars', () => {
    // ",\n\r → contains quote, comma, newline, CR → wrapped
    const result = escapeCsvValue(service, '",\n\r');
    // Input: ",\n\r → 4 runtime chars: " , \n \r
    // After replace: "" , \n \r → 5 chars
    // Wrap: " + "" , \n \r + " → """ , \n \r " → 7 chars
    expect(result).toBe('""",\n\r"');
  });
});
