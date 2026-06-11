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
      'MemberExpression[object.type="MemberExpression"][object.property.name="data"][property.name="data"]'
    );
  });

  it('does not match single .data or non-nested patterns', () => {
    const rule = config.rules['no-restricted-syntax'];
    const selector = rule[1].selector;

    // The selector specifically requires two levels of .data
    // Single res.data would NOT match because object.type would be Identifier, not MemberExpression
    expect(selector).not.toContain('Identifier');
  });
});
