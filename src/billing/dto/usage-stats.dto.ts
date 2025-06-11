export class UsageStatsDto {
  planType: string;
  subscriptionStatus: string;
  currentPeriodEnd: Date;
  usage: {
    channels: {
      current: number;
      limit: number;
      isUnlimited: boolean;
    };
    aiAgents: {
      current: number;
      limit: number;
      isUnlimited: boolean;
    };
    monthlyAttendances: {
      current: number;
      limit: number;
      isUnlimited: boolean;
    };
  };
  daysUntilReset: number;
} 