#!/usr/bin/env node

/**
 * Integration Test Script
 * Tests complete L1 → L2 → L3 pipeline
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const TEST_PLACE_ID = '1768171911';
const OUTPUT_DIR = 'data/output';

console.log('🧪 Starting Integration Test...\n');

// Test configuration
const tests = [];
let passed = 0;
let failed = 0;

function test(name, fn) {
  tests.push({ name, fn });
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function fileExists(filepath) {
  return fs.existsSync(filepath);
}

function fileNotEmpty(filepath) {
  if (!fileExists(filepath)) return false;
  const stats = fs.statSync(filepath);
  return stats.size > 0;
}

function jsonValid(filepath) {
  try {
    const content = fs.readFileSync(filepath, 'utf-8');
    JSON.parse(content);
    return true;
  } catch {
    return false;
  }
}

function runCommand(cmd, description) {
  console.log(`  ▸ ${description}...`);
  try {
    execSync(cmd, { encoding: 'utf-8', stdio: 'pipe' });
    console.log(`    ✓ Success`);
    return true;
  } catch (error) {
    console.log(`    ✗ Failed: ${error.message}`);
    return false;
  }
}

// ========================================
// Test Suite
// ========================================

test('Setup: Check Node.js version', () => {
  const version = process.version;
  const major = parseInt(version.slice(1).split('.')[0]);
  assert(major >= 18, `Node.js v18+ required, got ${version}`);
  console.log(`  ✓ Node.js ${version}`);
});

test('Setup: Check package.json exists', () => {
  assert(fileExists('package.json'), 'package.json not found');
  console.log(`  ✓ package.json found`);
});

test('Setup: Check dependencies installed', () => {
  assert(fs.existsSync('node_modules'), 'node_modules not found - run npm install');
  console.log(`  ✓ node_modules exists`);
});

test('Setup: Check config file exists', () => {
  assert(fileExists('local.config.yml'), 'local.config.yml not found');
  console.log(`  ✓ local.config.yml found`);
});

test('L1: Execute data collection', () => {
  const success = runCommand(
    `node src/main.js l1 --place-id ${TEST_PLACE_ID}`,
    'Running L1 data collection'
  );
  assert(success, 'L1 command failed');
});

test('L1: Verify output files created', () => {
  const files = [
    'data/output/l1/data_collected_l1.json',
    'data/output/l1/keyword_elements_l1.json'
  ];

  files.forEach(file => {
    assert(fileExists(file), `${file} not created`);
    assert(fileNotEmpty(file), `${file} is empty`);
    assert(jsonValid(file), `${file} is not valid JSON`);
    console.log(`  ✓ ${path.basename(file)} OK`);
  });
});

test('L1: Verify data structure', () => {
  const dataPath = 'data/output/l1/data_collected_l1.json';
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

  assert(data[TEST_PLACE_ID], `Place ${TEST_PLACE_ID} not found in output`);
  assert(data[TEST_PLACE_ID].place, 'Place data missing');
  assert(data[TEST_PLACE_ID].place.name, 'Place name missing');
  assert(data[TEST_PLACE_ID].place.category, 'Place category missing');

  console.log(`  ✓ Place name: ${data[TEST_PLACE_ID].place.name}`);
  console.log(`  ✓ Category: ${data[TEST_PLACE_ID].place.category}`);
});

test('L1: Verify keyword elements', () => {
  const elementsPath = 'data/output/l1/keyword_elements_l1.json';
  const elements = JSON.parse(fs.readFileSync(elementsPath, 'utf-8'));

  assert(elements[TEST_PLACE_ID], 'Keyword elements not found');
  assert(elements[TEST_PLACE_ID].core_elements, 'Core elements missing');
  assert(elements[TEST_PLACE_ID].region_elements, 'Region elements missing');
  assert(elements[TEST_PLACE_ID].menu_elements, 'Menu elements missing');

  console.log(`  ✓ Core elements: OK`);
  console.log(`  ✓ Region elements: OK`);
  console.log(`  ✓ Menu elements: OK`);
});

test('L2: Execute keyword analysis', () => {
  const success = runCommand(
    'node src/main.js l2',
    'Running L2 keyword analysis'
  );
  assert(success, 'L2 command failed');
});

test('L2: Verify output file created', () => {
  const file = 'data/output/l2/target_keywords_l2.json';
  assert(fileExists(file), `${file} not created`);
  assert(fileNotEmpty(file), `${file} is empty`);
  assert(jsonValid(file), `${file} is not valid JSON`);
  console.log(`  ✓ target_keywords_l2.json OK`);
});

test('L2: Verify keyword candidates', () => {
  const l2Path = 'data/output/l2/target_keywords_l2.json';
  const l2Data = JSON.parse(fs.readFileSync(l2Path, 'utf-8'));

  assert(l2Data.places, 'Places data missing');
  assert(l2Data.places[TEST_PLACE_ID], `Place ${TEST_PLACE_ID} not found`);

  const placeData = l2Data.places[TEST_PLACE_ID];
  assert(placeData.candidates, 'Candidates missing');
  assert(Array.isArray(placeData.candidates), 'Candidates is not an array');
  assert(placeData.candidates.length > 0, 'No candidates generated');

  console.log(`  ✓ Generated ${placeData.candidates.length} candidates`);
  console.log(`  ✓ Matrix size: ${placeData.matrix_size}`);
  console.log(`  ✓ Avg search volume: ${placeData.metadata.avg_search_volume}`);
});

test('L2: Verify candidate structure', () => {
  const l2Path = 'data/output/l2/target_keywords_l2.json';
  const l2Data = JSON.parse(fs.readFileSync(l2Path, 'utf-8'));
  const candidate = l2Data.places[TEST_PLACE_ID].candidates[0];

  assert(candidate.keyword, 'Keyword missing');
  assert(candidate.type, 'Type missing');
  assert(candidate.classification, 'Classification missing');
  assert(typeof candidate.search_volume === 'number', 'Search volume not a number');
  assert(candidate.competition, 'Competition missing');

  console.log(`  ✓ Sample keyword: ${candidate.keyword}`);
  console.log(`  ✓ Type: ${candidate.type}`);
  console.log(`  ✓ Search volume: ${candidate.search_volume}`);
});

test('L3: Execute strategy generation', () => {
  const success = runCommand(
    'node src/main.js l3',
    'Running L3 strategy generation'
  );
  assert(success, 'L3 command failed');
});

test('L3: Verify output file created', () => {
  const file = 'data/output/l3/keyword_strategy.json';
  assert(fileExists(file), `${file} not created`);
  assert(fileNotEmpty(file), `${file} is empty`);
  assert(jsonValid(file), `${file} is not valid JSON`);
  console.log(`  ✓ keyword_strategy.json OK`);
});

test('L3: Verify strategy structure', () => {
  const l3Path = 'data/output/l3/keyword_strategy.json';
  const l3Data = JSON.parse(fs.readFileSync(l3Path, 'utf-8'));

  assert(l3Data.places, 'Places data missing');
  assert(l3Data.places[TEST_PLACE_ID], `Place ${TEST_PLACE_ID} not found`);

  const placeData = l3Data.places[TEST_PLACE_ID];
  assert(placeData.primary_keywords, 'Primary keywords missing');
  assert(placeData.secondary_keywords, 'Secondary keywords missing');
  assert(placeData.strategy, 'Strategy missing');
  assert(placeData.application_guide, 'Application guide missing');

  console.log(`  ✓ Primary keywords: ${placeData.primary_keywords.length}`);
  console.log(`  ✓ Secondary keywords: ${placeData.secondary_keywords.length}`);
  console.log(`  ✓ Focus: ${placeData.strategy.focus}`);
});

test('L3: Verify primary keywords', () => {
  const l3Path = 'data/output/l3/keyword_strategy.json';
  const l3Data = JSON.parse(fs.readFileSync(l3Path, 'utf-8'));
  const primaryKeywords = l3Data.places[TEST_PLACE_ID].primary_keywords;

  assert(primaryKeywords.length === 5, `Expected 5 primary keywords, got ${primaryKeywords.length}`);

  primaryKeywords.forEach((kw, i) => {
    assert(kw.keyword, `Primary keyword ${i + 1} missing keyword field`);
    assert(kw.composite_score, `Primary keyword ${i + 1} missing score`);
    assert(kw.search_volume, `Primary keyword ${i + 1} missing search volume`);
    assert(kw.rationale, `Primary keyword ${i + 1} missing rationale`);
  });

  console.log(`  ✓ All 5 primary keywords validated`);
  console.log(`  ✓ Top keyword: ${primaryKeywords[0].keyword} (score: ${primaryKeywords[0].composite_score})`);
});

test('L3: Verify application guide', () => {
  const l3Path = 'data/output/l3/keyword_strategy.json';
  const l3Data = JSON.parse(fs.readFileSync(l3Path, 'utf-8'));
  const guide = l3Data.places[TEST_PLACE_ID].application_guide;

  assert(guide.overview, 'Overview missing');
  assert(guide.steps, 'Steps missing');
  assert(Array.isArray(guide.steps), 'Steps is not an array');
  assert(guide.steps.length === 6, `Expected 6 steps, got ${guide.steps.length}`);
  assert(guide.warnings, 'Warnings missing');
  assert(guide.expected_timeline, 'Expected timeline missing');

  console.log(`  ✓ Guide has ${guide.steps.length} steps`);
  console.log(`  ✓ Warnings: ${guide.warnings.length} items`);
});

test('Logs: Verify log files created', () => {
  const logDir = 'data/logs';
  const logFiles = [
    'combined.log',
    'cli.log',
    'error.log'
  ];

  logFiles.forEach(file => {
    const filepath = path.join(logDir, file);
    assert(fileExists(filepath), `${file} not created`);
    console.log(`  ✓ ${file} exists`);
  });
});

// ========================================
// Test Runner
// ========================================

async function runTests() {
  console.log(`Running ${tests.length} tests...\n`);

  for (const { name, fn } of tests) {
    try {
      console.log(`\n${passed + failed + 1}. ${name}`);
      await fn();
      passed++;
    } catch (error) {
      console.log(`  ✗ FAILED: ${error.message}`);
      failed++;
    }
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('Test Summary');
  console.log('='.repeat(50));
  console.log(`Total:  ${tests.length}`);
  console.log(`Passed: ${passed} ✓`);
  console.log(`Failed: ${failed} ✗`);
  console.log(`Success Rate: ${(passed / tests.length * 100).toFixed(1)}%`);
  console.log('='.repeat(50));

  if (failed > 0) {
    console.log('\n❌ Some tests failed!');
    process.exit(1);
  } else {
    console.log('\n✅ All tests passed!');
    process.exit(0);
  }
}

// Run tests
runTests().catch(error => {
  console.error('\n❌ Test runner error:', error);
  process.exit(1);
});
