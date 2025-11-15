/**
 * 간단한 메모리 기반 데이터베이스
 * Phase 1 개발용 - 추후 실제 DB로 교체
 */

class InMemoryDB {
  constructor() {
    this.data = {
      companyInfo: [],
      bankAccounts: [],
      clients: [],
      adAccounts: [],
      stores: [],
      productCategories: [],
      clientProductPrices: [],
      quotes: [],
      quoteItems: [],
      orders: [],
      orderItems: [],
      contracts: [],
      invoices: [],
      payments: [],
      reports: [],
      sequenceCounters: [],
      auditLogs: [],
      notifications: []
    };
    this.idCounters = {};
  }

  /**
   * 다음 ID 생성
   */
  _getNextId(table) {
    if (!this.idCounters[table]) {
      this.idCounters[table] = 1;
    }
    return this.idCounters[table]++;
  }

  /**
   * Create - 레코드 생성
   */
  create(table, data) {
    if (!this.data[table]) {
      throw new Error(`Table ${table} does not exist`);
    }

    const record = {
      id: this._getNextId(table),
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.data[table].push(record);
    return record;
  }

  /**
   * Find Many - 여러 레코드 조회
   */
  findMany(table, options = {}) {
    if (!this.data[table]) {
      throw new Error(`Table ${table} does not exist`);
    }

    let results = [...this.data[table]];

    // Where 조건 필터링
    if (options.where) {
      results = results.filter(record => {
        return Object.keys(options.where).every(key => {
          const value = options.where[key];

          // Nested conditions (e.g., { NOT: {...} })
          if (typeof value === 'object' && value !== null) {
            if (value.contains) {
              return record[key]?.toLowerCase().includes(value.contains.toLowerCase());
            }
            if (value.equals !== undefined) {
              return record[key] === value.equals;
            }
          }

          return record[key] === value;
        });
      });
    }

    // OrderBy 정렬
    if (options.orderBy) {
      const [[field, direction]] = Object.entries(options.orderBy);
      results.sort((a, b) => {
        if (direction === 'asc') {
          return a[field] > b[field] ? 1 : -1;
        } else {
          return a[field] < b[field] ? 1 : -1;
        }
      });
    }

    // Skip & Take (페이지네이션)
    if (options.skip) {
      results = results.slice(options.skip);
    }
    if (options.take) {
      results = results.slice(0, options.take);
    }

    return results;
  }

  /**
   * Find Unique - 단일 레코드 조회
   */
  findUnique(table, options) {
    if (!this.data[table]) {
      throw new Error(`Table ${table} does not exist`);
    }

    return this.data[table].find(record => {
      return Object.keys(options.where).every(key => {
        return record[key] === options.where[key];
      });
    });
  }

  /**
   * Update - 레코드 업데이트
   */
  update(table, options) {
    if (!this.data[table]) {
      throw new Error(`Table ${table} does not exist`);
    }

    const index = this.data[table].findIndex(record => {
      return Object.keys(options.where).every(key => {
        return record[key] === options.where[key];
      });
    });

    if (index === -1) {
      throw new Error('Record not found');
    }

    this.data[table][index] = {
      ...this.data[table][index],
      ...options.data,
      updatedAt: new Date().toISOString()
    };

    return this.data[table][index];
  }

  /**
   * Delete - 레코드 삭제
   */
  delete(table, options) {
    if (!this.data[table]) {
      throw new Error(`Table ${table} does not exist`);
    }

    const index = this.data[table].findIndex(record => {
      return Object.keys(options.where).every(key => {
        return record[key] === options.where[key];
      });
    });

    if (index === -1) {
      throw new Error('Record not found');
    }

    const deleted = this.data[table][index];
    this.data[table].splice(index, 1);
    return deleted;
  }

  /**
   * Count - 레코드 개수 카운트
   */
  count(table, options = {}) {
    const results = this.findMany(table, options);
    return results.length;
  }

  /**
   * 트랜잭션 (간단한 구현)
   */
  async $transaction(operations) {
    try {
      const results = [];
      for (const operation of operations) {
        results.push(await operation);
      }
      return results;
    } catch (error) {
      // 롤백은 메모리 DB라 생략
      throw error;
    }
  }

  /**
   * 연결 확인
   */
  async $connect() {
    console.log('✅ In-Memory Database connected');
    return Promise.resolve();
  }

  /**
   * 연결 해제
   */
  async $disconnect() {
    console.log('Database disconnected');
    return Promise.resolve();
  }
}

// 싱글톤 인스턴스
const db = new InMemoryDB();

// Prisma Client와 유사한 인터페이스
const prisma = {
  companyInfo: {
    create: (options) => db.create('companyInfo', options.data),
    findMany: (options) => db.findMany('companyInfo', options),
    findUnique: (options) => db.findUnique('companyInfo', options),
    update: (options) => db.update('companyInfo', options),
    delete: (options) => db.delete('companyInfo', options),
    count: (options) => db.count('companyInfo', options)
  },
  bankAccount: {
    create: (options) => db.create('bankAccounts', options.data),
    findMany: (options) => db.findMany('bankAccounts', options),
    findUnique: (options) => db.findUnique('bankAccounts', options),
    update: (options) => db.update('bankAccounts', options),
    delete: (options) => db.delete('bankAccounts', options)
  },
  client: {
    create: (options) => db.create('clients', options.data),
    findMany: (options) => db.findMany('clients', options),
    findUnique: (options) => db.findUnique('clients', options),
    update: (options) => db.update('clients', options),
    delete: (options) => db.delete('clients', options),
    count: (options) => db.count('clients', options)
  },
  adAccount: {
    create: (options) => db.create('adAccounts', options.data),
    findMany: (options) => db.findMany('adAccounts', options),
    findUnique: (options) => db.findUnique('adAccounts', options),
    update: (options) => db.update('adAccounts', options),
    delete: (options) => db.delete('adAccounts', options)
  },
  store: {
    create: (options) => db.create('stores', options.data),
    findMany: (options) => db.findMany('stores', options),
    findUnique: (options) => db.findUnique('stores', options),
    update: (options) => db.update('stores', options),
    delete: (options) => db.delete('stores', options)
  },
  productCategory: {
    create: (options) => db.create('productCategories', options.data),
    findMany: (options) => db.findMany('productCategories', options),
    findUnique: (options) => db.findUnique('productCategories', options),
    update: (options) => db.update('productCategories', options),
    delete: (options) => db.delete('productCategories', options)
  },
  clientProductPrice: {
    create: (options) => db.create('clientProductPrices', options.data),
    findMany: (options) => db.findMany('clientProductPrices', options),
    findUnique: (options) => db.findUnique('clientProductPrices', options),
    update: (options) => db.update('clientProductPrices', options),
    delete: (options) => db.delete('clientProductPrices', options)
  },
  quote: {
    create: (options) => db.create('quotes', options.data),
    findMany: (options) => db.findMany('quotes', options),
    findUnique: (options) => db.findUnique('quotes', options),
    update: (options) => db.update('quotes', options),
    delete: (options) => db.delete('quotes', options)
  },
  quoteItem: {
    create: (options) => db.create('quoteItems', options.data),
    findMany: (options) => db.findMany('quoteItems', options),
    delete: (options) => db.delete('quoteItems', options)
  },
  order: {
    create: (options) => db.create('orders', options.data),
    findMany: (options) => db.findMany('orders', options),
    findUnique: (options) => db.findUnique('orders', options),
    update: (options) => db.update('orders', options),
    delete: (options) => db.delete('orders', options)
  },
  orderItem: {
    create: (options) => db.create('orderItems', options.data),
    findMany: (options) => db.findMany('orderItems', options),
    delete: (options) => db.delete('orderItems', options)
  },
  contract: {
    create: (options) => db.create('contracts', options.data),
    findMany: (options) => db.findMany('contracts', options),
    findUnique: (options) => db.findUnique('contracts', options),
    update: (options) => db.update('contracts', options),
    delete: (options) => db.delete('contracts', options)
  },
  invoice: {
    create: (options) => db.create('invoices', options.data),
    findMany: (options) => db.findMany('invoices', options),
    findUnique: (options) => db.findUnique('invoices', options),
    update: (options) => db.update('invoices', options),
    delete: (options) => db.delete('invoices', options)
  },
  payment: {
    create: (options) => db.create('payments', options.data),
    findMany: (options) => db.findMany('payments', options),
    findUnique: (options) => db.findUnique('payments', options),
    update: (options) => db.update('payments', options),
    delete: (options) => db.delete('payments', options)
  },
  report: {
    create: (options) => db.create('reports', options.data),
    findMany: (options) => db.findMany('reports', options),
    findUnique: (options) => db.findUnique('reports', options),
    update: (options) => db.update('reports', options),
    delete: (options) => db.delete('reports', options)
  },
  sequenceCounter: {
    create: (options) => db.create('sequenceCounters', options.data),
    findUnique: (options) => db.findUnique('sequenceCounters', options),
    update: (options) => db.update('sequenceCounters', options)
  },
  auditLog: {
    create: (options) => db.create('auditLogs', options.data),
    findMany: (options) => db.findMany('auditLogs', options)
  },
  notification: {
    create: (options) => db.create('notifications', options.data),
    findMany: (options) => db.findMany('notifications', options),
    findUnique: (options) => db.findUnique('notifications', options),
    update: (options) => db.update('notifications', options),
    delete: (options) => db.delete('notifications', options),
    count: (options) => db.count('notifications', options)
  },
  $transaction: (operations) => db.$transaction(operations),
  $connect: () => db.$connect(),
  $disconnect: () => db.$disconnect()
};

module.exports = prisma;
