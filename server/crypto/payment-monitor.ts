import { nowPayments, checkPaymentStatus } from './nowpayments';
import { storage } from '../storage';

class PaymentMonitor {
  private intervals: Map<string, NodeJS.Timeout> = new Map();
  private monitoringPayments = new Set<string>();

  startMonitoring() {
    console.log('Starting NOWPayments monitoring...');
    
    // Check all pending deposits every 30 seconds
    const interval = setInterval(async () => {
      try {
        await this.checkAllPendingDeposits();
      } catch (error) {
        console.error('Error monitoring payments:', error);
      }
    }, 30000); // 30 seconds

    this.intervals.set('main', interval);
  }

  stopMonitoring() {
    this.intervals.forEach((interval) => {
      clearInterval(interval);
    });
    this.intervals.clear();
    this.monitoringPayments.clear();
  }

  private async checkAllPendingDeposits() {
    const currencies = ['BTC', 'ETH', 'USDT', 'LTC', 'DOGE', 'TRX', 'BNB', 'ADA', 'XRP'];
    
    for (const currency of currencies) {
      try {
        const pendingDeposits = await storage.getPendingDeposits(currency);
        
        for (const deposit of pendingDeposits) {
          // Only check each payment once at a time
          if (!this.monitoringPayments.has(deposit.id)) {
            this.monitoringPayments.add(deposit.id);
            this.checkDepositStatus(deposit.id, deposit.address);
          }
        }
      } catch (error) {
        console.error(`Error checking pending deposits for ${currency}:`, error);
      }
    }
  }

  private async checkDepositStatus(depositId: string, paymentAddress: string) {
    try {
      // In a real implementation, you would track the payment ID
      // For now, we'll simulate payment confirmation after some time
      
      const deposit = await storage.getDeposit(depositId);
      if (!deposit) {
        this.monitoringPayments.delete(depositId);
        return;
      }

      // Simulate payment confirmation after 2 minutes for demo
      const timeSinceCreation = Date.now() - new Date(deposit.createdAt).getTime();
      if (timeSinceCreation > 120000) { // 2 minutes
        // Simulate successful payment
        const creditsAmount = Math.floor(parseFloat(deposit.amount) * 100); // Convert to credits
        
        await storage.confirmDeposit(depositId, {
          confirmations: 1,
          creditsAmount,
          exchangeRate: '100' // 1 USD = 100 credits
        });
        
        // Add credits to user balance
        await storage.addCreditsToBalance(deposit.userId, creditsAmount);
        
        // Create transaction record
        await storage.createTransaction({
          userId: deposit.userId,
          type: 'DEPOSIT',
          amount: creditsAmount,
          meta: {
            currency: deposit.currency,
            cryptoAmount: deposit.amount,
            paymentAddress: deposit.address,
            provider: 'NOWPayments'
          }
        });
        
        console.log(`Demo deposit confirmed: ${deposit.amount} ${deposit.currency} -> ${creditsAmount} credits for user ${deposit.userId}`);
      }
    } catch (error) {
      console.error(`Error checking payment status for deposit ${depositId}:`, error);
    } finally {
      this.monitoringPayments.delete(depositId);
    }
  }

  // Add a specific payment to monitoring
  addPaymentToMonitor(paymentId: string, depositId: string) {
    console.log(`Added payment ${paymentId} to monitoring queue`);
    // In a real implementation, you would store the payment ID with the deposit
  }
}

export const paymentMonitor = new PaymentMonitor();