import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, Users, X, Download, Eye, AlertCircle, CheckCircle2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { validateEmailList } from "@/utils/emailValidation";
import * as XLSX from 'xlsx';

interface Contact {
  email: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  [key: string]: any; // Allow any additional custom fields
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
  const [invalidEmails, setInvalidEmails] = useState<{email: string; error: string; firstName?: string; lastName?: string; company?: string}[]>([]);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    console.log('ContactUpload - contacts updated:', contacts);
    if (contacts.length > 0) {
      console.log('ContactUpload - First contact:', contacts[0]);
      console.log('ContactUpload - Available fields:', Object.keys(contacts[0]));
    }
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
    const fileName = file.name.toLowerCase();
    const isCSV = fileName.endsWith('.csv');
    const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');
    
    if (!isCSV && !isExcel) {
      const error = "Please select a CSV or Excel file";
      console.error('File type validation failed:', file.name);
      setUploadError(error);
      toast({
        title: "Invalid file type",
        description: "Please upload a CSV or Excel file (.csv, .xlsx, .xls)",
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

    // Common data processing function
    const processData = (headers: string[], data: string[][]) => {
      const expectedColumns = headers.length;

      // Normalize rows to match headers length
      const normalized = data.map((row) => {
        const arr = Array(expectedColumns).fill('');
        for (let i = 0; i < Math.min(row.length, expectedColumns); i++) {
          arr[i] = (row[i] ?? '').toString();
        }
        return arr;
      });

      // Keep rows that have at least one non-empty cell
      const validData = normalized.filter((row) => row.some((cell) => (cell ?? '').toString().trim().length > 0));

      if (validData.length === 0) {
        const msg = "No valid data rows found";
        console.warn(msg);
        setUploadError(msg);
        toast({ title: "Upload failed", description: msg, variant: "destructive" });
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
        return false;
      }

      setCsvHeaders(headers);
      setCsvData(validData);
      setShowPreview(true);

      // Automatically import ALL columns without user interaction
      const mapping: Record<string, string> = {};
      headers.forEach((header, index) => {
        const lowerHeader = (header ?? '').toString().toLowerCase().replace(/[^a-z]/g, '');
        
        // Only auto-map email field as required
        if (lowerHeader.includes('email') || lowerHeader === 'email') {
          mapping[index.toString()] = 'email';
        } else {
          // For ALL other columns, use the original header name as the field name
          // Clean the header name to be a valid field name
          const cleanHeader = (header ?? '').toString()
            .replace(/[^a-zA-Z0-9]/g, '_') // Replace special chars with underscore
            .replace(/^_+|_+$/g, '') // Remove leading/trailing underscores
            .replace(/_+/g, '_') // Replace multiple underscores with single
            .toLowerCase();
          
          if (cleanHeader && cleanHeader !== 'email') {
            mapping[index.toString()] = cleanHeader;
          }
        }
      });
      setFieldMapping(mapping);

      // Automatically import contacts without showing preview
      const potentialContacts: Contact[] = validData.map(row => {
        const contact: Contact = { email: '' };
        
        Object.entries(mapping).forEach(([csvIndex, field]) => {
          if (field && row[parseInt(csvIndex)]) {
            const value = row[parseInt(csvIndex)].trim();
            if (value) {
              contact[field] = value;
            }
          }
        });
        
        return contact;
      });

      // Extract just the emails for validation
      const emails = potentialContacts.map(contact => contact.email).filter(email => email);
      
      // Validate all emails using our comprehensive validation
      const validationResult = validateEmailList(emails);
      
      // Create valid contacts only from emails that passed validation
      const validEmailSet = new Set(validationResult.validEmails);
      const validContacts = potentialContacts.filter(contact => 
        contact.email && validEmailSet.has(contact.email.toLowerCase())
      );

      // Store invalid emails with their contact information for spam folder
      const invalidContactsWithInfo = potentialContacts.filter(contact => 
        contact.email && !validEmailSet.has(contact.email.toLowerCase())
      ).map(contact => {
        const invalidEmailInfo = validationResult.invalidEmails.find(e => 
          e.email.toLowerCase() === contact.email.toLowerCase()
        );
        return {
          email: contact.email,
          error: invalidEmailInfo?.error || 'Invalid email format',
          firstName: contact.firstName,
          lastName: contact.lastName,
          company: contact.company
        };
      });

      setInvalidEmails(invalidContactsWithInfo);

      if (validContacts.length === 0) {
        const invalidCount = validationResult.invalidEmails.length;
        const errorDetails = invalidCount > 0 
          ? `Found ${invalidCount} invalid email${invalidCount > 1 ? 's' : ''}. Common issues: ${validationResult.invalidEmails.slice(0, 3).map(e => e.error).join(', ')}`
          : "No valid email addresses found in the uploaded file";
          
        toast({
          title: "No valid contacts found",
          description: errorDetails,
          variant: "destructive",
        });
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
        return false;
      }

      console.log('ContactUpload - Setting contacts:', validContacts);
      console.log('ContactUpload - First valid contact:', validContacts[0]);
      setContacts(validContacts);
      setShowPreview(false);
      
      // Create detailed success message
      let description = `Imported ${validContacts.length} valid contact${validContacts.length > 1 ? 's' : ''}`;
      
      const issues: string[] = [];
      if (validationResult.statistics.invalid > 0) {
        issues.push(`${validationResult.statistics.invalid} invalid email${validationResult.statistics.invalid > 1 ? 's' : ''} rejected`);
      }
      if (validationResult.statistics.duplicates > 0) {
        issues.push(`${validationResult.statistics.duplicates} duplicate${validationResult.statistics.duplicates > 1 ? 's' : ''} removed`);
      }
      
      if (issues.length > 0) {
        description += ` (${issues.join(', ')})`;
      }
      
      toast({
        title: "Contacts imported successfully",
        description,
        variant: validationResult.statistics.invalid > 0 ? "default" : "default",
      });

      // Show detailed breakdown if there were issues
      if (validationResult.statistics.invalid > 0) {
        console.log('Invalid emails detected:', validationResult.invalidEmails);
        
        // Show a follow-up toast with more details about invalid emails
        setTimeout(() => {
          const topErrors = validationResult.invalidEmails
            .slice(0, 5)
            .map(e => `${e.email}: ${e.error}`)
            .join('\n');
            
          toast({
            title: `${validationResult.statistics.invalid} emails were rejected`,
            description: `Common issues:\n${topErrors}${validationResult.invalidEmails.length > 5 ? '\n...' : ''}`,
            variant: "destructive",
          });
        }, 2000);
      }

      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return true;
    };

    // Determine if it's Excel or CSV
    if (isExcel) {
      // Handle Excel files
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const arrayBuffer = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(arrayBuffer, { type: 'array' });
          
          // Get the first worksheet
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          
          // Convert to JSON with headers
          const jsonData: string[][] = XLSX.utils.sheet_to_json(worksheet, { 
            header: 1,
            raw: false,
            defval: '',
            blankrows: false  // Skip blank rows
          }) as string[][];
          
          console.log('Excel data parsed, rows:', jsonData.length);
          console.log('Raw Excel data:', jsonData);
          
          if (jsonData.length === 0) {
            const msg = "Excel file is empty";
            setUploadError(msg);
            toast({ title: "Upload failed", description: msg, variant: "destructive" });
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
            return;
          }
          
          if (jsonData.length === 1) {
            const msg = "Excel file must contain at least one row of data besides headers";
            setUploadError(msg);
            toast({ title: "Upload failed", description: msg, variant: "destructive" });
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
            return;
          }
          
          const headers = jsonData[0].filter(h => h && h.toString().trim()); // Remove empty headers
          console.log('Filtered headers:', headers);
          
          if (headers.length === 0) {
            throw new Error("No valid headers found in Excel file");
          }
          
          let excelData = jsonData.slice(1)
            .map(row => {
              // Pad or trim row to match header count
              const paddedRow = Array(headers.length).fill('');
              for (let i = 0; i < Math.min(row.length, headers.length); i++) {
                paddedRow[i] = row[i] ? row[i].toString().trim() : '';
              }
              return paddedRow;
            })
            .filter(row => row.some(cell => cell && cell.trim())); // Remove completely empty rows
          
          console.log('Processed Excel data rows:', excelData.length);
          console.log('Sample processed row:', excelData[0]);
          
          // Limit data processing to prevent memory issues
          const maxRows = 10000;
          if (excelData.length > maxRows) {
            excelData = excelData.slice(0, maxRows);
            console.warn(`Excel data truncated to ${maxRows} rows for performance`);
          }
          
          if (excelData.length === 0) {
            throw new Error("No data rows found in Excel file");
          }
          
          console.log('Headers:', headers);
          console.log('Data rows:', excelData.length);
          
          processData(headers, excelData);
          
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Failed to parse Excel file";
          console.error('Excel parsing error:', error);
          setUploadError(errorMessage);
          toast({
            title: "Upload failed",
            description: errorMessage,
            variant: "destructive",
          });
          setIsUploading(false);
          if (fileInputRef.current) fileInputRef.current.value = "";
        }
      };
      
      reader.onerror = () => {
        const error = "Failed to read Excel file";
        console.error('FileReader error');
        setUploadError(error);
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
        toast({
          title: "Upload failed",
          description: "Failed to read the Excel file",
          variant: "destructive",
        });
      };
      
      reader.readAsArrayBuffer(file);
    } else {
      // Handle CSV files
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
            const msg = "CSV file is empty";
            setUploadError(msg);
            toast({ title: "Upload failed", description: msg, variant: "destructive" });
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
            return;
          }
          
          if (lines.length === 1) {
            const msg = "CSV file must contain at least one row of data besides headers";
            setUploadError(msg);
            toast({ title: "Upload failed", description: msg, variant: "destructive" });
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
            return;
          }

          // Simple CSV parsing - split by comma and handle basic quotes
          const parseCSVLine = (line: string): string[] => {
            const result: string[] = [];
            let current = '';
            let inQuotes = false;
            for (let i = 0; i < line.length; i++) {
              const char = line[i];
              if (char === '"') {
                if (inQuotes && line[i + 1] === '"') {
                  current += '"';
                  i++;
                } else {
                  inQuotes = !inQuotes;
                }
              } else if (char === ',' && !inQuotes) {
                result.push(current);
                current = '';
              } else {
                current += char;
              }
            }
            result.push(current);
            return result.map((cell) => cell.trim());
          };

          const headers = parseCSVLine(lines[0]);
          let csvData = lines.slice(1).map(parseCSVLine);
          
          // Limit data processing to prevent memory issues
          const maxRows = 10000;
          if (csvData.length > maxRows) {
            csvData = csvData.slice(0, maxRows);
            console.warn(`CSV truncated to ${maxRows} rows for performance`);
          }
          
          console.log('Headers:', headers);
          console.log('Data rows:', csvData.length);
          
          processData(headers, csvData);
          
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Failed to parse CSV file";
          console.error('CSV parsing error:', error);
          setUploadError(errorMessage);
          toast({
            title: "Upload failed",
            description: errorMessage,
            variant: "destructive",
          });
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
    }
  }, [toast]);


  const handleRemoveContact = (index: number) => {
    setContacts(contacts.filter((_, i) => i !== index));
  };

  const downloadSampleCSV = () => {
    const sampleData = `email,firstName,lastName,company,phone,title,department,city,country,industry,website,notes
john@example.com,John,Doe,Example Corp,+1-555-0123,Manager,Marketing,New York,USA,Technology,example.com,Interested in our services
jane@sample.com,Jane,Smith,Sample Inc,+1-555-0124,Director,Sales,Los Angeles,USA,Healthcare,sample.com,Previous customer
mike@test.org,Mike,Johnson,Test LLC,+1-555-0125,CEO,Executive,Houston,USA,Finance,test.org,Potential partnership`;
    
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
            Upload your CSV file - ALL columns will be automatically imported and available in email templates
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
                Choose a CSV or Excel file containing your email contacts
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
                      Choose File
                    </>
                  )}
                </Button>
                
                <div className="text-sm text-muted-foreground">
                  <p>Supported formats: CSV, Excel (.xlsx, .xls)</p>
                  <p>Required field: email</p>
                  <p>ALL columns automatically imported - no mapping needed</p>
                  <p>Maximum file size: 5MB</p>
                </div>
              </div>
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
                Upload New File
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
                    {/* Dynamically add headers for custom fields */}
                    {contacts.length > 0 && Object.keys(contacts[0])
                      .filter(key => !['email', 'firstName', 'lastName', 'company'].includes(key))
                      .map(key => (
                        <TableHead key={key} className="text-foreground capitalize">
                          {key.replace(/_/g, ' ')}
                        </TableHead>
                      ))
                    }
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
                      {/* Dynamically add cells for custom fields */}
                      {Object.keys(contact)
                        .filter(key => !['email', 'firstName', 'lastName', 'company'].includes(key))
                        .map(key => (
                          <TableCell key={key} className="text-foreground">
                            {contact[key] || '-'}
                          </TableCell>
                        ))
                      }
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
            
            {/* Show summary of imported fields */}
            {contacts.length > 0 && (
              <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                <h4 className="text-sm font-medium text-foreground mb-2">Imported Fields:</h4>
                <div className="flex flex-wrap gap-2">
                  {['email', 'firstName', 'lastName', 'company'].map(field => (
                    contacts[0][field] !== undefined && (
                      <Badge key={field} variant="secondary" className="text-xs">
                        {field === 'firstName' ? 'First Name' : 
                         field === 'lastName' ? 'Last Name' : 
                         field.charAt(0).toUpperCase() + field.slice(1)}
                      </Badge>
                    )
                  ))}
                  {Object.keys(contacts[0])
                    .filter(key => !['email', 'firstName', 'lastName', 'company'].includes(key))
                    .map(key => (
                      <Badge key={key} variant="outline" className="text-xs">
                        {key.replace(/_/g, ' ')}
                      </Badge>
                    ))
                  }
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Invalid Emails Section */}
      {invalidEmails.length > 0 && (
        <Card className="border-orange-200 dark:border-orange-900">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-orange-500" />
                <CardTitle className="text-lg text-orange-700 dark:text-orange-400">
                  Unverified Emails ({invalidEmails.length})
                </CardTitle>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setInvalidEmails([])}
                  className="text-orange-600 border-orange-200 hover:bg-orange-50"
                >
                  <X className="w-4 h-4 mr-1" />
                  Clear All
                </Button>
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
              These emails failed validation and will not be included in your campaign. 
              They are automatically categorized for your review.
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {invalidEmails.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-900">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm truncate">{item.email}</span>
                      <Badge variant="outline" className="text-orange-600 border-orange-200 shrink-0">
                        Invalid
                      </Badge>
                    </div>
                    {(item.firstName || item.lastName || item.company) && (
                      <div className="text-xs text-muted-foreground">
                        {[item.firstName, item.lastName].filter(Boolean).join(' ')}
                        {item.company && ` • ${item.company}`}
                      </div>
                    )}
                    <div className="text-xs text-orange-600 mt-1">
                      {item.error}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setInvalidEmails(prev => prev.filter((_, i) => i !== index))}
                    className="text-orange-600 hover:text-orange-700 hover:bg-orange-100 dark:hover:bg-orange-950/40 shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
            
            {invalidEmails.length > 5 && (
              <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                <div className="text-sm text-muted-foreground">
                  <strong>Common validation issues:</strong>
                  <ul className="mt-1 ml-4 list-disc text-xs space-y-1">
                    <li>Missing @ symbol or domain extension</li>
                    <li>Invalid characters or format</li>
                    <li>Common typos in domain names (e.g., "gmial" instead of "gmail")</li>
                    <li>Multiple @ symbols or consecutive dots</li>
                  </ul>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Input
        id="csv-upload"
        ref={fileInputRef}
        type="file"
        accept=".csv,.xlsx,.xls,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        onChange={handleFileUpload}
        disabled={isUploading}
        multiple={false}
        className="sr-only"
      />
    </div>
  );
};

export default ContactUpload;