// Fare Calculation Engine
// base_fare = meter fare
// convenience_fee = ₹5
// peak_surcharge = ₹10 based on hours (8-10 AM, 5:30-8 PM)
// wait_penalty = max(0, (wait_seconds - 120)) / 60 * ₹3

export class FareCalculator {
  static calculateEstimatedFare(agreedFare) {
    const convenienceFee = 5.0;
    const peakSurcharge = this.getCurrentPeakSurcharge();

    // The agreedFare is the final total that the passenger saw on the screen.
    const baseFare = agreedFare - convenienceFee - peakSurcharge;

    return {
      meterEstimate: baseFare,
      convenienceFee,
      peakSurcharge,
      totalEstimated: agreedFare
    };
  }

  static calculateFinalFare(baseFare, waitSeconds) {
    // Deprecated for MVP. Fares are now locked upfront.
    return null;
  }

  static getCurrentPeakSurcharge() {
    const now = new Date();
    // In IST (since server timezone might vary, ideally use moment or date-fns-tz, 
    // but for MVP we assume local server time is IST or close enough)
    const hours = now.getHours();
    const minutes = now.getMinutes();

    // Morning 8:00 - 10:00
    if (hours >= 8 && hours < 10) return 10.0;
    
    // Evening 17:30 (5:30 PM) - 20:00 (8:00 PM)
    if ((hours === 17 && minutes >= 30) || (hours > 17 && hours < 20)) {
      return 10.0;
    }

    return 0.0;
  }
}
