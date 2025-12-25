/**
 * Category Mapper
 * Maps Naver Place category names to category codes and hierarchy paths
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class CategoryMapper {
  constructor() {
    this.categories = [];
    this.categoryMap = new Map();
    this.loadCategories();
  }

  /**
   * Load category data from JSON file
   */
  loadCategories() {
    const categoryPath = path.join(__dirname, '../../data/categories.json');

    if (!fs.existsSync(categoryPath)) {
      console.warn('[CategoryMapper] Category data file not found:', categoryPath);
      return;
    }

    const data = JSON.parse(fs.readFileSync(categoryPath, 'utf-8'));
    this.categories = data.categories || [];

    // Create map for fast lookup
    this.categories.forEach(cat => {
      this.categoryMap.set(cat.name.toLowerCase(), cat);
      this.categoryMap.set(cat.id, cat);
    });

    console.log(`[CategoryMapper] Loaded ${this.categories.length} categories`);
  }

  /**
   * Find category by name
   * @param {string} name - Category name
   * @returns {Object|null} Category object with id, name, and path
   */
  findByName(name) {
    if (!name) return null;

    // Try exact match first
    const normalized = name.toLowerCase().trim();
    let category = this.categoryMap.get(normalized);

    if (category) {
      return category;
    }

    // Try partial match
    for (const cat of this.categories) {
      if (cat.name.toLowerCase().includes(normalized) ||
          normalized.includes(cat.name.toLowerCase())) {
        return cat;
      }
    }

    return null;
  }

  /**
   * Find category by ID
   * @param {string} id - Category ID
   * @returns {Object|null} Category object
   */
  findById(id) {
    return this.categoryMap.get(id) || null;
  }

  /**
   * Get all matching categories for multiple names
   * @param {string|string[]} names - Category name(s), can be comma-separated string or array
   * @returns {Array} Array of category objects
   */
  findMultiple(names) {
    if (!names) return [];

    const nameArray = Array.isArray(names)
      ? names
      : names.split(',').map(n => n.trim());

    const results = [];
    const seen = new Set();

    for (const name of nameArray) {
      const category = this.findByName(name);
      if (category && !seen.has(category.id)) {
        results.push(category);
        seen.add(category.id);
      }
    }

    return results;
  }

  /**
   * Extract category codes from categories
   * @param {Array} categories - Array of category objects
   * @returns {Array} Array of category IDs
   */
  extractCodes(categories) {
    return categories.map(cat => cat.id);
  }

  /**
   * Extract hierarchy path from categories
   * @param {Array} categories - Array of category objects
   * @returns {string} Combined hierarchy path
   */
  extractHierarchy(categories) {
    if (!categories || categories.length === 0) return '';

    // Use the most specific (longest) path
    const paths = categories.map(cat => cat.path).filter(p => p);
    if (paths.length === 0) return '';

    return paths.reduce((longest, current) =>
      current.length > longest.length ? current : longest
    );
  }

  /**
   * Determine category type (TYPE_A or TYPE_B)
   * TYPE_A: 서비스업 (Services)
   * TYPE_B: 음식점 (Restaurants)
   * @param {string} hierarchy - Category hierarchy path
   * @returns {string} 'TYPE_A' or 'TYPE_B'
   */
  getCategoryType(hierarchy) {
    if (!hierarchy) return 'TYPE_A';

    const restaurantKeywords = ['음식점', '카페', '디저트', '베이커리', '주점'];

    for (const keyword of restaurantKeywords) {
      if (hierarchy.includes(keyword)) {
        return 'TYPE_B';
      }
    }

    return 'TYPE_A';
  }

  /**
   * Process category data for a place
   * @param {string} categoryString - Category string from Naver Place (comma-separated)
   * @returns {Object} Processed category data
   */
  process(categoryString) {
    const categories = this.findMultiple(categoryString);

    return {
      original: categoryString,
      matched: categories,
      codes: this.extractCodes(categories),
      hierarchy: this.extractHierarchy(categories),
      type: this.getCategoryType(this.extractHierarchy(categories)),
      matchCount: categories.length
    };
  }

  /**
   * Search categories by keyword
   * @param {string} keyword - Search keyword
   * @param {number} limit - Maximum results to return
   * @returns {Array} Array of matching categories
   */
  search(keyword, limit = 20) {
    if (!keyword) return [];

    const normalized = keyword.toLowerCase();
    const results = [];

    for (const cat of this.categories) {
      if (cat.name.toLowerCase().includes(normalized) ||
          cat.path.toLowerCase().includes(normalized)) {
        results.push(cat);
        if (results.length >= limit) break;
      }
    }

    return results;
  }

  /**
   * Get category statistics
   * @returns {Object} Statistics about loaded categories
   */
  getStats() {
    const typeA = this.categories.filter(cat =>
      this.getCategoryType(cat.path) === 'TYPE_A'
    ).length;

    const typeB = this.categories.filter(cat =>
      this.getCategoryType(cat.path) === 'TYPE_B'
    ).length;

    return {
      total: this.categories.length,
      typeA,
      typeB
    };
  }
}

// Singleton instance
let instance = null;

export function getCategoryMapper() {
  if (!instance) {
    instance = new CategoryMapper();
  }
  return instance;
}
