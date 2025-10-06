import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Filter, 
  Search, 
  Mail, 
  Tag, 
  TrendingUp, 
  Clock,
  CheckCircle,
  AlertCircle,
  Info,
  Brain,
  Upload,
  Settings
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { mlService, EmailFeatures, ClassificationResult } from '@/services/mlService';
import ModelUpload from './ModelUpload';

interface EmailClassification {
  id: string;
  email_id: string;
  subject: string;
  sender: string;
  content: string;
  classification: string;
  confidence: number;
  created_at: string;
  updated_at: string;
}

interface ClassificationStats {
  total: number;
  by_category: Record<string, number>;
  high_confidence: number;
  low_confidence: number;
}

const EmailClassification = () => {
  const [emails, setEmails] = useState<EmailClassification[]>([]);
  const [stats, setStats] = useState<ClassificationStats>({
    total: 0,
    by_category: {},
    high_confidence: 0,
    low_confidence: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [confidenceFilter, setConfidenceFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('classifications');
  const [availableModels, setAvailableModels] = useState(mlService.getAvailableModels());
  const [classifying, setClassifying] = useState(false);

  // Classification categories
  const categories = [
    { value: 'promotional', label: 'Promotional', color: 'bg-blue-100 text-blue-800' },
    { value: 'transactional', label: 'Transactional', color: 'bg-green-100 text-green-800' },
    { value: 'newsletter', label: 'Newsletter', color: 'bg-purple-100 text-purple-800' },
    { value: 'support', label: 'Support', color: 'bg-orange-100 text-orange-800' },
    { value: 'spam', label: 'Spam', color: 'bg-red-100 text-red-800' },
    { value: 'personal', label: 'Personal', color: 'bg-gray-100 text-gray-800' },
    { value: 'unclassified', label: 'Unclassified', color: 'bg-yellow-100 text-yellow-800' }
  ];

  useEffect(() => {
    fetchEmailClassifications();
  }, []);

  // Update available models when they change
  useEffect(() => {
    const interval = setInterval(() => {
      setAvailableModels(mlService.getAvailableModels());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchEmailClassifications = async () => {
    try {
      setLoading(true);
      
      // For now, we'll create mock data since we don't have the actual email classification table
      // In a real implementation, you would query your email_classifications table
      const mockEmails: EmailClassification[] = [
        {
          id: '1',
          email_id: 'email_1',
          subject: 'Special Offer - 50% Off Everything!',
          sender: 'marketing@company.com',
          content: 'Don\'t miss out on our biggest sale of the year...',
          classification: 'promotional',
          confidence: 0.95,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: '2',
          email_id: 'email_2',
          subject: 'Your order confirmation #12345',
          sender: 'orders@store.com',
          content: 'Thank you for your order. Your items will be shipped...',
          classification: 'transactional',
          confidence: 0.98,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: '3',
          email_id: 'email_3',
          subject: 'Weekly Newsletter - Tech Updates',
          sender: 'newsletter@tech.com',
          content: 'This week in tech: AI developments, new startups...',
          classification: 'newsletter',
          confidence: 0.87,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];

      setEmails(mockEmails);
      calculateStats(mockEmails);
    } catch (error) {
      console.error('Error fetching email classifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (emailData: EmailClassification[]) => {
    const categoryCounts: Record<string, number> = {};
    let highConfidence = 0;
    let lowConfidence = 0;

    emailData.forEach(email => {
      categoryCounts[email.classification] = (categoryCounts[email.classification] || 0) + 1;
      if (email.confidence >= 0.8) {
        highConfidence++;
      } else {
        lowConfidence++;
      }
    });

    setStats({
      total: emailData.length,
      by_category: categoryCounts,
      high_confidence: highConfidence,
      low_confidence: lowConfidence
    });
  };

  const filteredEmails = emails.filter(email => {
    const matchesSearch = email.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         email.sender.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         email.content.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategory === 'all' || email.classification === selectedCategory;
    
    const matchesConfidence = confidenceFilter === 'all' ||
                             (confidenceFilter === 'high' && email.confidence >= 0.8) ||
                             (confidenceFilter === 'low' && email.confidence < 0.8);

    return matchesSearch && matchesCategory && matchesConfidence;
  });

  // ML Classification Functions
  const classifyWithML = async (emailData: EmailClassification) => {
    const features: EmailFeatures = {
      subject: emailData.subject,
      content: emailData.content,
      sender: emailData.sender,
      timestamp: emailData.created_at
    };

    try {
      const result = await mlService.classifyEmail(features);
      if (result) {
        return {
          ...emailData,
          classification: result.category,
          confidence: result.confidence,
          updated_at: new Date().toISOString()
        };
      }
    } catch (error) {
      console.error('ML classification failed:', error);
    }
    
    return emailData;
  };

  const classifyAllEmails = async () => {
    if (availableModels.length === 0) {
      alert('No ML models available. Please import a model first.');
      return;
    }

    setClassifying(true);
    try {
      const updatedEmails = await Promise.all(
        emails.map(email => classifyWithML(email))
      );
      
      setEmails(updatedEmails);
      calculateStats(updatedEmails);
      
      // In a real implementation, you would save these classifications to your database
      console.log('All emails classified with ML model');
    } catch (error) {
      console.error('Batch classification failed:', error);
    } finally {
      setClassifying(false);
    }
  };

  const handleModelAdded = (modelId: string) => {
    setAvailableModels(mlService.getAvailableModels());
  };

  const handleModelSelected = (modelId: string) => {
    setAvailableModels(mlService.getAvailableModels());
  };

  const getCategoryInfo = (category: string) => {
    return categories.find(cat => cat.value === category) || categories[categories.length - 1];
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getConfidenceIcon = (confidence: number) => {
    if (confidence >= 0.8) return <CheckCircle className="w-4 h-4" />;
    if (confidence >= 0.6) return <AlertCircle className="w-4 h-4" />;
    return <Info className="w-4 h-4" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading email classifications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Email Classification</h1>
          <p className="text-muted-foreground">
            Analyze and categorize emails using machine learning models
          </p>
        </div>
        <div className="flex items-center gap-2">
          {availableModels.length > 0 && (
            <Button 
              onClick={classifyAllEmails}
              disabled={classifying}
              className="bg-gradient-primary text-primary-foreground"
            >
              {classifying ? (
                <>
                  <Brain className="w-4 h-4 mr-2 animate-pulse" />
                  Classifying...
                </>
              ) : (
                <>
                  <Brain className="w-4 h-4 mr-2" />
                  Classify with ML
                </>
              )}
            </Button>
          )}
          <Button 
            variant="outline"
            onClick={() => setActiveTab('models')}
          >
            <Settings className="w-4 h-4 mr-2" />
            Manage Models
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="classifications">Classifications</TabsTrigger>
          <TabsTrigger value="models">ML Models</TabsTrigger>
        </TabsList>

        <TabsContent value="models" className="space-y-6">
          <ModelUpload 
            onModelAdded={handleModelAdded}
            onModelSelected={handleModelSelected}
          />
        </TabsContent>

        <TabsContent value="classifications" className="space-y-6">

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Emails</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              Emails analyzed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Confidence</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.high_confidence}</div>
            <p className="text-xs text-muted-foreground">
              {stats.total > 0 ? Math.round((stats.high_confidence / stats.total) * 100) : 0}% of total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Confidence</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.low_confidence}</div>
            <p className="text-xs text-muted-foreground">
              Needs review
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categories</CardTitle>
            <Tag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Object.keys(stats.by_category).length}</div>
            <p className="text-xs text-muted-foreground">
              Active categories
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search emails..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category.value} value={category.value}>
                    {category.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={confidenceFilter} onValueChange={setConfidenceFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Confidence" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Confidence</SelectItem>
                <SelectItem value="high">High (≥80%)</SelectItem>
                <SelectItem value="low">Low (&lt;80%)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Email List */}
      <Card>
        <CardHeader>
          <CardTitle>Classified Emails</CardTitle>
          <CardDescription>
            {filteredEmails.length} of {emails.length} emails
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredEmails.length === 0 ? (
              <div className="text-center py-8">
                <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No emails found</h3>
                <p className="text-muted-foreground">
                  Try adjusting your search or filter criteria
                </p>
              </div>
            ) : (
              filteredEmails.map((email) => {
                const categoryInfo = getCategoryInfo(email.classification);
                return (
                  <div key={email.id} className="border rounded-lg p-4 hover:bg-accent/50 transition-colors">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm mb-1">{email.subject}</h4>
                        <p className="text-xs text-muted-foreground mb-2">{email.sender}</p>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {email.content}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2 ml-4">
                        <Badge className={categoryInfo.color}>
                          {categoryInfo.label}
                        </Badge>
                        <div className={`flex items-center gap-1 text-xs ${getConfidenceColor(email.confidence)}`}>
                          {getConfidenceIcon(email.confidence)}
                          {Math.round(email.confidence * 100)}%
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>ID: {email.email_id}</span>
                      <span>{new Date(email.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EmailClassification;
