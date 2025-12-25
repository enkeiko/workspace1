export class CircuitBreaker {
  constructor({ failureThreshold = 5, resetTimeout = 60000 } = {}) {
    this.failureThreshold = failureThreshold;
    this.resetTimeout = resetTimeout;
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.nextAttempt = Date.now();
  }
  async execute(fn) {
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) throw new Error('Circuit breaker is OPEN - request blocked');
      this.state = 'HALF_OPEN';
    }
    try { const res = await fn(); this._onSuccess(); return res; }
    catch (err) { this._onFailure(); throw err; }
  }
  _onSuccess() { this.failureCount = 0; this.state = 'CLOSED'; }
  _onFailure() {
    this.failureCount++;
    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.resetTimeout;
    }
  }
  reset() { this.state='CLOSED'; this.failureCount=0; this.nextAttempt=Date.now(); }
  getStatus() { return { state:this.state, failureCount:this.failureCount, nextAttempt:new Date(this.nextAttempt).toISOString() }; }
}

