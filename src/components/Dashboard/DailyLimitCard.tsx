import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { getTotalDailyCapacity, getDailyLimitStatus, DailyLimitStatus } from '@/utils/dailyLimitUtils';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Send, 
  Clock, 
  AlertTriangle, 
  CheckCircle,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const DailyLimitCard = () => {
  const { user } = useAuth();
  const [capacity, setCapacity] = useState<{
    totalLimit: number;
    totalSent: number;
    totalRemaining: number;
    senderCount: number;
  } | null>(null);
  const [senderStatuses, setSenderStatuses] = useState<DailyLimitStatus[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const [capacityData, statuses] = await Promise.all([
        getTotalDailyCapacity(user.id),
        getDailyLimitStatus(user.id)
      ]);

      setCapacity(capacityData);
      setSenderStatuses(statuses);
    } catch (error) {
      console.error('Error loading daily limit data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  if (loading || !capacity) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Daily Sending Limits
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-2 bg-muted rounded"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const usagePercentage = capacity.totalLimit > 0 
    ? (capacity.totalSent / capacity.totalLimit) * 100 
    : 0;

  const getStatusColor = (percentage: number) => {
    if (percentage >= 90) return 'text-destructive';
    if (percentage >= 70) return 'text-warning';
    return 'text-success';
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-destructive';
    if (percentage >= 70) return 'bg-warning';
    return 'bg-success';
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Daily Sending Limits
            </CardTitle>
            <CardDescription>
              Track your email sending capacity across all accounts
            </CardDescription>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={loadData}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Progress */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Today's Usage</span>
            <span className={`text-sm font-medium ${getStatusColor(usagePercentage)}`}>
              {capacity.totalSent} / {capacity.totalLimit} emails
            </span>
          </div>
          <Progress 
            value={usagePercentage} 
            className="h-2"
          />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{Math.round(usagePercentage)}% used</span>
            <span>{capacity.totalRemaining} remaining</span>
          </div>
        </div>

        {/* Sender Account Breakdown */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Sender Accounts ({capacity.senderCount})</h4>
          <div className="space-y-2">
            {senderStatuses.map((status) => {
              const senderPercentage = status.dailyLimit > 0 
                ? (status.sentToday / status.dailyLimit) * 100 
                : 0;

              return (
                <div key={status.senderAccountId} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium truncate max-w-32">
                        {status.email}
                      </span>
                      {status.canSend ? (
                        <Badge variant="secondary" className="h-5">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Available
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="h-5">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Limit Reached
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {status.sentToday}/{status.dailyLimit}
                    </span>
                  </div>
                  <Progress 
                    value={senderPercentage} 
                    className="h-1"
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 pt-4 border-t">
          <div className="text-center">
            <div className="text-2xl font-bold text-success">
              {senderStatuses.filter(s => s.canSend).length}
            </div>
            <div className="text-xs text-muted-foreground">Available</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-warning">
              {senderStatuses.filter(s => s.sentToday > 0 && s.canSend).length}
            </div>
            <div className="text-xs text-muted-foreground">In Use</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-destructive">
              {senderStatuses.filter(s => !s.canSend).length}
            </div>
            <div className="text-xs text-muted-foreground">At Limit</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DailyLimitCard;