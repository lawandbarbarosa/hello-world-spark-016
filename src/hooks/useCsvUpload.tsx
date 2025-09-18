import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface CsvEmailData {
  email: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  [key: string]: any;
}

export const useCsvUpload = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const { user } = useAuth();

  const uploadCsvFile = async (file: File): Promise<string | null> => {
    if (!user) {
      toast.error('You must be logged in to upload files');
      return null;
    }

    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast.error('Please upload a CSV file');
      return null;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      toast.error('File size must be less than 10MB');
      return null;
    }

    setIsUploading(true);
    try {
      const fileName = `${user.id}/${Date.now()}-${file.name}`;
      const { data, error } = await supabase.storage
        .from('csv-uploads')
        .upload(fileName, file);

      if (error) {
        console.error('Upload error:', error);
        toast.error('Failed to upload CSV file');
        return null;
      }

      toast.success('CSV file uploaded successfully');
      return data.path;
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload CSV file');
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const parseCsvContent = (csvContent: string): CsvEmailData[] => {
    const lines = csvContent.split('\n').filter(line => line.trim());
    if (lines.length === 0) return [];

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
    const emailColumnIndex = headers.findIndex(h => 
      h.includes('email') || h.includes('e-mail') || h.includes('mail')
    );

    if (emailColumnIndex === -1) {
      throw new Error('No email column found. Please ensure your CSV has a column named "email", "e-mail", or similar.');
    }

    const firstNameIndex = headers.findIndex(h => 
      h.includes('first') && h.includes('name') || h === 'firstname' || h === 'fname'
    );
    const lastNameIndex = headers.findIndex(h => 
      h.includes('last') && h.includes('name') || h === 'lastname' || h === 'lname'
    );
    const companyIndex = headers.findIndex(h => 
      h.includes('company') || h.includes('organization') || h.includes('org')
    );

    const emails: CsvEmailData[] = [];
    const seenEmails = new Set<string>();

    for (let i = 1; i < lines.length; i++) {
      const columns = lines[i].split(',').map(c => c.trim().replace(/"/g, ''));
      const email = columns[emailColumnIndex]?.trim().toLowerCase();

      if (email && email.includes('@') && !seenEmails.has(email)) {
        seenEmails.add(email);
        
        const emailData: CsvEmailData = { email };
        
        if (firstNameIndex !== -1 && columns[firstNameIndex]) {
          emailData.firstName = columns[firstNameIndex].trim();
        }
        if (lastNameIndex !== -1 && columns[lastNameIndex]) {
          emailData.lastName = columns[lastNameIndex].trim();
        }
        if (companyIndex !== -1 && columns[companyIndex]) {
          emailData.company = columns[companyIndex].trim();
        }

        // Add all other columns as additional data
        headers.forEach((header, index) => {
          if (index !== emailColumnIndex && index !== firstNameIndex && 
              index !== lastNameIndex && index !== companyIndex && columns[index]) {
            emailData[header] = columns[index].trim();
          }
        });

        emails.push(emailData);
      }
    }

    return emails;
  };

  const processCsvFile = async (filePath: string): Promise<CsvEmailData[]> => {
    if (!user) {
      toast.error('You must be logged in to process files');
      return [];
    }

    setIsParsing(true);
    try {
      const { data, error } = await supabase.storage
        .from('csv-uploads')
        .download(filePath);

      if (error) {
        console.error('Download error:', error);
        toast.error('Failed to download CSV file');
        return [];
      }

      const csvContent = await data.text();
      const emails = parseCsvContent(csvContent);
      
      if (emails.length === 0) {
        toast.error('No valid emails found in the CSV file');
        return [];
      }

      toast.success(`Found ${emails.length} valid email${emails.length === 1 ? '' : 's'} in CSV`);
      return emails;
    } catch (error: any) {
      console.error('Processing error:', error);
      toast.error(error.message || 'Failed to process CSV file');
      return [];
    } finally {
      setIsParsing(false);
    }
  };

  const uploadAndProcessCsv = async (file: File): Promise<CsvEmailData[]> => {
    const filePath = await uploadCsvFile(file);
    if (!filePath) return [];
    
    return await processCsvFile(filePath);
  };

  return {
    uploadCsvFile,
    processCsvFile,
    uploadAndProcessCsv,
    parseCsvContent,
    isUploading,
    isParsing,
    isProcessing: isUploading || isParsing
  };
};