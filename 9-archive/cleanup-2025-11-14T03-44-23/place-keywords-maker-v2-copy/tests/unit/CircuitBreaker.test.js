/**
 * CircuitBreaker 단위 테스트
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import { CircuitBreaker } from '../../src/utils/CircuitBreaker.js';

describe('CircuitBreaker', () => {
  let circuitBreaker;

  beforeEach(() => {
    circuitBreaker = new CircuitBreaker({
      failureThreshold: 3,
      resetTimeout: 1000,
    });
  });

  test('초기 상태는 CLOSED', () => {
    expect(circuitBreaker.state).toBe('CLOSED');
    expect(circuitBreaker.failureCount).toBe(0);
  });

  test('성공 시 CLOSED 상태 유지', async () => {
    const successFn = async () => 'success';

    const result = await circuitBreaker.execute(successFn);

    expect(result).toBe('success');
    expect(circuitBreaker.state).toBe('CLOSED');
    expect(circuitBreaker.failureCount).toBe(0);
  });

  test('연속 실패 시 OPEN 상태로 전환', async () => {
    const failFn = async () => { throw new Error('fail'); };

    // 3번 실패
    for (let i = 0; i < 3; i++) {
      try {
        await circuitBreaker.execute(failFn);
      } catch (error) {
        // 예상된 에러
      }
    }

    expect(circuitBreaker.state).toBe('OPEN');
    expect(circuitBreaker.failureCount).toBe(3);
  });

  test('OPEN 상태에서 요청 차단', async () => {
    const failFn = async () => { throw new Error('fail'); };

    // Circuit을 OPEN 상태로 만듦
    for (let i = 0; i < 3; i++) {
      try {
        await circuitBreaker.execute(failFn);
      } catch (error) {}
    }

    // OPEN 상태에서 새 요청
    await expect(
      circuitBreaker.execute(failFn)
    ).rejects.toThrow('Circuit breaker is OPEN');
  });

  test('타임아웃 후 HALF_OPEN으로 전환', async () => {
    const failFn = async () => { throw new Error('fail'); };
    const successFn = async () => 'success';

    // Circuit을 OPEN 상태로
    for (let i = 0; i < 3; i++) {
      try {
        await circuitBreaker.execute(failFn);
      } catch (error) {}
    }

    expect(circuitBreaker.state).toBe('OPEN');

    // 타임아웃 대기
    await new Promise(resolve => setTimeout(resolve, 1100));

    // 성공 시 CLOSED로 복귀
    const result = await circuitBreaker.execute(successFn);
    expect(result).toBe('success');
    expect(circuitBreaker.state).toBe('CLOSED');
  });

  test('reset() 메서드로 상태 초기화', async () => {
    const failFn = async () => { throw new Error('fail'); };

    // Circuit을 OPEN 상태로
    for (let i = 0; i < 3; i++) {
      try {
        await circuitBreaker.execute(failFn);
      } catch (error) {}
    }

    expect(circuitBreaker.state).toBe('OPEN');

    // 리셋
    circuitBreaker.reset();

    expect(circuitBreaker.state).toBe('CLOSED');
    expect(circuitBreaker.failureCount).toBe(0);
  });
});