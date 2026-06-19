/**
 * Shared CSV utility functions for parsing and validation.
 * Extracted from candidates import page for reuse across modules.
 */

/**
 * Detect the delimiter used in a CSV line by counting occurrences
 * of common delimiters (comma, semicolon, tab).
 */
export function detectDelimiter(line: string): string {
  const commaCount = (line.match(/,/g) || []).length;
  const semicolonCount = (line.match(/;/g) || []).length;
  const tabCount = (line.match(/\t/g) || []).length;

  if (semicolonCount > commaCount && semicolonCount > tabCount) return ';';
  if (tabCount > commaCount && tabCount > semicolonCount) return '\t';
  return ',';
}

/**
 * Parse CSV content into logical lines, joining multi-line quoted fields.
 * Handles \r\n, \n, \r line endings and escaped quotes ("").
 */
export function splitCsvLines(text: string): string[] {
  const lines: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if ((char === '\r' && nextChar === '\n') || (char === '\n' && nextChar === '\r')) {
      if (!inQuotes) {
        lines.push(current);
        current = '';
        i++;
      } else {
        current += '\n';
        i++;
      }
    } else if (char === '\n' || char === '\r') {
      if (!inQuotes) {
        lines.push(current);
        current = '';
      } else {
        current += '\n';
      }
    } else {
      current += char;
    }
  }

  if (current.trim().length > 0 || lines.length === 0) {
    lines.push(current);
  }

  return lines;
}

/**
 * Parse a single CSV line into an array of field values,
 * handling quoted fields and escaped quotes.
 */
export function parseCsvLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote inside quoted field
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

/**
 * Parse a full CSV text into an array of row objects keyed by headers.
 * Returns { headers, data, errors } where errors are any parsing issues.
 */
export function parseCsvContent(
  text: string,
  maxRows = 500,
): {
  headers: string[];
  data: Record<string, string>[];
  delimiter: string;
  rowCount: number;
  error?: string;
} {
  const allLines = splitCsvLines(text);
  const nonEmptyLines = allLines.filter((l) => l.trim().length > 0);

  if (nonEmptyLines.length < 2) {
    return { headers: [], data: [], delimiter: ',', rowCount: 0, error: 'File CSV harus memiliki header dan minimal 1 baris data' };
  }

  const headerLine = nonEmptyLines[0];
  const delimiter = detectDelimiter(headerLine);
  const headers = parseCsvLine(headerLine, delimiter).map((h) => h.trim());

  const dataRowCount = nonEmptyLines.length - 1;
  if (dataRowCount > maxRows) {
    return {
      headers: [],
      data: [],
      delimiter,
      rowCount: dataRowCount,
      error: `Maksimal ${maxRows} baris data per import. File Anda memiliki ${dataRowCount} baris.`,
    };
  }

  const data = nonEmptyLines.slice(1).map((line) => {
    const vals = parseCsvLine(line, delimiter);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = vals[i] || '';
    });
    return row;
  });

  return { headers, data, delimiter, rowCount: data.length };
}

/**
 * Find a header that matches the target (case-insensitive).
 */
export function matchHeader(headers: string[], target: string): string | undefined {
  return headers.find((h) => h.toLowerCase() === target.toLowerCase());
}

/**
 * Format file size in human-readable format.
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Validate email format.
 */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Validate Indonesian phone number format.
 */
export function isValidPhone(phone: string): boolean {
  return /^(\+?62|0)\d{8,13}$/.test(phone.replace(/[\s-]/g, ''));
}
