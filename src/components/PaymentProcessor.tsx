import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  CreditCard, 
  Smartphone, 
  CheckCircle, 
  XCircle, 
  Clock,
  RefreshCw,
  AlertCircle,
  ArrowRight
} from "lucide-react";
import { paymentService, PaymentRequest, PaymentResponse, PaymentStatus } from "@/services/paymentService";
import { toast } from "@/hooks/use-toast";

interface PaymentProcessorProps {
  orderId: string;
  amount: number;
  paymentMethod: 'orange_money' | 'afrimoney' | 'stripe';
  customerInfo: {
    name: string;
    email: string;
    phone: string;
  };
  onSuccess: (paymentId: string) => void;
  onError: (error: string) => void;
}

export const PaymentProcessor = ({
  orderId,
  amount,
  paymentMethod,
  customerInfo,
  onSuccess,
  onError,
}: PaymentProcessorProps) => {
  const navigate = useNavigate();
  const [processing, setProcessing] = useState(false);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | null>(null);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (paymentId) {
      const interval = setInterval(checkPaymentStatus, 3000); // Check every 3 seconds
      return () => clearInterval(interval);
    }
  }, [paymentId]);

  const initiatePayment = async () => {
    setProcessing(true);
    setProgress(10);
    setMessage("Initiating payment...");

    try {
      const request: PaymentRequest = {
        orderId,
        amount,
        currency: 'SLL',
        paymentMethod,
        customerInfo,
        metadata: {
          source: 'web_checkout',
          timestamp: new Date().toISOString(),
        },
      };

      setProgress(30);
      setMessage("Connecting to payment gateway...");

      const response: PaymentResponse = await paymentService.processPayment(request);

      if (response.success) {
        setPaymentId(response.paymentId!);
        setProgress(60);
        setMessage(response.message);

        if (response.redirectUrl) {
          // For Stripe, redirect to payment page
          window.location.href = response.redirectUrl;
        } else {
          // For mobile money, start status checking
          setMessage("Payment initiated. Please complete on your mobile device.");
          setProgress(80);
        }
      } else {
        throw new Error(response.error || response.message);
      }

    } catch (error: any) {
      console.error('Payment initiation error:', error);
      setMessage("Payment failed to initiate");
      setProgress(0);
      onError(error.message);
      toast({
        title: "Payment Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const checkPaymentStatus = async () => {
    if (!paymentId) return;

    try {
      const status = await paymentService.checkPaymentStatus(paymentId);
      setPaymentStatus(status);

      if (status.status === 'completed') {
        setProgress(100);
        setMessage("Payment completed successfully!");
        toast({
          title: "Payment Successful",
          description: "Your payment has been processed successfully.",
        });
        setTimeout(() => onSuccess(paymentId), 1500);
      } else if (status.status === 'failed' || status.status === 'cancelled') {
        setProgress(0);
        setMessage(status.message);
        onError(status.message);
        toast({
          title: "Payment Failed",
          description: status.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error checking payment status:', error);
    }
  };

  const retryPayment = () => {
    setPaymentId(null);
    setPaymentStatus(null);
    setProgress(0);
    setMessage("");
    initiatePayment();
  };

  const simulateSuccess = async () => {
    if (paymentId) {
      await paymentService.simulatePaymentCompletion(paymentId, true);
      await checkPaymentStatus();
    }
  };

  const simulateFailure = async () => {
    if (paymentId) {
      await paymentService.simulatePaymentCompletion(paymentId, false);
      await checkPaymentStatus();
    }
  };

  const getPaymentMethodInfo = () => {
    const methods = {
      orange_money: {
        name: 'Orange Money',
        icon: Smartphone,
        color: 'bg-orange-100 text-orange-800',
        description: 'Mobile money payment via Orange Money',
      },
      afrimoney: {
        name: 'AfriMoney',
        icon: Smartphone,
        color: 'bg-blue-100 text-blue-800',
        description: 'Mobile money payment via AfriMoney',
      },
      stripe: {
        name: 'Credit/Debit Card',
        icon: CreditCard,
        color: 'bg-purple-100 text-purple-800',
        description: 'Secure card payment via Stripe',
      },
    };
    return methods[paymentMethod];
  };

  const getStatusIcon = () => {
    if (!paymentStatus) return Clock;
    
    switch (paymentStatus.status) {
      case 'completed':
        return CheckCircle;
      case 'failed':
      case 'cancelled':
        return XCircle;
      default:
        return Clock;
    }
  };

  const getStatusColor = () => {
    if (!paymentStatus) return 'text-yellow-600';
    
    switch (paymentStatus.status) {
      case 'completed':
        return 'text-green-600';
      case 'failed':
      case 'cancelled':
        return 'text-red-600';
      default:
        return 'text-yellow-600';
    }
  };

  const methodInfo = getPaymentMethodInfo();
  const StatusIcon = getStatusIcon();

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2">
          <methodInfo.icon className="h-6 w-6" />
          Payment Processing
        </CardTitle>
        <CardDescription>
          Processing payment via {methodInfo.name}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Payment Method */}
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex items-center gap-3">
            <methodInfo.icon className="h-5 w-5" />
            <div>
              <p className="font-medium">{methodInfo.name}</p>
              <p className="text-sm text-muted-foreground">{methodInfo.description}</p>
            </div>
          </div>
          <Badge className={methodInfo.color}>
            Le {amount.toLocaleString()}
          </Badge>
        </div>

        {/* Progress */}
        {(processing || paymentId) && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Progress</span>
              <span className="text-sm text-muted-foreground">{progress}%</span>
            </div>
            <Progress value={progress} className="w-full" />
          </div>
        )}

        {/* Status */}
        {message && (
          <Alert>
            <StatusIcon className={`h-4 w-4 ${getStatusColor()}`} />
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        )}

        {/* Payment Status Details */}
        {paymentStatus && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Status:</span>
              <Badge className={
                paymentStatus.status === 'completed' ? 'bg-green-100 text-green-800' :
                paymentStatus.status === 'failed' || paymentStatus.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                'bg-yellow-100 text-yellow-800'
              }>
                {paymentStatus.status.charAt(0).toUpperCase() + paymentStatus.status.slice(1)}
              </Badge>
            </div>
            
            {paymentStatus.transactionId && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Transaction ID:</span>
                <span className="text-sm font-mono">{paymentStatus.transactionId}</span>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3">
          {!paymentId && !processing && (
            <Button onClick={initiatePayment} className="w-full" size="lg">
              <ArrowRight className="h-4 w-4 mr-2" />
              Start Payment
            </Button>
          )}

          {paymentId && paymentStatus?.status === 'pending' && (
            <div className="space-y-2">
              <Button 
                onClick={checkPaymentStatus} 
                variant="outline" 
                className="w-full"
                disabled={processing}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${processing ? 'animate-spin' : ''}`} />
                Check Status
              </Button>
              
              {/* Demo buttons for testing */}
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  onClick={simulateSuccess} 
                  variant="outline" 
                  size="sm"
                  className="text-green-600 border-green-200 hover:bg-green-50"
                >
                  Simulate Success
                </Button>
                <Button 
                  onClick={simulateFailure} 
                  variant="outline" 
                  size="sm"
                  className="text-red-600 border-red-200 hover:bg-red-50"
                >
                  Simulate Failure
                </Button>
              </div>
            </div>
          )}

          {paymentStatus?.status === 'failed' || paymentStatus?.status === 'cancelled' ? (
            <Button onClick={retryPayment} variant="outline" className="w-full">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry Payment
            </Button>
          ) : null}

          <Button 
            onClick={() => navigate(`/order-confirmation/${orderId}`)} 
            variant="ghost" 
            className="w-full"
          >
            Back to Order
          </Button>
        </div>

        {/* Instructions */}
        {paymentMethod !== 'stripe' && paymentId && paymentStatus?.status === 'pending' && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {paymentMethod === 'orange_money' 
                ? `Please dial *144*${customerInfo.phone}# on your Orange Money registered phone to complete the payment.`
                : `Please check your phone for payment instructions from AfriMoney.`
              }
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};
