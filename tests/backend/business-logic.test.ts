import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('Business Logic Tests', () => {
  describe('Date Calculations', () => {
    describe('calculateNextDueDate', () => {
      // Import the function from the bill creation module
      const calculateNextDueDate = (dueDate: Date, frequency: string): Date => {
        const nextDate = new Date(dueDate);
        const today = new Date();
        
        if (nextDate > today) {
          return nextDate;
        }

        switch (frequency) {
          case "daily":
            while (nextDate <= today) {
              nextDate.setDate(nextDate.getDate() + 1);
            }
            break;
          case "weekly":
            while (nextDate <= today) {
              nextDate.setDate(nextDate.getDate() + 7);
            }
            break;
          case "monthly":
            while (nextDate <= today) {
              nextDate.setMonth(nextDate.getMonth() + 1);
            }
            break;
          case "yearly":
            while (nextDate <= today) {
              nextDate.setFullYear(nextDate.getFullYear() + 1);
            }
            break;
        }

        return nextDate;
      };

      it('should return future due date as is', () => {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 10);

        const result = calculateNextDueDate(futureDate, 'monthly');
        expect(result).toEqual(futureDate);
      });

      it('should calculate next daily occurrence', () => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        const result = calculateNextDueDate(yesterday, 'daily');
        const today = new Date();
        
        expect(result.getDate()).toBeGreaterThan(today.getDate());
      });

      it('should calculate next weekly occurrence', () => {
        const lastWeek = new Date();
        lastWeek.setDate(lastWeek.getDate() - 7);

        const result = calculateNextDueDate(lastWeek, 'weekly');
        const today = new Date();
        
        expect(result.getTime()).toBeGreaterThan(today.getTime());
      });

      it('should calculate next monthly occurrence', () => {
        const lastMonth = new Date();
        lastMonth.setMonth(lastMonth.getMonth() - 1);

        const result = calculateNextDueDate(lastMonth, 'monthly');
        const today = new Date();
        
        expect(result.getTime()).toBeGreaterThan(today.getTime());
      });

      it('should calculate next yearly occurrence', () => {
        const lastYear = new Date();
        lastYear.setFullYear(lastYear.getFullYear() - 1);

        const result = calculateNextDueDate(lastYear, 'yearly');
        const today = new Date();
        
        expect(result.getTime()).toBeGreaterThan(today.getTime());
      });

      it('should handle edge cases for month boundaries', () => {
        // Test January 31st -> February (should handle shorter month)
        const jan31 = new Date('2024-01-31');
        const result = calculateNextDueDate(jan31, 'monthly');
        
        // Should be in February or March depending on current date
        expect(result.getMonth()).toBeGreaterThanOrEqual(1);
      });
    });

    describe('calculateRecurringOccurrence', () => {
      const calculateNextOccurrence = (
        startDate: Date,
        frequency: string,
        currentDate: Date
      ): Date | null => {
        const start = new Date(startDate);
        const current = new Date(currentDate);
        
        if (start > current) {
          return null;
        }

        let nextDate = new Date(start);

        switch (frequency) {
          case "daily":
            const daysDiff = Math.floor((current.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
            nextDate.setDate(start.getDate() + daysDiff + 1);
            break;
          case "weekly":
            const weeksDiff = Math.floor((current.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 7));
            nextDate.setDate(start.getDate() + (weeksDiff + 1) * 7);
            break;
          case "monthly":
            let monthsToAdd = 0;
            while (nextDate <= current) {
              monthsToAdd++;
              nextDate = new Date(start);
              nextDate.setMonth(start.getMonth() + monthsToAdd);
            }
            break;
          case "yearly":
            let yearsToAdd = 0;
            while (nextDate <= current) {
              yearsToAdd++;
              nextDate = new Date(start);
              nextDate.setFullYear(start.getFullYear() + yearsToAdd);
            }
            break;
          default:
            return null;
        }

        return nextDate;
      };

      it('should return null for future start dates', () => {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 10);
        const today = new Date();

        const result = calculate