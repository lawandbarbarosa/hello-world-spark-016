import { useState } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface CsvProcessingResult {
  emails: string[];
  totalRows: number;
  validEmails: number;
  fileName: string;
}

export const useCsvProcessor = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const { user } = useAuth();

  const uploadCsvFile = async (file: File): Promise<string | null> => {
    if (!user) {
      toast.error('You must be logged in to upload files');
      return null;
    }

    setIsUploading(true);
    try {
      const fileName = `${user.id}/${Date.now()}-${file.name}`;
      
      const { data, error } = await supabase.storage
        .from('csv-uploads')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('Upload error:', error);
        toast.error('Failed to upload CSV file');
        return null;
      }

      return data.path;
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload CSV file');
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const processCsvFile = async (file: File): Promise<CsvProcessingResult | null> => {
    setIsProcessing(true);
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      const emails: string[] = [];
      const totalRows = jsonData.length;

      // Process each row to find email addresses
      for (const row of jsonData as any[][]) {
        if (Array.isArray(row)) {
          for (const cell of row) {
            if (typeof cell === 'string' && isValidEmail(cell.trim())) {
              const email = cell.trim().toLowerCase();
              if (!emails.includes(email)) {
                emails.push(email);
              }
            }
          }
        }
      }

      const result: CsvProcessingResult = {
        emails,
        totalRows,
        validEmails: emails.length,
        fileName: file.name
      };

      if (emails.length === 0) {
        toast.error('No valid email addresses found in the CSV file');
        return null;
      }

      toast.success(`Found ${emails.length} unique email addresses in ${file.name}`);
      return result;
    } catch (error) {
      console.error('CSV processing error:', error);
      toast.error('Failed to process CSV file. Please ensure it\'s a valid CSV format.');
      return null;
    } finally {
      setIsProcessing(false);
    }
  };

  const processCsvFromStorage = async (filePath: string): Promise<CsvProcessingResult | null> => {
    if (!user) {
      toast.error('You must be logged in to process files');
      return null;
    }

    setIsProcessing(true);
    
    try {
      const { data, error } = await supabase.storage
        .from('csv-uploads')
        .download(filePath);

      if (error) {
        console.error('Download error:', error);
        toast.error('Failed to download CSV file');
        return null;
      }

      const file = new File([data], filePath.split('/').pop() || 'file.csv', {
        type: 'text/csv'
      });

      return await processCsvFile(file);
    } catch (error) {
      console.error('Storage processing error:', error);
      toast.error('Failed to process CSV file from storage');
      return null;
    } finally {
      setIsProcessing(false);
    }
  };

  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const getUserCsvFiles = async () => {
    if (!user) return [];

    try {
      const { data, error } = await supabase.storage
        .from('csv-uploads')
        .list(user.id, {
          limit: 100,
          offset: 0,
          sortBy: { column: 'created_at', order: 'desc' }
        });

      if (error) {
        console.error('Error fetching CSV files:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching CSV files:', error);
      return [];
    }
  };

  return {
    processCsvFile,
    processCsvFromStorage,
    uploadCsvFile,
    getUserCsvFiles,
    isProcessing,
    isUploading
  };
};