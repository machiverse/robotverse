import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calculator, TrendingUp, Calendar, DollarSign } from 'lucide-react';

interface LoanCalculatorProps {
  onClose?: () => void;
  defaultAmount?: number;
  defaultRate?: number;
  defaultTenure?: number;
}

const LoanCalculator = ({ 
  onClose, 
  defaultAmount = 1000000, 
  defaultRate = 10.5, 
  defaultTenure = 60 
}: LoanCalculatorProps) => {
  const [loanAmount, setLoanAmount] = useState(defaultAmount.toString());
  const [interestRate, setInterestRate] = useState(defaultRate.toString());
  const [tenureMonths, setTenureMonths] = useState(defaultTenure.toString());
  const [results, setResults] = useState<{
    emi: number;
    totalAmount: number;
    totalInterest: number;
  } | null>(null);

  const calculateEMI = () => {
    const principal = parseFloat(loanAmount);
    const rate = parseFloat(interestRate) / 100 / 12; // Monthly interest rate
    const tenure = parseInt(tenureMonths);

    if (!principal || !rate || !tenure || principal <= 0 || rate <= 0 || tenure <= 0) {
      return;
    }

    // EMI = [P x R x (1+R)^N] / [(1+R)^N-1]
    const emi = (principal * rate * Math.pow(1 + rate, tenure)) / (Math.pow(1 + rate, tenure) - 1);
    const totalAmount = emi * tenure;
    const totalInterest = totalAmount - principal;

    setResults({
      emi: Math.round(emi),
      totalAmount: Math.round(totalAmount),
      totalInterest: Math.round(totalInterest)
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="w-5 h-5" />
          Loan EMI Calculator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Input Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="loanAmount">Loan Amount (₹)</Label>
            <Input
              id="loanAmount"
              type="number"
              value={loanAmount}
              onChange={(e) => setLoanAmount(e.target.value)}
              placeholder="10,00,000"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="interestRate">Interest Rate (% per annum)</Label>
            <Input
              id="interestRate"
              type="number"
              step="0.1"
              value={interestRate}
              onChange={(e) => setInterestRate(e.target.value)}
              placeholder="10.5"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="tenureMonths">Tenure (Months)</Label>
            <Input
              id="tenureMonths"
              type="number"
              value={tenureMonths}
              onChange={(e) => setTenureMonths(e.target.value)}
              placeholder="60"
            />
          </div>
        </div>

        {/* Calculate Button */}
        <div className="flex justify-center">
          <Button onClick={calculateEMI} className="flex items-center gap-2">
            <Calculator className="w-4 h-4" />
            Calculate EMI
          </Button>
        </div>

        {/* Results Section */}
        {results && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center mb-2">
                  <DollarSign className="w-5 h-5 text-primary" />
                </div>
                <p className="text-sm text-muted-foreground">Monthly EMI</p>
                <p className="text-xl font-bold text-primary">
                  {formatCurrency(results.emi)}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center mb-2">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
                <p className="text-sm text-muted-foreground">Total Interest</p>
                <p className="text-xl font-bold text-green-600">
                  {formatCurrency(results.totalInterest)}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center mb-2">
                  <Calendar className="w-5 h-5 text-blue-600" />
                </div>
                <p className="text-sm text-muted-foreground">Total Amount</p>
                <p className="text-xl font-bold text-blue-600">
                  {formatCurrency(results.totalAmount)}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Breakdown Table */}
        {results && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-lg">Loan Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Principal Amount:</span>
                  <span className="font-semibold">{formatCurrency(parseFloat(loanAmount))}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Interest Rate:</span>
                  <span className="font-semibold">{interestRate}% per annum</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Loan Tenure:</span>
                  <span className="font-semibold">{tenureMonths} months ({Math.round(parseInt(tenureMonths) / 12 * 10) / 10} years)</span>
                </div>
                <div className="border-t pt-3">
                  <div className="flex justify-between text-lg">
                    <span className="font-semibold">Monthly EMI:</span>
                    <span className="font-bold text-primary">{formatCurrency(results.emi)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Close Button */}
        {onClose && (
          <div className="flex justify-end pt-4">
            <Button variant="outline" onClick={onClose}>
              Close Calculator
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default LoanCalculator;