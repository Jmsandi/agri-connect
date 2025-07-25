import { supabase } from "@/integrations/supabase/client";

export interface PaymentRequest {
  orderId: string;
  amount: number;
  currency: string;
  paymentMethod: 'orange_money' | 'afrimoney' | 'stripe';
  customerInfo: {
    name: string;
    email: string;
    phone: string;
  };
  metadata?: Record<string, any>;
}

export interface PaymentResponse {
  success: boolean;
  paymentId?: string;
  redirectUrl?: string;
  message: string;
  error?: string;
}

export interface PaymentStatus {
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  transactionId?: string;
  message: string;
  updatedAt: string;
}

class PaymentService {
  // Orange Money Payment Integration
  async processOrangeMoneyPayment(request: PaymentRequest): Promise<PaymentResponse> {
    try {
      // In a real implementation, you would integrate with Orange Money API
      // For now, we'll simulate the process
      
      console.log('Processing Orange Money payment:', request);

      // Create payment record
      const { data: payment, error } = await supabase
        .from('payments')
        .insert([{
          order_id: request.orderId,
          payment_method: 'orange_money',
          amount: request.amount,
          currency: request.currency,
          status: 'pending',
          customer_name: request.customerInfo.name,
          customer_email: request.customerInfo.email,
          customer_phone: request.customerInfo.phone,
          metadata: request.metadata,
        }])
        .select()
        .single();

      if (error) throw error;

      // Simulate Orange Money API call
      // In reality, you would:
      // 1. Call Orange Money API to initiate payment
      // 2. Get payment URL or USSD code
      // 3. Return appropriate response

      // For demo purposes, we'll simulate a successful initiation
      await this.updateOrderPaymentStatus(request.orderId, 'pending');

      return {
        success: true,
        paymentId: payment.id,
        message: `Orange Money payment initiated. Please dial *144*${request.customerInfo.phone}# to complete payment of Le ${request.amount.toLocaleString()}`,
      };

    } catch (error: any) {
      console.error('Orange Money payment error:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to initiate Orange Money payment',
      };
    }
  }

  // AfriMoney Payment Integration
  async processAfriMoneyPayment(request: PaymentRequest): Promise<PaymentResponse> {
    try {
      console.log('Processing AfriMoney payment:', request);

      // Create payment record
      const { data: payment, error } = await supabase
        .from('payments')
        .insert([{
          order_id: request.orderId,
          payment_method: 'afrimoney',
          amount: request.amount,
          currency: request.currency,
          status: 'pending',
          customer_name: request.customerInfo.name,
          customer_email: request.customerInfo.email,
          customer_phone: request.customerInfo.phone,
          metadata: request.metadata,
        }])
        .select()
        .single();

      if (error) throw error;

      // Simulate AfriMoney API call
      await this.updateOrderPaymentStatus(request.orderId, 'pending');

      return {
        success: true,
        paymentId: payment.id,
        message: `AfriMoney payment initiated. Please check your phone for payment instructions.`,
      };

    } catch (error: any) {
      console.error('AfriMoney payment error:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to initiate AfriMoney payment',
      };
    }
  }

  // Stripe Payment Integration
  async processStripePayment(request: PaymentRequest): Promise<PaymentResponse> {
    try {
      console.log('Processing Stripe payment:', request);

      // Create payment record
      const { data: payment, error } = await supabase
        .from('payments')
        .insert([{
          order_id: request.orderId,
          payment_method: 'stripe',
          amount: request.amount,
          currency: request.currency,
          status: 'pending',
          customer_name: request.customerInfo.name,
          customer_email: request.customerInfo.email,
          customer_phone: request.customerInfo.phone,
          metadata: request.metadata,
        }])
        .select()
        .single();

      if (error) throw error;

      // In a real implementation, you would:
      // 1. Create Stripe Payment Intent
      // 2. Return client secret for frontend processing
      // 3. Handle webhooks for payment confirmation

      // For demo purposes, we'll simulate Stripe checkout
      await this.updateOrderPaymentStatus(request.orderId, 'pending');

      return {
        success: true,
        paymentId: payment.id,
        redirectUrl: `/payment/stripe/${payment.id}`,
        message: 'Redirecting to Stripe checkout...',
      };

    } catch (error: any) {
      console.error('Stripe payment error:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to initiate Stripe payment',
      };
    }
  }

  // Main payment processing method
  async processPayment(request: PaymentRequest): Promise<PaymentResponse> {
    switch (request.paymentMethod) {
      case 'orange_money':
        return this.processOrangeMoneyPayment(request);
      case 'afrimoney':
        return this.processAfriMoneyPayment(request);
      case 'stripe':
        return this.processStripePayment(request);
      default:
        return {
          success: false,
          error: 'Invalid payment method',
          message: 'The selected payment method is not supported',
        };
    }
  }

  // Check payment status
  async checkPaymentStatus(paymentId: string): Promise<PaymentStatus> {
    try {
      const { data: payment, error } = await supabase
        .from('payments')
        .select('*')
        .eq('id', paymentId)
        .single();

      if (error) throw error;

      return {
        status: payment.status,
        transactionId: payment.transaction_id,
        message: this.getStatusMessage(payment.status),
        updatedAt: payment.updated_at,
      };

    } catch (error: any) {
      console.error('Error checking payment status:', error);
      return {
        status: 'failed',
        message: 'Failed to check payment status',
        updatedAt: new Date().toISOString(),
      };
    }
  }

  // Update payment status
  async updatePaymentStatus(
    paymentId: string, 
    status: 'pending' | 'completed' | 'failed' | 'cancelled',
    transactionId?: string
  ): Promise<boolean> {
    try {
      const updateData: any = {
        status,
        updated_at: new Date().toISOString(),
      };

      if (transactionId) {
        updateData.transaction_id = transactionId;
      }

      const { error } = await supabase
        .from('payments')
        .update(updateData)
        .eq('id', paymentId);

      if (error) throw error;

      // Also update the order payment status
      const { data: payment } = await supabase
        .from('payments')
        .select('order_id')
        .eq('id', paymentId)
        .single();

      if (payment) {
        await this.updateOrderPaymentStatus(payment.order_id, status);
      }

      return true;
    } catch (error) {
      console.error('Error updating payment status:', error);
      return false;
    }
  }

  // Update order payment status
  private async updateOrderPaymentStatus(
    orderId: string, 
    paymentStatus: 'pending' | 'completed' | 'failed' | 'cancelled'
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ 
          payment_status: paymentStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating order payment status:', error);
    }
  }

  // Get status message
  private getStatusMessage(status: string): string {
    const messages = {
      pending: 'Payment is being processed',
      completed: 'Payment completed successfully',
      failed: 'Payment failed',
      cancelled: 'Payment was cancelled',
    };
    return messages[status as keyof typeof messages] || 'Unknown status';
  }

  // Simulate payment completion (for demo purposes)
  async simulatePaymentCompletion(paymentId: string, success: boolean = true): Promise<boolean> {
    const status = success ? 'completed' : 'failed';
    const transactionId = success ? `txn_${Date.now()}` : undefined;
    
    return this.updatePaymentStatus(paymentId, status, transactionId);
  }

  // Get payment methods configuration
  getPaymentMethods() {
    return [
      {
        id: 'orange_money',
        name: 'Orange Money',
        description: 'Pay with your Orange Money account',
        type: 'mobile_money',
        enabled: true,
        countries: ['CI', 'SN', 'ML', 'BF'], // Côte d'Ivoire, Senegal, Mali, Burkina Faso
      },
      {
        id: 'afrimoney',
        name: 'AfriMoney',
        description: 'Pay with your AfriMoney account',
        type: 'mobile_money',
        enabled: true,
        countries: ['CI', 'GH', 'TG'], // Côte d'Ivoire, Ghana, Togo
      },
      {
        id: 'stripe',
        name: 'Credit/Debit Card',
        description: 'Pay with Visa, Mastercard, or other cards',
        type: 'card',
        enabled: true,
        countries: ['*'], // Available worldwide
      },
    ];
  }
}

export const paymentService = new PaymentService();
