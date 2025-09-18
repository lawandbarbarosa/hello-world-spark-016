import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Truck, Clock, CheckCircle, AlertCircle, RefreshCw, Mail, Upload, Zap } from "lucide-react";
import { useEmailVerification } from "@/hooks/useEmailVerification";
import { useCsvUpload } from "@/hooks/useCsvUpload";
import { toast } from "sonner";

const Delivery = () => {
  const [singleEmail, setSingleEmail] = useState('');
  const [bulkEmails, setBulkEmails] = useState('');
  const [verificationStats, setVerificationStats] = useState<any>(null);
  const [recentVerifications, setRecentVerifications] = useState<any[]>([]);
  const [csvEmails, setCsvEmails] = useState<any[]>([]);
  const [processedEmails, setProcessedEmails] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { 
    verifyEmail, 
    verifyEmails, 
    getVerificationHistory, 
    getVerificationStats,
    isVerifying,
    isBulkVerifying 
  } = useEmailVerification();

  const {
    uploadAndProcessCsv,
    isProcessing
  } = useCsvUpload();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [stats, history] = await Promise.all([
      getVerificationStats(),
      getVerificationHistory()
    ]);
    
    setVerificationStats(stats);
    setRecentVerifications(history.slice(0, 10)); // Show last 10 verifications
  };

  const handleSingleVerification = async () => {
    if (!singleEmail.trim()) {
      toast.error('Please enter an email address');
      return;
    }

    try {
      const result = await verifyEmail(singleEmail.trim());
      if (result) {
        toast.success(`Email verified: ${result.result}`);
        // Add to processed emails
        setProcessedEmails(prev => [{
          email: singleEmail.trim(),
          verification_result: result.result,
          is_valid: result.isValid,
          is_deliverable: result.isDeliverable,
          verified_at: new Date().toISOString(),
          source: 'single'
        }, ...prev.slice(0, 99)]); // Keep last 100 results
        setSingleEmail('');
        loadData(); // Refresh data
      }
      // If result is null, the error was already handled by the hook
    } catch (error) {
      console.error('Error in handleSingleVerification:', error);
      toast.error('An error occurred during email verification');
    }
  };

  const handleCsvUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const emailData = await uploadAndProcessCsv(file);
    setCsvEmails(emailData);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleVerifyCsvEmails = async () => {
    if (csvEmails.length === 0) {
      toast.error('No emails to verify');
      return;
    }

    try {
      const emails = csvEmails.map(emailData => emailData.email);
      const results = await verifyEmails(emails);
      
      if (results.length > 0) {
        // Add to processed emails
        const newProcessedEmails = results.map(result => ({
          email: result.email,
          verification_result: result.result,
          is_valid: result.isValid,
          is_deliverable: result.isDeliverable,
          verified_at: new Date().toISOString(),
          source: 'csv'
        }));
        
        setProcessedEmails(prev => [...newProcessedEmails, ...prev].slice(0, 100));
        setCsvEmails([]); // Clear CSV emails after verification
        loadData(); // Refresh data
      }
      // If no results, the error was already handled by the hook
    } catch (error) {
      console.error('Error in handleVerifyCsvEmails:', error);
      toast.error('An error occurred during CSV email verification');
    }
  };

  const handleBulkVerification = async () => {
    const emails = bulkEmails
      .split('\n')
      .map(email => email.trim())
      .filter(email => email && email.includes('@'));

    if (emails.length === 0) {
      toast.error('Please enter valid email addresses');
      return;
    }

    if (emails.length > 100) {
      toast.error('Please limit bulk verification to 100 emails at a time');
      return;
    }

    try {
      const results = await verifyEmails(emails);
      
      if (results.length > 0) {
        // Add to processed emails
        const newProcessedEmails = results.map(result => ({
          email: result.email,
          verification_result: result.result,
          is_valid: result.isValid,
          is_deliverable: result.isDeliverable,
          verified_at: new Date().toISOString(),
          source: 'bulk'
        }));
        
        setProcessedEmails(prev => [...newProcessedEmails, ...prev].slice(0, 100));
        setBulkEmails('');
        loadData(); // Refresh data
      }
      // If no results, the error was already handled by the hook
    } catch (error) {
      console.error('Error in handleBulkVerification:', error);
      toast.error('An error occurred during bulk verification');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'valid':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'invalid':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'disposable':
        return <AlertCircle className="w-4 h-4 text-orange-500" />;
      case 'catchall':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'unknown':
        return <Clock className="w-4 h-4 text-gray-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-red-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    // Handle undefined/null status
    if (!status) {
      status = 'unknown';
    }
    
    const variants = {
      valid: "bg-green-100 text-green-800 hover:bg-green-100",
      invalid: "bg-red-100 text-red-800 hover:bg-red-100",
      disposable: "bg-orange-100 text-orange-800 hover:bg-orange-100",
      catchall: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
      unknown: "bg-gray-100 text-gray-800 hover:bg-gray-100",
      error: "bg-red-100 text-red-800 hover:bg-red-100"
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
            Monitor email deliverability status and verify email addresses
          </p>
        </div>
        <Button onClick={loadData} disabled={isVerifying || isBulkVerifying || isProcessing}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Email Verification Tools */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Single Email Verification */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Single Email Verification
            </CardTitle>
            <CardDescription>
              Verify individual email addresses using NeverBounce
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="Enter email address to verify"
              value={singleEmail}
              onChange={(e) => setSingleEmail(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSingleVerification()}
            />
            <Button 
              onClick={handleSingleVerification}
              disabled={isVerifying || !singleEmail.trim()}
              className="w-full"
            >
              {isVerifying ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 mr-2" />
                  Verify Email
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Bulk Email Verification */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Bulk Email Verification
            </CardTitle>
            <CardDescription>
              Verify multiple email addresses (one per line, max 100)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="Enter email addresses (one per line)&#10;example1@domain.com&#10;example2@domain.com"
              value={bulkEmails}
              onChange={(e) => setBulkEmails(e.target.value)}
              rows={4}
            />
            <Button 
              onClick={handleBulkVerification}
              disabled={isBulkVerifying || !bulkEmails.trim()}
              className="w-full"
            >
              {isBulkVerifying ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Verifying Bulk...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Verify Emails
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* CSV Import Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-4 h-4" />
            CSV Import & Verification
          </CardTitle>
          <CardDescription>
            Upload a CSV file containing emails to verify them in bulk
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleCsvUpload}
              className="hidden"
            />
            <div className="space-y-2">
              <Upload className="w-8 h-8 mx-auto text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">
                  Click to upload CSV file or drag and drop
                </p>
                <p className="text-xs text-muted-foreground">
                  CSV files only, max 10MB. Ensure your CSV has an "email" column.
                </p>
              </div>
              <Button 
                variant="outline" 
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Choose CSV File
                  </>
                )}
              </Button>
            </div>
          </div>
          
          {csvEmails.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-accent rounded-lg">
                <span className="text-sm font-medium">
                  {csvEmails.length} emails loaded from CSV
                </span>
                <Button 
                  onClick={handleVerifyCsvEmails}
                  disabled={isBulkVerifying}
                  size="sm"
                >
                  {isBulkVerifying ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 mr-2" />
                      Verify All ({csvEmails.length})
                    </>
                  )}
                </Button>
              </div>
              
              {/* Preview of loaded emails */}
              <div className="max-h-40 overflow-y-auto border border-border rounded-lg p-3">
                <p className="text-xs text-muted-foreground mb-2">Preview of loaded emails:</p>
                {csvEmails.slice(0, 10).map((emailData, index) => (
                  <div key={index} className="text-xs py-1 flex items-center justify-between">
                    <span>{emailData.email}</span>
                    {(emailData.firstName || emailData.lastName) && (
                      <span className="text-muted-foreground">
                        {emailData.firstName} {emailData.lastName}
                      </span>
                    )}
                  </div>
                ))}
                {csvEmails.length > 10 && (
                  <p className="text-xs text-muted-foreground mt-2">
                    ... and {csvEmails.length - 10} more emails
                  </p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Verification Results */}
      {processedEmails.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Verification Results
            </CardTitle>
            <CardDescription>
              Results from recent email verifications ({processedEmails.length} emails)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {processedEmails.map((verification, index) => (
                <div 
                  key={`${verification.email}-${index}`}
                  className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(verification.verification_result)}
                    <div>
                      <p className="font-medium">{verification.email}</p>
                      <p className="text-xs text-muted-foreground">
                        {verification.source === 'single' && 'Single verification'}
                        {verification.source === 'bulk' && 'Bulk verification'}
                        {verification.source === 'csv' && 'CSV import'}
                        {' • '}
                        {new Date(verification.verified_at).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {verification.is_deliverable && (
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        Deliverable
                      </Badge>
                    )}
                    {getStatusBadge(verification.verification_result)}
                  </div>
                </div>
              ))}
            </div>
            {processedEmails.length >= 100 && (
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Showing last 100 verification results
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* Deliverability Statistics */}
      {verificationStats && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Verified</CardTitle>
                <Truck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{verificationStats.total.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  Email addresses verified
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Valid Emails</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {verificationStats.valid.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  {verificationStats.validityRate}% validity rate
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Deliverable</CardTitle>
                <Mail className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {verificationStats.deliverable.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  Can receive emails
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Invalid/Risky</CardTitle>
                <AlertCircle className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {(verificationStats.invalid + verificationStats.disposable).toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  Should be removed
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Deliverability Rate */}
          <Card>
            <CardHeader>
              <CardTitle>Deliverability Rate</CardTitle>
              <CardDescription>
                Percentage of emails that can successfully receive messages
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">{verificationStats.deliverabilityRate}%</span>
                <span className="text-sm text-muted-foreground">
                  {verificationStats.deliverable.toLocaleString()} of {verificationStats.total.toLocaleString()} emails
                </span>
              </div>
              <Progress value={verificationStats.deliverabilityRate} className="w-full" />
            </CardContent>
          </Card>
        </>
      )}

      {/* Recent Verifications */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Verifications</CardTitle>
          <CardDescription>
            Latest email verification results from NeverBounce
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentVerifications.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No verifications yet. Start by verifying some emails above!</p>
              </div>
            ) : (
              recentVerifications.map((verification) => (
                <div 
                  key={verification.id}
                  className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    {getStatusIcon(verification.verification_result)}
                    <div>
                      <h4 className="font-medium">{verification.email}</h4>
                      <p className="text-sm text-muted-foreground">
                        Verified {new Date(verification.verified_at).toLocaleDateString()} at{' '}
                        {new Date(verification.verified_at).toLocaleTimeString()}
                      </p>
                      {verification.suggested_correction && (
                        <p className="text-xs text-blue-600 mt-1">
                          Suggested: {verification.suggested_correction}
                        </p>
                      )}
                      {verification.flags && verification.flags.length > 0 && (
                        <p className="text-xs text-yellow-600 mt-1">
                          Flags: {verification.flags.join(', ')}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-4 text-right">
                    <div>
                      {verification.execution_time_ms && (
                        <p className="text-xs text-muted-foreground">
                          {verification.execution_time_ms}ms
                        </p>
                      )}
                    </div>
                    {getStatusBadge(verification.verification_result)}
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