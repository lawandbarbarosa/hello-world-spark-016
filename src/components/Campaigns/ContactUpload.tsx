import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, FileText, Users, X, Download, Eye, AlertCircle, CheckCircle2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

interface Contact {
  email: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  [key: string]: any;
}

interface CampaignData {
  name: string;
  description: string;
  senderAccounts: any[];
  contacts: Contact[];
  sequence: any[];
}

interface ContactUploadProps {
  data: CampaignData;
  onUpdate: (data: Partial<CampaignData>) => void;
}

const ContactUpload = ({ data, onUpdate }: ContactUploadProps) => {
  const [contacts, setContacts] = useState<Contact[]>(data.contacts || []);
  const [csvData, setCsvData] = useState<string[][]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});
  const [showPreview, setShowPreview] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string>("");
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    onUpdate({ contacts });
  }, [contacts]); // Removed onUpdate from dependencies to prevent infinite loop

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input?.files?.[0] ?? null;
    if (!file) return;

    console.log('File selected:', file.name, 'Size:', file.size);

    // Reset previous state
    setUploadError("");
    setCsvData([]);
    setCsvHeaders([]);
    setFieldMapping({});
    
    // Validate file type
    if (!file.name.toLowerCase().endsWith('.csv')) {
      const error = "Please select a CSV file";
      console.error('File type validation failed:', file.name);
      setUploadError(error);
      toast({
        title: "Invalid file type",
        description: "Please upload a CSV file",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      const error = "File too large. Maximum size is 5MB";
      console.error('File size validation failed:', file.size);
      setUploadError(error);
      toast({
        title: "File too large",
        description: "Please select a file smaller than 5MB",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    console.log('Starting file read...');

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        // Normalize text: strip BOM and normalize newlines
        const raw = (e.target?.result as string) ?? "";
        let text = raw.replace(/^\uFEFF/, "");
        text = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
        console.log('File content loaded, length:', text.length);
        
        // Simple and safe CSV parsing - split by lines first
        const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
        
        console.log('Parsed lines:', lines.length);
        
        
        if (lines.length === 0) {
          throw new Error("CSV file is empty");
        }
        
        if (lines.length === 1) {
          throw new Error("CSV file must contain at least one row of data besides headers");
        }

        // Simple CSV parsing - split by comma and handle basic quotes
        const parseCSVLine = (line: string): string[] => {
          // Simple split by comma, removing quotes
          return line.split(',').map(cell => cell.trim().replace(/^"|"$/g, ''));
        };

        const headers = parseCSVLine(lines[0]);
        const data = lines.slice(1).map(parseCSVLine);
        
        // Limit data processing to prevent memory issues
        const maxRows = 10000;
        if (data.length > maxRows) {
          data.splice(maxRows);
          console.warn(`CSV truncated to ${maxRows} rows for performance`);
        }
        
        console.log('Headers:', headers);
        console.log('Data rows:', data.length);
        
        // Validate that all rows have the same number of columns
        const expectedColumns = headers.length;
        const invalidRows = data.filter(row => row.length !== expectedColumns);
        
        if (invalidRows.length > 0) {
          console.warn(`Found ${invalidRows.length} rows with mismatched columns`);
        }
        
        // Filter out rows with mismatched columns
        const validData = data.filter(row => row.length === expectedColumns);
        
        if (validData.length === 0) {
          throw new Error("No valid data rows found in CSV");
        }
        
        setCsvHeaders(headers);
        setCsvData(validData);
        setShowPreview(true);
        
        // Auto-map common fields
        const mapping: Record<string, string> = {};
        headers.forEach((header, index) => {
          const lowerHeader = header.toLowerCase().replace(/[^a-z]/g, '');
          if (lowerHeader.includes('email') || lowerHeader === 'email') {
            mapping[index.toString()] = 'email';
          } else if (lowerHeader.includes('first') || lowerHeader === 'firstname' || lowerHeader === 'fname') {
            mapping[index.toString()] = 'firstName';
          } else if (lowerHeader.includes('last') || lowerHeader === 'lastname' || lowerHeader === 'lname') {
            mapping[index.toString()] = 'lastName';
          } else if (lowerHeader.includes('company') || lowerHeader === 'company' || lowerHeader === 'organization') {
            mapping[index.toString()] = 'company';
          }
        });
        setFieldMapping(mapping);
        
        console.log('Auto-mapping:', mapping);
        
        toast({
          title: "CSV uploaded successfully",
          description: `Found ${validData.length} contacts`,
        });
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to parse CSV file";
        console.error('CSV parsing error:', error);
        setUploadError(errorMessage);
        toast({
          title: "Upload failed",
          description: errorMessage,
          variant: "destructive",
        });
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    
    reader.onerror = () => {
      const error = "Failed to read file";
      console.error('FileReader error');
      setUploadError(error);
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      toast({
        title: "Upload failed",
        description: "Failed to read the file",
        variant: "destructive",
      });
    };
    
    reader.readAsText(file);
  }, [toast]);

  const handleImportContacts = () => {
    try {
      const emailIndex = Object.entries(fieldMapping).find(([_, field]) => field === 'email')?.[0];
      
      if (!emailIndex) {
        toast({
          title: "Email field required",
          description: "Please map at least one field to 'Email'",
          variant: "destructive",
        });
        return;
      }

      const importedContacts: Contact[] = csvData.map(row => {
        const contact: Contact = { email: '' };
        
        Object.entries(fieldMapping).forEach(([csvIndex, field]) => {
          if (field && row[parseInt(csvIndex)]) {
            contact[field] = row[parseInt(csvIndex)].trim();
          }
        });
        
        return contact;
      }).filter(contact => {
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return contact.email && emailRegex.test(contact.email);
      });

      // Remove duplicates based on email
      const uniqueContacts = importedContacts.filter((contact, index, self) =>
        index === self.findIndex(c => c.email.toLowerCase() === contact.email.toLowerCase())
      );

      if (uniqueContacts.length === 0) {
        toast({
          title: "No valid contacts found",
          description: "Please check that your CSV contains valid email addresses",
          variant: "destructive",
        });
        return;
      }

      setContacts(uniqueContacts);
      setShowPreview(false);
      
      toast({
        title: "Contacts imported successfully",
        description: `Imported ${uniqueContacts.length} valid contacts${
          importedContacts.length !== uniqueContacts.length 
            ? ` (${importedContacts.length - uniqueContacts.length} duplicates removed)` 
            : ''
        }`,
      });
      
    } catch (error) {
      toast({
        title: "Import failed",
        description: "Failed to import contacts. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleRemoveContact = (index: number) => {
    setContacts(contacts.filter((_, i) => i !== index));
  };

  const downloadSampleCSV = () => {
    const sampleData = `email,firstName,lastName,company
john@example.com,John,Doe,Example Corp
jane@sample.com,Jane,Smith,Sample Inc
mike@test.org,Mike,Johnson,Test LLC`;
    
    const blob = new Blob([sampleData], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample-contacts.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Upload Contact List</h3>
          <p className="text-sm text-muted-foreground">
            Import your contacts from a CSV file to target with your campaign
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={downloadSampleCSV}
          className="text-primary border-primary hover:bg-primary hover:text-primary-foreground"
        >
          <Download className="w-4 h-4 mr-2" />
          Download Sample CSV
        </Button>
      </div>

      {!showPreview && contacts.length === 0 && (
        <Card className="bg-gradient-card border-border border-dashed">
          <CardContent className="pt-12 pb-12">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Upload className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Upload Your Contact List</h3>
              <p className="text-muted-foreground mb-6">
                Choose a CSV file containing your email contacts
              </p>
              
              {uploadError && (
                <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <div className="flex items-center gap-2 text-destructive">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-sm font-medium">{uploadError}</span>
                  </div>
                </div>
              )}
              
              <div className="flex flex-col items-center gap-4">
                <Button 
                  disabled={isUploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-gradient-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
                >
                  {isUploading ? (
                    <>
                      <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <FileText className="w-4 h-4 mr-2" />
                      Choose CSV File
                    </>
                  )}
                </Button>
                
                <div className="text-sm text-muted-foreground">
                  <p>Supported format: CSV with headers</p>
                  <p>Required field: email</p>
                  <p>Optional fields: firstName, lastName, company</p>
                  <p>Maximum file size: 5MB</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* CSV Preview and Mapping */}
      {showPreview && (
        <Card className="bg-gradient-card border-border">
          <CardHeader>
            <CardTitle className="text-base text-foreground flex items-center justify-between">
              <span>CSV Preview & Field Mapping</span>
              <Button variant="ghost" size="sm" onClick={() => setShowPreview(false)}>
                <X className="w-4 h-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {csvHeaders.map((header, index) => (
                <div key={index} className="space-y-2">
                  <Label className="text-sm font-medium text-foreground">
                    {header}
                  </Label>
                  <Select 
                    value={fieldMapping[index.toString()] || ""} 
                    onValueChange={(value) => setFieldMapping({...fieldMapping, [index.toString()]: value})}
                  >
                    <SelectTrigger className="bg-background border-border text-foreground">
                      <SelectValue placeholder="Skip field" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Skip field</SelectItem>
                      <SelectItem value="email">Email *</SelectItem>
                      <SelectItem value="firstName">First Name</SelectItem>
                      <SelectItem value="lastName">Last Name</SelectItem>
                      <SelectItem value="company">Company</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>

            <div className="bg-muted p-4 rounded-lg">
              <h4 className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                <Eye className="w-4 h-4" />
                Preview ({csvData.length} rows)
              </h4>
              <div className="overflow-auto max-h-48">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {csvHeaders.map((header, index) => (
                        <TableHead key={index} className="text-foreground">{header}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {csvData.slice(0, 5).map((row, rowIndex) => (
                      <TableRow key={rowIndex}>
                        {row.map((cell, cellIndex) => (
                          <TableCell key={cellIndex} className="text-foreground">{cell}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowPreview(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleImportContacts}
                disabled={!Object.values(fieldMapping).includes('email')}
                className="bg-gradient-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Import {csvData.length} Contacts
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Imported Contacts */}
      {contacts.length > 0 && (
        <Card className="bg-gradient-card border-border">
          <CardHeader>
            <CardTitle className="text-base text-foreground flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Imported Contacts ({contacts.length})
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  fileInputRef.current?.click();
                }}
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload New CSV
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-auto max-h-64">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-foreground">Email</TableHead>
                    <TableHead className="text-foreground">First Name</TableHead>
                    <TableHead className="text-foreground">Last Name</TableHead>
                    <TableHead className="text-foreground">Company</TableHead>
                    <TableHead className="text-foreground">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contacts.slice(0, 10).map((contact, index) => (
                    <TableRow key={index}>
                      <TableCell className="text-foreground">{contact.email}</TableCell>
                      <TableCell className="text-foreground">{contact.firstName || '-'}</TableCell>
                      <TableCell className="text-foreground">{contact.lastName || '-'}</TableCell>
                      <TableCell className="text-foreground">{contact.company || '-'}</TableCell>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleRemoveContact(index)}
                          className="text-destructive hover:text-destructive"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            
            {contacts.length > 10 && (
              <p className="text-sm text-muted-foreground mt-2">
                Showing first 10 contacts of {contacts.length} total
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <Input
        id="csv-upload"
        ref={fileInputRef}
        type="file"
        accept=".csv,text/csv,application/vnd.ms-excel"
        onChange={handleFileUpload}
        disabled={isUploading}
        multiple={false}
        className="sr-only"
      />
    </div>
  );
};

export default ContactUpload;