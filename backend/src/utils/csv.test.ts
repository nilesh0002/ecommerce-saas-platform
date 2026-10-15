import assert from 'node:assert/strict';
import test from 'node:test';
import { escapeCsvCell, sanitizeCsvCell } from './csv';

test('sanitizes spreadsheet formula prefixes', () => {
  for (const value of ['=SUM(A1)', '+1', '-1', '@cmd', '\tformula', '\rformula']) {
    assert.equal(sanitizeCsvCell(value), `'${value}`);
  }
  assert.equal(sanitizeCsvCell('safe'), 'safe');
});

test('escapes quotes after sanitizing cells', () => {
  assert.equal(escapeCsvCell('="quoted"'), '"' + "'=" + '""quoted""' + '"');
});
