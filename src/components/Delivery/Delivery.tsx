import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Truck, Clock, CheckCircle, AlertCircle, RefreshCw } from "lucide-react";

const Delivery = () => {
  // Reset deliverability statistics
  const deliveryStats = {
    total: 0,
    delivered: 0,
    pending: 0,
    failed: 0,
    deliveryRate: 0
  };

  const recentDeliveries: any[] = [];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      delivered: "bg-green-100 text-green-800 hover:bg-green-100",
      pending: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
      failed: "bg-red-100 text-red-800 hover:bg-red-100"
    };

    return (
      <Badge variant="secondary" className={variants[status as keyof typeof variants]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Deliverability</h1>
          <p className="text-muted-foreground mt-1">
            Monitor email deliverability status and performance
          </p>
        </div>
        <Button>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Deliverability Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Emails</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{deliveryStats.total.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              All-time deliveries
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Delivered</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {deliveryStats.delivered.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Successfully delivered
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {deliveryStats.pending.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Awaiting delivery
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {deliveryStats.failed.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Delivery failed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Deliverability Rate */}
      <Card>
        <CardHeader>
          <CardTitle>Deliverability Rate</CardTitle>
          <CardDescription>
            Overall email deliverability success rate
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold">{deliveryStats.deliveryRate}%</span>
            <span className="text-sm text-muted-foreground">
              {deliveryStats.delivered.toLocaleString()} of {deliveryStats.total.toLocaleString()} emails
            </span>
          </div>
          <Progress value={deliveryStats.deliveryRate} className="w-full" />
        </CardContent>
      </Card>

      {/* Recent Deliveries */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Deliveries</CardTitle>
          <CardDescription>
            Latest email delivery attempts and their status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentDeliveries.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No recent deliveries to display</p>
              </div>
            ) : (
              recentDeliveries.map((delivery) => (
                <div 
                  key={delivery.id}
                  className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    {getStatusIcon(delivery.status)}
                    <div>
                      <h4 className="font-medium">{delivery.campaign}</h4>
                      <p className="text-sm text-muted-foreground">{delivery.recipient}</p>
                      {delivery.error && (
                        <p className="text-xs text-red-500 mt-1">{delivery.error}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-4 text-right">
                    <div>
                      <p className="text-sm">{delivery.timestamp}</p>
                      {delivery.deliveryTime !== "-" && (
                        <p className="text-xs text-muted-foreground">
                          Delivered in {delivery.deliveryTime}
                        </p>
                      )}
                    </div>
                    {getStatusBadge(delivery.status)}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Delivery;