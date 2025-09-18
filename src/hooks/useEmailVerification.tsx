import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface VerificationResult {
  email: string;
  result: 'valid' | 'invalid' | 'disposable' | 'catchall' | 'unknown' | 'error';
  isValid: boolean;
  isDeliverable: boolean;
  flags: string[];
  suggestedCorrection?: string;
  executionTime?: number;
}

export const useEmailVerification = () => {
  const [isVerifying, setIsVerifying] = useState(false);
  const [isBulkVerifying, setIsBulkVerifying] = useState(false);
  const { user } = useAuth();

  const verifyEmail = async (email: string): Promise<VerificationResult | null> => {
    if (!user) {
      toast.error('You must be logged in to verify emails');
      return null;
    }

    setIsVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke('verify-email', {
        body: { email, userId: user.id }
      });

      if (error) {
        console.error('Verification error:', error);
        toast.error('Failed to verify email');
        return null;
      }

      return data as VerificationResult;
    } catch (error) {
      console.error('Verification error:', error);
      toast.error('Failed to verify email');
      return null;
    } finally {
      setIsVerifying(false);
    }
  };

  const verifyEmails = async (emails: string[]): Promise<VerificationResult[]> => {
    if (!user) {
      toast.error('You must be logged in to verify emails');
      return [];
    }

    setIsBulkVerifying(true);
    const results: VerificationResult[] = [];
    
    try {
      // Process emails in batches to avoid overwhelming the API
      const batchSize = 5;
      for (let i = 0; i < emails.length; i += batchSize) {
        const batch = emails.slice(i, i + batchSize);
        const batchPromises = batch.map(email => verifyEmail(email));
        const batchResults = await Promise.all(batchPromises);
        
        results.push(...batchResults.filter(result => result !== null) as VerificationResult[]);
        
        // Small delay between batches to be respectful to the API
        if (i + batchSize < emails.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      toast.success(`Verified ${results.length} emails`);
      return results;
    } catch (error) {
      console.error('Bulk verification error:', error);
      toast.error('Failed to verify emails');
      return results;
    } finally {
      setIsBulkVerifying(false);
    }
  };

  const getVerificationHistory = async () => {
    if (!user) return [];

    try {
      const { data, error } = await supabase
        .from('email_verifications')
        .select('*')
        .eq('user_id', user.id)
        .order('verified_at', { ascending: false });

      if (error) {
        console.error('Error fetching verification history:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching verification history:', error);
      return [];
    }
  };

  const getVerificationStats = async () => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('email_verifications')
        .select('verification_result, is_valid, is_deliverable')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching verification stats:', error);
        return null;
      }

      const total = data.length;
      const valid = data.filter(v => v.is_valid).length;
      const deliverable = data.filter(v => v.is_deliverable).length;
      const invalid = data.filter(v => v.verification_result === 'invalid').length;
      const disposable = data.filter(v => v.verification_result === 'disposable').length;
      const catchall = data.filter(v => v.verification_result === 'catchall').length;
      const unknown = data.filter(v => v.verification_result === 'unknown').length;

      return {
        total,
        valid,
        deliverable,
        invalid,
        disposable,
        catchall,
        unknown,
        deliverabilityRate: total > 0 ? Math.round((deliverable / total) * 100) : 0,
        validityRate: total > 0 ? Math.round((valid / total) * 100) : 0
      };
    } catch (error) {
      console.error('Error fetching verification stats:', error);
      return null;
    }
  };

  return {
    verifyEmail,
    verifyEmails,
    getVerificationHistory,
    getVerificationStats,
    isVerifying,
    isBulkVerifying
  };
};