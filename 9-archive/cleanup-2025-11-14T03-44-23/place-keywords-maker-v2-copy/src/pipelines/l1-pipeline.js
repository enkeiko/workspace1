/**
 * L1 파이프라인 - 네이버 플레이스 데이터 수집
 */

import { L1Processor } from '../modules/processor/L1Processor.js';
import fs from 'fs/promises';
import path from 'path';
import yaml from 'js-yaml';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

async function loadConfig() {
  const configPath = path.join(__dirname, '../config/default.yml');
  const configFile = await fs.readFile(configPath, 'utf-8');
  return yaml.load(configFile);
}

async function loadPlaceIds() {
  const inputPath = path.join(__dirname, '../../data/input/place-ids.txt');

  try {
    const content = await fs.readFile(inputPath, 'utf-8');
    const ids = content
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#'))
      .filter(id => /^\d+$/.test(id));

    return ids;
  } catch (error) {
    console.log('❌ place-ids.txt 파일을 찾을 수 없습니다.');
    console.log('📁 다음 위치에 파일을 만들어주세요:');
    console.log(`   ${inputPath}`);
    return [];
  }
}

async function main() {
  console.log('🚀 L1 파이프라인 시작\n');

  // 설정 로드
  const config = await loadConfig();

  // Place ID 로드
  const placeIds = await loadPlaceIds();

  if (placeIds.length === 0) {
    console.log('⚠️  처리할 Place ID가 없습니다.');
    console.log('\n💡 사용법:');
    console.log('1. data/input/place-ids.txt 파일에 Place ID 입력');
    console.log('2. npm run l1 실행\n');
    return;
  }

  console.log(`📋 처리할 매장 수: ${placeIds.length}`);
  console.log(`📍 Place IDs: ${placeIds.join(', ')}\n`);

  // L1 Processor 초기화
  const processor = new L1Processor({
    crawler: config.crawler,
    parser: config.parser,
    outputDir: config.pipeline.l1.outputDir,
  });

  try {
    await processor.initialize();

    console.log('⏳ 크롤링 시작...\n');

    // 배치 처리
    const results = await processor.processBatch(placeIds);

    // 결과 요약
    console.log('\n' + '='.repeat(50));
    console.log('📊 처리 결과');
    console.log('='.repeat(50));
    console.log(`✅ 성공: ${results.successful}개`);
    console.log(`❌ 실패: ${results.failed}개`);
    console.log(`📁 출력 위치: ${config.pipeline.l1.outputDir}\n`);

    // 각 매장별 완성도 표시
    console.log('📋 매장별 완성도:');
    results.places.forEach(place => {
      if (place.success) {
        console.log(`  - ${place.placeId}: ${place.completeness}%`);
      } else {
        console.log(`  - ${place.placeId}: ❌ ${place.error}`);
      }
    });

  } catch (error) {
    console.error('❌ 에러 발생:', error);
  } finally {
    await processor.cleanup();
  }

  console.log('\n✨ L1 파이프라인 완료\n');
}

// 실행
main().catch(console.error);
