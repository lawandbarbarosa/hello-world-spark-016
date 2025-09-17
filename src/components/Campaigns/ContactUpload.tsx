import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, FileText, Users, X, Download, Eye } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

  useEffect(() => {
    onUpdate({ contacts });
  }, [contacts, onUpdate]);

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length > 0) {
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        const data = lines.slice(1).map(line => 
          line.split(',').map(cell => cell.trim().replace(/"/g, ''))
        );
        
        setCsvHeaders(headers);
        setCsvData(data);
        setShowPreview(true);
        
        // Auto-map common fields
        const mapping: Record<string, string> = {};
        headers.forEach((header, index) => {
          const lowerHeader = header.toLowerCase();
          if (lowerHeader.includes('email') || lowerHeader === 'email') {
            mapping[index.toString()] = 'email';
          } else if (lowerHeader.includes('first') || lowerHeader === 'firstname') {
            mapping[index.toString()] = 'firstName';
          } else if (lowerHeader.includes('last') || lowerHeader === 'lastname') {
            mapping[index.toString()] = 'lastName';
          } else if (lowerHeader.includes('company') || lowerHeader === 'company') {
            mapping[index.toString()] = 'company';
          }
        });
        setFieldMapping(mapping);
      }
    };
    reader.readAsText(file);
  }, []);

  const handleImportContacts = () => {
    const importedContacts: Contact[] = csvData.map(row => {
      const contact: Contact = { email: '' };
      
      Object.entries(fieldMapping).forEach(([csvIndex, field]) => {
        if (field && row[parseInt(csvIndex)]) {
          contact[field] = row[parseInt(csvIndex)];
        }
      });
      
      return contact;
    }).filter(contact => contact.email && contact.email.includes('@'));

    setContacts(importedContacts);
    setShowPreview(false);
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
              
              <div className="flex flex-col items-center gap-4">
                <Label htmlFor="csv-upload" className="cursor-pointer">
                  <Button className="bg-gradient-primary text-primary-foreground hover:opacity-90">
                    <FileText className="w-4 h-4 mr-2" />
                    Choose CSV File
                  </Button>
                </Label>
                <Input
                  id="csv-upload"
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                
                <div className="text-sm text-muted-foreground">
                  <p>Supported format: CSV with headers</p>
                  <p>Required field: email</p>
                  <p>Optional fields: firstName, lastName, company</p>
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
                className="bg-gradient-primary text-primary-foreground hover:opacity-90"
              >
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
                  document.getElementById('csv-upload')?.click();
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
        type="file"
        accept=".csv"
        onChange={handleFileUpload}
        className="hidden"
      />
    </div>
  );
};

export default ContactUpload;