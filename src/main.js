#!/usr/bin/env node

/**
 * CLI Entry Point
 * Command parsing for L1/L2/L3 stages
 */

import { Command } from 'commander';
import configManager from './services/config-manager.js';
import logger from './lib/logger.js';
import { processL1, processL1FromFile } from './processors/l1-processor.js';

const program = new Command();

// Initialize configuration
configManager.load();

program
  .name('naver-place-seo')
  .description('Naver Place SEO Automation Tool - Quick Start V1')
  .version('1.0.0');

/**
 * L1 Command - Data Collection
 */
program
  .command('l1')
  .description('Run L1 data collection and keyword element extraction')
  .option('-i, --input <file>', 'Input file with place IDs (one per line)', 'data/input/place_ids.txt')
  .option('-o, --output <dir>', 'Output directory', 'data/output/l1/')
  .option('--place-id <id>', 'Single place ID to process')
  .option('--force-refresh', 'Force re-scraping even if cached data exists', false)
  .option('--no-batch', 'Disable batch scraping (process sequentially)', false)
  .action(async (options) => {
    try {
      logger.info('L1 command started', { options });

      console.log('\n🔄 L1 Data Collection Starting...\n');

      let results;

      if (options.placeId) {
        // Single place ID
        console.log(`Processing single place: ${options.placeId}\n`);
        results = await processL1([options.placeId], {
          forceRefresh: options.forceRefresh,
          useBatchScraping: false
        });
      } else {
        // Multiple places from file
        console.log(`Loading place IDs from: ${options.input}\n`);
        results = await processL1FromFile(options.input, {
          forceRefresh: options.forceRefresh,
          useBatchScraping: options.batch
        });
      }

      // Display results
      console.log('\n✅ L1 Processing Complete!\n');
      console.log(`📊 Results:`);
      console.log(`   Total Places: ${results.statistics.total}`);
      console.log(`   Successful: ${results.statistics.successful}`);
      console.log(`   Failed: ${results.statistics.failed}`);
      console.log(`   Success Rate: ${results.statistics.successRate}%`);
      console.log(`   Duration: ${(results.statistics.duration / 1000).toFixed(2)}s`);

      if (results.errors.length > 0) {
        console.log(`\n⚠️  Errors: ${results.errors.length}`);
        results.errors.forEach((err, i) => {
          console.log(`   ${i + 1}. [${err.code}] Place ${err.placeId}: ${err.message}`);
        });
      }

      console.log(`\n📁 Outputs written to: ${options.output}`);
      console.log(`   - data_collected_l1.json`);
      console.log(`   - keyword_elements_l1.json`);
      if (results.errors.length > 0) {
        console.log(`   - l1_errors.json`);
      }
      console.log('\n');

      logger.info('L1 command completed successfully');
      process.exit(0);

    } catch (error) {
      console.error('\n❌ L1 Processing Failed!\n');
      console.error(`Error: ${error.message}`);
      if (error.code) {
        console.error(`Error Code: ${error.code}`);
      }
      if (error.recoveryGuide_en) {
        console.error(`\nRecovery Guide:\n${error.recoveryGuide_en}`);
      }
      console.error('\n');

      logger.error('L1 command failed', { error: error.message, code: error.code });
      process.exit(1);
    }
  });

/**
 * L2 Command - AI Keyword Analysis
 */
program
  .command('l2')
  .description('Generate keyword candidates from L1 output')
  .option('-i, --input <path>', 'L1 output directory or file', 'data/output/l1/')
  .option('--no-ai', 'Disable AI analysis (only use search volume)', false)
  .action(async (options) => {
    try {
      logger.info('L2 command started', { options });

      console.log('\n🤖 L2 AI Keyword Analysis Starting...\n');

      // Import L2 processor
      const { processL2 } = await import('./processors/l2-processor.js');

      // Run L2 processing
      console.log(`Loading L1 data from: ${options.input}\n`);

      const results = await processL2(options.input, {
        useAI: options.ai
      });

      // Display results
      console.log('\n✅ L2 Processing Complete!\n');
      console.log(`📊 Results:`);
      console.log(`   Total Places: ${results.statistics.total_places}`);
      console.log(`   Successful: ${results.statistics.successful}`);
      console.log(`   Failed: ${results.statistics.failed}`);

      // Show per-place summary
      Object.entries(results.places).forEach(([placeId, result]) => {
        console.log(`\n   Place ${placeId}:`);
        console.log(`     - Keyword Matrix Size: ${result.matrix_size}`);
        console.log(`     - Total Candidates: ${result.candidates.length}`);
        console.log(`     - Avg Search Volume: ${result.metadata.avg_search_volume}`);
        console.log(`     - AI Analysis: ${result.ai_analysis_used ? 'Yes' : 'No (Mock mode)'}`);

        if (result.comparison.has_comparison) {
          console.log(`     - Current Keywords: ${result.comparison.current_keyword_count}`);
          console.log(`     - New Candidates: ${result.comparison.new_candidate_count}`);
          console.log(`     - Volume Improvement: ${result.comparison.volume_improvement_percent}%`);
        }
      });

      if (results.errors.length > 0) {
        console.log(`\n⚠️  Errors: ${results.errors.length}`);
        results.errors.forEach((err, i) => {
          console.log(`   ${i + 1}. [${err.code}] Place ${err.placeId}: ${err.message}`);
        });
      }

      console.log(`\n📁 Output written to: data/output/l2/target_keywords_l2.json`);
      console.log('\\n');

      logger.info('L2 command completed successfully');
      process.exit(0);

    } catch (error) {
      console.error('\n❌ L2 Processing Failed!\n');
      console.error(`Error: ${error.message}`);
      if (error.code) {
        console.error(`Error Code: ${error.code}`);
      }
      if (error.recoveryGuide_en) {
        console.error(`\nRecovery Guide:\n${error.recoveryGuide_en}`);
      }
      console.error('\n');

      logger.error('L2 command failed', { error: error.message, code: error.code });
      process.exit(1);
    }
  });

/**
 * L3 Command - Final Strategy Generation
 */
program
  .command('l3')
  .description('Generate final keyword strategy from L2 candidates')
  .option('-i, --input <file>', 'L2 candidates file', 'data/output/l2/target_keywords_l2.json')
  .action(async (options) => {
    try {
      logger.info('L3 command started', { options });

      console.log('\n🎯 L3 Final Strategy Generation Starting...\n');

      // Import L3 processor
      const { processL3 } = await import('./processors/l3-processor.js');

      // Run L3 processing
      console.log(`Loading L2 data from: ${options.input}\n`);

      const results = await processL3(options.input);

      // Display results
      console.log('\n✅ L3 Processing Complete!\n');
      console.log(`📊 Results:`);
      console.log(`   Total Places: ${results.statistics.total_places}`);
      console.log(`   Successful: ${results.statistics.successful}`);
      console.log(`   Failed: ${results.statistics.failed}`);

      // Show per-place summary
      Object.entries(results.places).forEach(([placeId, result]) => {
        console.log(`\n   Place ${placeId}:`);
        console.log(`     Primary Keywords (${result.primary_keywords.length}):`);
        result.primary_keywords.forEach((kw, i) => {
          console.log(`       ${i + 1}. ${kw.keyword} (score: ${kw.composite_score}, volume: ${kw.search_volume})`);
        });

        console.log(`\n     Secondary Keywords (${result.secondary_keywords.length}):`);
        result.secondary_keywords.slice(0, 5).forEach((kw, i) => {
          console.log(`       ${i + 1}. ${kw.keyword} (score: ${kw.composite_score})`);
        });
        if (result.secondary_keywords.length > 5) {
          console.log(`       ... and ${result.secondary_keywords.length - 5} more`);
        }

        console.log(`\n     Strategy:`);
        console.log(`       - Focus: ${result.strategy.focus}`);
        console.log(`       - Approach: ${result.strategy.approach}`);
        console.log(`       - Expected Impact: ${result.strategy.expected_impact}`);
      });

      if (results.errors.length > 0) {
        console.log(`\n⚠️  Errors: ${results.errors.length}`);
        results.errors.forEach((err, i) => {
          console.log(`   ${i + 1}. [${err.code}] Place ${err.placeId}: ${err.message}`);
        });
      }

      console.log(`\n📁 Output written to: data/output/l3/keyword_strategy.json`);
      console.log(`\n💡 Tip: Review the application_guide in the output file for step-by-step instructions`);
      console.log('\\n');

      logger.info('L3 command completed successfully');
      process.exit(0);

    } catch (error) {
      console.error('\n❌ L3 Processing Failed!\n');
      console.error(`Error: ${error.message}`);
      if (error.code) {
        console.error(`Error Code: ${error.code}`);
      }
      if (error.recoveryGuide_en) {
        console.error(`\nRecovery Guide:\n${error.recoveryGuide_en}`);
      }
      console.error('\n');

      logger.error('L3 command failed', { error: error.message, code: error.code });
      process.exit(1);
    }
  });

/**
 * Config Command - Show configuration
 */
program
  .command('config')
  .description('Show current configuration')
  .action(() => {
    const config = configManager.getAll();

    console.log('\n📋 Current Configuration:\n');
    console.log('Mock Modes:');
    console.log(`  AI Mock Mode: ${configManager.isAiMockMode()}`);
    console.log(`  Naver Mock Mode: ${configManager.isNaverMockMode()}`);
    console.log('\nPaths:');
    console.log(`  Input: ${config.paths.data.input}`);
    console.log(`  Output: ${config.paths.data.output}`);
    console.log(`  Logs: ${config.paths.data.logs}`);
    console.log('\nCrawler:');
    console.log(`  Max Retries: ${config.crawler.max_retries}`);
    console.log(`  Bot Detection Wait: ${config.crawler.bot_detection_wait}ms`);
    console.log(`  Timeout: ${config.crawler.timeout}ms`);
    console.log('\nGUI Server:');
    console.log(`  Port: ${config.gui.port}`);
    console.log(`  Host: ${config.gui.host}`);
    console.log('\n');
  });

/**
 * Info Command - System information
 */
program
  .command('info')
  .description('Show system information')
  .action(() => {
    console.log('\n📊 System Information:\n');
    console.log(`Node.js Version: ${process.version}`);
    console.log(`Platform: ${process.platform}`);
    console.log(`Architecture: ${process.arch}`);
    console.log(`Working Directory: ${process.cwd()}`);
    console.log(`Memory Usage: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`);
    console.log('\n');
  });

// Parse command line arguments
program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
