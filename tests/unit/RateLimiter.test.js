/**
 * RateLimiter.test.js
 * RateLimiter.js 단위 테스트
 *
 * 목표 커버리지: 80%
 */

const RateLimiter = require('../../src/utils/RateLimiter');

// Helper function to create async tasks
const createTask = (value, delay = 10) => {
  return async () => {
    await new Promise(resolve => setTimeout(resolve, delay));
    return value;
  };
};

describe('RateLimiter', () => {
  let limiter;

  beforeEach(() => {
    limiter = new RateLimiter({
      maxConcurrent: 2,
      requestsPerMinute: 10,
      requestsPerHour: 100
    });
  });

  afterEach(async () => {
    if (limiter) {
      limiter.clear();
      await limiter.waitForAll();
    }
  });

  describe('constructor', () => {
    it('should create instance with default config', () => {
      const defaultLimiter = new RateLimiter();
      expect(defaultLimiter.config.maxConcurrent).toBe(5);
      expect(defaultLimiter.config.requestsPerMinute).toBe(30);
      expect(defaultLimiter.config.requestsPerHour).toBe(1000);
    });

    it('should create instance with custom config', () => {
      const customLimiter = new RateLimiter({
        maxConcurrent: 10,
        requestsPerMinute: 50
      });
      expect(customLimiter.config.maxConcurrent).toBe(10);
      expect(customLimiter.config.requestsPerMinute).toBe(50);
    });

    it('should initialize empty queues', () => {
      expect(limiter.queues.HIGH).toEqual([]);
      expect(limiter.queues.MEDIUM).toEqual([]);
      expect(limiter.queues.LOW).toEqual([]);
    });

    it('should initialize ring buffer request history', () => {
      expect(limiter.requestHistory.minute.length).toBe(10);
      expect(limiter.requestHistory.hour.length).toBe(100);
      expect(limiter.requestHistory.minuteIndex).toBe(0);
      expect(limiter.requestHistory.hourIndex).toBe(0);
    });
  });

  describe('add', () => {
    it('should add and execute task successfully', async () => {
      const result = await limiter.add(createTask('success'));
      expect(result).toBe('success');
    });

    it('should handle task with priority', async () => {
      const result = await limiter.add(createTask('high-priority'), { priority: 'HIGH' });
      expect(result).toBe('high-priority');
    });

    it('should handle task with custom id', async () => {
      const result = await limiter.add(createTask('custom-id'), { id: 'test-task-1' });
      expect(result).toBe('custom-id');
    });

    it('should handle task rejection', async () => {
      const errorTask = async () => {
        throw new Error('Task failed');
      };

      await expect(limiter.add(errorTask)).rejects.toThrow('Task failed');
    });

    it('should increment stats on task add', async () => {
      const initialTotal = limiter.stats.totalRequests;
      await limiter.add(createTask('test'));
      expect(limiter.stats.totalRequests).toBe(initialTotal + 1);
    });
  });

  describe('concurrent execution limits', () => {
    it('should respect maxConcurrent limit', async () => {
      const execOrder = [];
      const tasks = [];

      // Create 5 tasks with maxConcurrent=2
      for (let i = 0; i < 5; i++) {
        tasks.push(
          limiter.add(async () => {
            execOrder.push(`start-${i}`);
            await new Promise(resolve => setTimeout(resolve, 50));
            execOrder.push(`end-${i}`);
            return i;
          })
        );
      }

      const results = await Promise.all(tasks);
      expect(results).toEqual([0, 1, 2, 3, 4]);

      // At any given time, max 2 tasks should be running
      // So we should see at most 2 'start' events before first 'end'
      const firstEndIndex = execOrder.findIndex(e => e.startsWith('end'));
      const startsBeforeFirstEnd = execOrder.slice(0, firstEndIndex).filter(e => e.startsWith('start'));
      expect(startsBeforeFirstEnd.length).toBeLessThanOrEqual(2);
    });
  });

  describe('priority queue', () => {
    it('should execute HIGH priority tasks first', async () => {
      // Fill the queue to capacity
      const slowTask = async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return 'slow';
      };

      // Start 2 slow tasks (maxConcurrent=2)
      limiter.add(slowTask);
      limiter.add(slowTask);

      // Wait a bit to ensure they're running
      await new Promise(resolve => setTimeout(resolve, 20));

      // Add tasks with different priorities
      const lowPromise = limiter.add(createTask('low'), { priority: 'LOW' });
      const mediumPromise = limiter.add(createTask('medium'), { priority: 'MEDIUM' });
      const highPromise = limiter.add(createTask('high'), { priority: 'HIGH' });

      const results = await Promise.all([highPromise, mediumPromise, lowPromise]);

      // HIGH should complete before MEDIUM and LOW
      expect(results).toEqual(['high', 'medium', 'low']);
    });
  });

  describe('getQueueSize', () => {
    it('should return total queue size', () => {
      expect(limiter.getQueueSize()).toBe(0);

      // Note: We can't easily test non-zero queue size because tasks execute immediately
      // when below concurrency limit
    });
  });

  describe('getStatus', () => {
    it('should return current status', async () => {
      const status1 = limiter.getStatus();
      expect(status1).toHaveProperty('inProgress');
      expect(status1).toHaveProperty('queued');
      expect(status1).toHaveProperty('stats');
      expect(status1.inProgress).toBe(0);

      // Execute a task
      await limiter.add(createTask('test'));

      const status2 = limiter.getStatus();
      expect(status2.stats.completed).toBeGreaterThan(0);
    });
  });

  describe('waitForAll', () => {
    it('should wait for all tasks to complete', async () => {
      let completed = 0;

      const task = async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
        completed++;
        return 'done';
      };

      limiter.add(task);
      limiter.add(task);
      limiter.add(task);

      await limiter.waitForAll();

      expect(completed).toBe(3);
    });

    it('should resolve immediately when no tasks', async () => {
      const start = Date.now();
      await limiter.waitForAll();
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(50); // Should be almost instant
    });
  });

  describe('clear', () => {
    it('should clear all queues', () => {
      limiter.queues.HIGH.push({ id: 'test' });
      limiter.queues.MEDIUM.push({ id: 'test' });
      limiter.queues.LOW.push({ id: 'test' });

      limiter.clear();

      expect(limiter.queues.HIGH).toHaveLength(0);
      expect(limiter.queues.MEDIUM).toHaveLength(0);
      expect(limiter.queues.LOW).toHaveLength(0);
    });

    it('should emit queueCleared event', (done) => {
      limiter.once('queueCleared', () => {
        done();
      });

      limiter.clear();
    });
  });

  describe('events', () => {
    it('should emit taskQueued event', (done) => {
      limiter.once('taskQueued', (data) => {
        expect(data).toHaveProperty('taskId');
        expect(data).toHaveProperty('priority');
        expect(data).toHaveProperty('queueSize');
        done();
      });

      limiter.add(createTask('test'));
    });

    it('should emit taskStarted event', (done) => {
      limiter.once('taskStarted', (data) => {
        expect(data).toHaveProperty('taskId');
        done();
      });

      limiter.add(createTask('test'));
    });

    it('should emit taskCompleted event', (done) => {
      limiter.once('taskCompleted', (data) => {
        expect(data).toHaveProperty('taskId');
        expect(data).toHaveProperty('duration');
        done();
      });

      limiter.add(createTask('test'));
    });

    it('should emit taskFailed event on error', async () => {
      const failedEvent = new Promise((resolve) => {
        limiter.once('taskFailed', (data) => {
          expect(data).toHaveProperty('taskId');
          expect(data).toHaveProperty('error');
          resolve();
        });
      });

      try {
        await limiter.add(async () => {
          throw new Error('Test error');
        });
      } catch (e) {
        // Expected
      }

      await failedEvent;
    });
  });

  describe('statistics', () => {
    it('should track completed tasks', async () => {
      const initialCompleted = limiter.stats.completed;

      await limiter.add(createTask('test1'));
      await limiter.add(createTask('test2'));

      // Wait a bit for stats to update
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(limiter.stats.completed).toBeGreaterThanOrEqual(initialCompleted + 2);
    });

    it('should track failed tasks', async () => {
      const initialFailed = limiter.stats.failed;

      try {
        await limiter.add(async () => {
          throw new Error('Intentional error');
        });
      } catch (e) {
        // Expected
      }

      // Wait a bit for stats to update
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(limiter.stats.failed).toBeGreaterThanOrEqual(initialFailed + 1);
    });
  });

  describe('edge cases', () => {
    it('should handle task that returns undefined', async () => {
      const result = await limiter.add(async () => {
        // Returns undefined implicitly
      });

      expect(result).toBeUndefined();
    });

    it('should handle task that returns null', async () => {
      const result = await limiter.add(async () => null);
      expect(result).toBe(null);
    });

    it('should handle task that returns 0', async () => {
      const result = await limiter.add(async () => 0);
      expect(result).toBe(0);
    });

    it('should handle synchronous function', async () => {
      const result = await limiter.add(() => 'sync-result');
      expect(result).toBe('sync-result');
    });
  });
});
