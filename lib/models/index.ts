// Core data models for the Cockpit system
export * from './user';
export * from './insights';
export * from './common';
export * from './chat';
// Export specific items from lifeData to avoid conflicts
export type { 
  LifeData, 
  DomainSpecificData, 
  FinancialData, 
  EmotionalData, 
  CareerData, 
  HealthData 
} from './lifeData';