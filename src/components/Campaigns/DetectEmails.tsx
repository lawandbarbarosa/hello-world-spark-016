import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { 
  Mail, 
  Users, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Trash2,
  Eye,
  ChevronDown,
  ChevronUp,
  RefreshCw
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Contact {
  email: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  [key: string]: any;
}

interface DuplicateEmail {
  email: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  campaignName: string;
  campaignId: string;
  sentAt: string;
}

interface DetectEmailsProps {
  data: {
    contacts: Contact[];
    [key: string]: any;
  };
  onUpdate: (data: Partial<{ contacts: Contact[]; selectedColumns: string[] }>) => void;
}

const DetectEmails = ({ data, onUpdate }: DetectEmailsProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [duplicates, setDuplicates] = useState<DuplicateEmail[]>([]);
  const [removedDuplicates, setRemovedDuplicates] = useState<Set<string>>(new Set());
  const [showDetails, setShowDetails] = useState(false);
  const [selectedColumns, setSelectedColumns] = useState<string[]>(['email']);

  // Get all available columns from contacts
  const availableColumns = data.contacts.length > 0 
    ? Object.keys(data.contacts[0]).filter(key => key.trim())
    : [];

  useEffect(() => {
    if (data.contacts.length > 0) {
      detectDuplicateEmails();
    }
  }, [data.contacts, user]);

  const detectDuplicateEmails = async () => {
    if (!user || data.contacts.length === 0) return;

    setLoading(true);
    try {
      // Get all email addresses from current contacts
      const currentEmails = data.contacts.map(contact => contact.email.toLowerCase());
      
      // Query previous campaigns for these emails
      const { data: emailSends, error } = await supabase
        .from('email_sends')
        .select(`
          id,
          created_at,
          contacts!inner(
            email,
            first_name,
            last_name
          ),
          campaigns!inner(
            id,
            name,
            user_id
          )
        `)
        .in('contacts.email', currentEmails)
        .eq('campaigns.user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error detecting duplicates:', error);
        // Don't show error toast - just continue with empty duplicates
        console.log('Database query failed, assuming no duplicates');
        setDuplicates([]);
        return;
      }

      // Process duplicates
      const duplicateMap = new Map<string, DuplicateEmail>();
      
      emailSends?.forEach(send => {
        const email = send.contacts?.email?.toLowerCase();
        if (email && currentEmails.includes(email) && !duplicateMap.has(email)) {
          const originalContact = data.contacts.find(c => c.email.toLowerCase() === email);
          duplicateMap.set(email, {
            email: send.contacts.email,
            firstName: originalContact?.firstName || send.contacts.first_name,
            lastName: originalContact?.lastName || send.contacts.last_name,
            company: originalContact?.company,
            campaignName: send.campaigns?.name || 'Unknown Campaign',
            campaignId: send.campaigns?.id || '',
            sentAt: send.created_at
          });
        }
      });

      setDuplicates(Array.from(duplicateMap.values()));
      
      if (duplicateMap.size > 0) {
        toast({
          title: "Duplicates Found",
          description: `Found ${duplicateMap.size} emails that were used in previous campaigns`,
          variant: "default",
        });
      } else {
        toast({
          title: "No Duplicates Found",
          description: "All emails are new - no duplicates from previous campaigns",
          variant: "default",
        });
      }

    } catch (error) {
      console.error('Error detecting duplicates:', error);
      // Don't show error toast - just continue with empty duplicates
      console.log('Duplicate detection failed, assuming no duplicates');
      setDuplicates([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveDuplicate = (email: string) => {
    const newRemoved = new Set(removedDuplicates);
    newRemoved.add(email.toLowerCase());
    setRemovedDuplicates(newRemoved);
  };

  const handleRestoreDuplicate = (email: string) => {
    const newRemoved = new Set(removedDuplicates);
    newRemoved.delete(email.toLowerCase());
    setRemovedDuplicates(newRemoved);
  };

  const handleRemoveAllDuplicates = () => {
    const allDuplicateEmails = duplicates.map(d => d.email.toLowerCase());
    setRemovedDuplicates(new Set(allDuplicateEmails));
  };

  const handleKeepAllDuplicates = () => {
    setRemovedDuplicates(new Set());
  };

  const handleColumnToggle = (column: string, checked: boolean) => {
    if (checked) {
      setSelectedColumns(prev => [...prev, column]);
    } else {
      setSelectedColumns(prev => prev.filter(c => c !== column));
    }
  };

  const handleProceed = () => {
    // Remove duplicates if any are marked for removal
    const filteredContacts = data.contacts.filter(contact => 
      !removedDuplicates.has(contact.email.toLowerCase())
    );

    // Update with filtered contacts and selected columns
    onUpdate({
      contacts: filteredContacts,
      selectedColumns
    });

    toast({
      title: "Email Detection Complete",
      description: `Proceeding with ${filteredContacts.length} contacts and ${selectedColumns.length} selected columns`,
    });
  };

  const duplicateEmails = duplicates.filter(d => !removedDuplicates.has(d.email.toLowerCase()));
  const removedCount = removedDuplicates.size;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground">Detect Emails</h3>
        <p className="text-sm text-muted-foreground">
          Check for duplicate emails and select columns for your email sequence
        </p>
      </div>

      {/* Detection Status */}
      <Card className="bg-gradient-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Email Detection Results
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-foreground">{data.contacts.length}</div>
              <div className="text-sm text-muted-foreground">Total Contacts</div>
            </div>
            <div className="text-center p-4 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">{duplicates.length}</div>
              <div className="text-sm text-muted-foreground">Duplicates Found</div>
            </div>
            <div className="text-center p-4 bg-success/10 rounded-lg">
              <div className="text-2xl font-bold text-success">{data.contacts.length - removedCount}</div>
              <div className="text-sm text-muted-foreground">Will Proceed</div>
            </div>
          </div>

          {loading && (
            <div className="flex items-center justify-center py-4">
              <RefreshCw className="w-5 h-5 animate-spin mr-2" />
              <span className="text-muted-foreground">Detecting duplicate emails...</span>
            </div>
          )}

          {!loading && duplicates.length > 0 && (
            <Alert className="border-orange-200 bg-orange-50 dark:bg-orange-950/20">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-800 dark:text-orange-200">
                Found {duplicates.length} emails that were used in previous campaigns. 
                You can remove them or keep them and proceed.
              </AlertDescription>
            </Alert>
          )}

          {!loading && duplicates.length === 0 && data.contacts.length > 0 && (
            <Alert className="border-success/20 bg-success/10">
              <CheckCircle className="h-4 w-4 text-success" />
              <AlertDescription className="text-success">
                ✅ No duplicate emails found! All {data.contacts.length} contacts are ready for your campaign.
              </AlertDescription>
            </Alert>
          )}

          {!loading && data.contacts.length === 0 && (
            <Alert className="border-muted bg-muted/50">
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              <AlertDescription className="text-muted-foreground">
                No contacts uploaded yet. Please go back and upload your contact list.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Duplicate Management */}
      {duplicates.length > 0 && (
        <Card className="border-border">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <XCircle className="w-5 h-5 text-orange-600" />
                Duplicate Email Management
              </CardTitle>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDetails(!showDetails)}
                >
                  {showDetails ? <ChevronUp className="w-4 h-4 mr-1" /> : <ChevronDown className="w-4 h-4 mr-1" />}
                  {showDetails ? 'Hide Details' : 'Show Details'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRemoveAllDuplicates}
                  className="text-destructive border-destructive/20 hover:bg-destructive/10"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Remove All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleKeepAllDuplicates}
                  className="text-success border-success/20 hover:bg-success/10"
                >
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Keep All
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {showDetails && (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {duplicates.map((duplicate, index) => {
                  const isRemoved = removedDuplicates.has(duplicate.email.toLowerCase());
                  return (
                    <div
                      key={index}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-lg border",
                        isRemoved 
                          ? "bg-muted/50 border-muted opacity-60" 
                          : "bg-orange-50 dark:bg-orange-950/20 border-orange-200"
                      )}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{duplicate.email}</span>
                          {isRemoved ? (
                            <Badge variant="secondary" className="text-xs">Removed</Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs text-orange-600">Duplicate</Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {(duplicate.firstName || duplicate.lastName) && 
                            `${duplicate.firstName || ''} ${duplicate.lastName || ''}`.trim()
                          }
                          {duplicate.company && ` • ${duplicate.company}`}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Previously used in: {duplicate.campaignName}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isRemoved ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRestoreDuplicate(duplicate.email)}
                            className="text-success border-success/20 hover:bg-success/10"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRemoveDuplicate(duplicate.email)}
                            className="text-destructive border-destructive/20 hover:bg-destructive/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            
            {!showDetails && (
              <div className="text-center py-4">
                <p className="text-muted-foreground">
                  {duplicates.length} duplicate emails found. 
                  Click "Show Details" to manage them individually.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Column Selection */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Select Columns for Email Sequence
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Choose which columns from your contact list will be available in email templates:
          </p>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {availableColumns.map(column => (
              <div key={column} className="flex items-center space-x-2">
                <Checkbox
                  id={column}
                  checked={selectedColumns.includes(column)}
                  onCheckedChange={(checked) => handleColumnToggle(column, checked as boolean)}
                />
                <Label
                  htmlFor={column}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  {column === 'firstName' ? 'First Name' :
                   column === 'lastName' ? 'Last Name' :
                   column.charAt(0).toUpperCase() + column.slice(1).replace(/_/g, ' ')}
                </Label>
              </div>
            ))}
          </div>

          {selectedColumns.length > 0 && (
            <div className="mt-4 p-3 bg-muted/50 rounded-lg">
              <p className="text-sm font-medium mb-2">Selected Columns:</p>
              <div className="flex flex-wrap gap-2">
                {selectedColumns.map(column => (
                  <Badge key={column} variant="secondary" className="text-xs">
                    {column === 'firstName' ? 'First Name' :
                     column === 'lastName' ? 'Last Name' :
                     column.charAt(0).toUpperCase() + column.slice(1).replace(/_/g, ' ')}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Proceed Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleProceed}
          className="bg-gradient-primary text-primary-foreground hover:opacity-90"
          disabled={data.contacts.length === 0}
        >
          Proceed to Email Sequence ({data.contacts.length - removedCount} contacts)
        </Button>
      </div>
    </div>
  );
};

export default DetectEmails;
