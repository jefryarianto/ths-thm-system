import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('ESLint no-restricted-syntax: .data.data', () => {
  const eslintrcPath = path.resolve(__dirname, '../../.eslintrc.json');
  const config = JSON.parse(fs.readFileSync(eslintrcPath, 'utf-8'));

  it('has the no-restricted-syntax rule configured', () => {
    expect(config.rules).toBeDefined();
    expect(config.rules['no-restricted-syntax']).toBeDefined();
  });

  it('has the correct selector for .data.data and unwrap message', () => {
    const rule = config.rules['no-restricted-syntax'];
    expect(Array.isArray(rule)).toBe(true);
    expect(rule[0]).toBe('warn');

    const ruleConfig = rule[1];
    expect(ruleConfig.selector).toContain('MemberExpression');
    expect(ruleConfig.selector).toContain('object.property.name="data"');
    expect(ruleConfig.selector).toContain('property.name="data"');
    expect(ruleConfig.message.toLowerCase()).toContain('unwrap');
  });

  it('has a selector matching res.data.data AST pattern', () => {
    const rule = config.rules['no-restricted-syntax'];
    const selector = rule[1].selector;

    // The selector should match the AST structure of nested .data.data
    // Outer MemberExpression with property.name="data" and inner object with property.name="data"
    expect(selector).toBe(
      'MemberExpression[object.type="MemberExpression"][object.property.name="data"][property.name="data"]',
    );
  });

  it('does not match single .data or non-nested patterns', () => {
    const rule = config.rules['no-restricted-syntax'];
    const selector = rule[1].selector;

    // The selector specifically requires two levels of .data
    // Single res.data would NOT match because object.type would be Identifier, not MemberExpression
    expect(selector).not.toContain('Identifier');
  });

  // The inverse mistake: passing an ALREADY-EXTRACTED body into unwrap().
  // unwrap() reads response.data.data, so passing the body double-reads it and
  // silently yields `undefined` (seen in app/struktur-organisasi/content.tsx).
  it('restricts unwrap() being called on a destructured body (unwrap(data))', () => {
    const rule = config.rules['no-restricted-syntax'];
    expect(rule).toHaveLength(4);

    const bodyRule = rule[2];
    expect(bodyRule.selector).toContain('callee.name="unwrap"');
    expect(bodyRule.selector).toContain('Identifier.arguments');
    expect(bodyRule.selector).toContain('name="data"');
    expect(bodyRule.message).toContain('response axios utuh');
  });

  it('restricts unwrap() being called on response.data', () => {
    const rule = config.rules['no-restricted-syntax'];

    const nestedRule = rule[3];
    expect(nestedRule.selector).toContain('callee.name="unwrap"');
    expect(nestedRule.selector).toContain('MemberExpression.arguments');
    expect(nestedRule.selector).toContain('property.name="data"');
    expect(nestedRule.message).toContain('response axios utuh');
  });
});

describe('source scan: unwrap() must never receive an extracted body', () => {
  const root = path.resolve(__dirname, '../..');

  const MISUSE: Array<{ label: string; re: RegExp }> = [
    { label: 'unwrap(data)', re: /unwrap\s*\(\s*data\s*\)/ },
    { label: 'unwrap(<x>.data)', re: /unwrap\s*\(\s*[A-Za-z_$][\w$]*\.data\s*\)/ },
  ];

  function collectSources(dir: string, out: string[] = []): string[] {
    if (!fs.existsSync(dir)) return out;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name === '.next') continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        // Test files may legitimately quote the anti-pattern as a counter-example.
        if (entry.name === '__tests__') continue;
        collectSources(full, out);
      } else if (/\.tsx?$/.test(entry.name) && !/\.(test|spec)\.tsx?$/.test(entry.name)) {
        out.push(full);
      }
    }
    return out;
  }

  it('finds no unwrap() call site passing a body instead of the axios response', () => {
    const files = ['app', 'src'].flatMap((d) => collectSources(path.join(root, d)));
    expect(files.length).toBeGreaterThan(0);

    const violations: string[] = [];
    for (const file of files) {
      const source = fs.readFileSync(file, 'utf-8');
      for (const { label, re } of MISUSE) {
        if (re.test(source)) {
          violations.push(`${path.relative(root, file)} → ${label}`);
        }
      }
    }

    expect(violations).toEqual([]);
  });
});
