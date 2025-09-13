// Notification service interface

export interface NotificationPayload {
  userId: string;
  type: 'insight' | 'alert' | 'recommendation' | 'reminder';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  data?: any;
  expiresAt?: Date;
}

export interface NotificationDelivery {
  id: string;
  payload: NotificationPayload;
  channels: ('push' | 'email' | 'sms' | 'in-app')[];
  status: 'pending' | 'sent' | 'delivered' | 'failed';
  sentAt?: Date;
  deliveredAt?: Date;
  error?: string;
}

export interface NotificationEngine {
  sendNotification(payload: NotificationPayload): Promise<string>;
  scheduleNotification(payload: NotificationPayload, sendAt: Date): Promise<string>;
  cancelNotification(notificationId: string): Promise<boolean>;
  getNotificationStatus(notificationId: string): Promise<NotificationDelivery | null>;
  markAsRead(notificationId: string, userId: string): Promise<boolean>;
}

// Placeholder implementation - will be implemented in later tasks
export class NotificationEngineImpl implements NotificationEngine {
  async sendNotification(payload: NotificationPayload): Promise<string> {
    // TODO: Implement in task 7.1
    throw new Error('Not implemented yet');
  }

  async scheduleNotification(payload: NotificationPayload, sendAt: Date): Promise<string> {
    // TODO: Implement in task 7.1
    throw new Error('Not implemented yet');
  }

  async cancelNotification(notificationId: string): Promise<boolean> {
    // TODO: Implement in task 7.1
    throw new Error('Not implemented yet');
  }

  async getNotificationStatus(notificationId: string): Promise<NotificationDelivery | null> {
    // TODO: Implement in task 7.1
    throw new Error('Not implemented yet');
  }

  async markAsRead(notificationId: string, userId: string): Promise<boolean> {
    // TODO: Implement in task 7.1
    throw new Error('Not implemented yet');
  }
}