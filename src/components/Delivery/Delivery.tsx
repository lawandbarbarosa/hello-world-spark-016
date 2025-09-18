import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Truck, Clock, CheckCircle, AlertCircle, RefreshCw, Mail, Upload, Zap } from "lucide-react";
import { useEmailVerification } from "@/hooks/useEmailVerification";
import { useCsvProcessor } from "@/hooks/useCsvProcessor";
import { toast } from "sonner";

const Delivery = () => {
  const [singleEmail, setSingleEmail] = useState('');
  const [bulkEmails, setBulkEmails] = useState('');
  const [verificationStats, setVerificationStats] = useState<any>(null);
  const [recentVerifications, setRecentVerifications] = useState<any[]>([]);
  
  const { 
    verifyEmail, 
    verifyEmails, 
    getVerificationHistory, 
    getVerificationStats,
    isVerifying,
    isBulkVerifying 
  } = useEmailVerification();

  const csvProcessor = useCsvProcessor();

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

    const result = await verifyEmail(singleEmail.trim());
    if (result) {
      toast.success(`Email verified: ${result.result}`);
      setSingleEmail('');
      loadData(); // Refresh data
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

    await verifyEmails(emails);
    setBulkEmails('');
    loadData(); // Refresh data
  };

  const handleCsvUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    
    if (!allowedTypes.includes(file.type) && !file.name.toLowerCase().endsWith('.csv')) {
      toast.error('Please upload a valid CSV or Excel file');
      return;
    }

    // Validate file size (20MB limit)
    if (file.size > 20 * 1024 * 1024) {
      toast.error('File size must be less than 20MB');
      return;
    }

    try {
      // Process the CSV file to extract emails
      const result = await csvProcessor.processCsvFile(file);
      
      if (result && result.emails.length > 0) {
        // Show confirmation dialog with file stats
        const shouldProceed = window.confirm(
          `Found ${result.emails.length} unique email addresses in ${result.fileName}.\n\n` +
          `This will use ${result.emails.length} verification credits.\n\n` +
          `Do you want to proceed with verification?`
        );

        if (shouldProceed) {
          // Upload file to storage for record keeping
          await csvProcessor.uploadCsvFile(file);
          
          // Verify all extracted emails
          await verifyEmails(result.emails);
          loadData(); // Refresh data
        }
      }
    } catch (error) {
      console.error('CSV processing error:', error);
      toast.error('Failed to process CSV file');
    }

    // Reset file input
    event.target.value = '';
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
        <Button onClick={loadData} disabled={isVerifying || isBulkVerifying}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Email Verification Tools */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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

        {/* CSV File Upload */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-4 h-4" />
              CSV File Import
            </CardTitle>
            <CardDescription>
              Upload a CSV file to extract and verify emails automatically
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleCsvUpload}
                disabled={csvProcessor.isProcessing || csvProcessor.isUploading}
                className="hidden"
                id="csv-upload"
              />
              <label
                htmlFor="csv-upload"
                className="cursor-pointer flex flex-col items-center gap-2"
              >
                <Upload className="w-8 h-8 text-muted-foreground" />
                <span className="text-sm font-medium">
                  {csvProcessor.isUploading ? 'Uploading...' : 'Upload CSV File'}
                </span>
                <span className="text-xs text-muted-foreground">
                  Supports CSV, Excel files (max 20MB)
                </span>
              </label>
            </div>
            {csvProcessor.isProcessing && (
              <div className="flex items-center justify-center py-2">
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                <span className="text-sm">Processing CSV file...</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

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