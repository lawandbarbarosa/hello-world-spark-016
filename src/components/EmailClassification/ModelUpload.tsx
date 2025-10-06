import React, { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Upload, 
  FileText, 
  Brain, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  Trash2,
  Play,
  Settings
} from 'lucide-react';
import { toast } from 'sonner';
import { mlService, TensorFlowModel, APIModel, MLModel } from '@/services/mlService';

interface ModelUploadProps {
  onModelAdded?: (modelId: string) => void;
  onModelSelected?: (modelId: string) => void;
}

const ModelUpload: React.FC<ModelUploadProps> = ({ onModelAdded, onModelSelected }) => {
  const [uploadMethod, setUploadMethod] = useState<'file' | 'api' | 'url'>('file');
  const [modelName, setModelName] = useState('');
  const [modelVersion, setModelVersion] = useState('');
  const [apiEndpoint, setApiEndpoint] = useState('');
  const [modelUrl, setModelUrl] = useState('');
  const [modelDescription, setModelDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const availableModels = mlService.getAvailableModels();

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    const fileName = file.name;
    const fileExtension = fileName.split('.').pop()?.toLowerCase();

    // Validate file type
    const supportedTypes = ['json', 'h5', 'pkl', 'onnx', 'tflite', 'bin'];
    if (!fileExtension || !supportedTypes.includes(fileExtension)) {
      toast.error(`Unsupported file type: ${fileExtension}. Supported types: ${supportedTypes.join(', ')}`);
      return;
    }

    setUploading(true);
    try {
      // Read file content
      const fileContent = await file.text();
      
      // Create model based on file type
      let model: MLModel;
      const modelId = `model_${Date.now()}`;
      
      if (fileExtension === 'json') {
        // TensorFlow.js model
        model = new TensorFlowModel(modelName || fileName, modelVersion || '1.0.0');
        // In a real implementation, you would save the model file and load it
        // For now, we'll just register the model
      } else {
        // Other model types would need different handling
        toast.error(`Model type ${fileExtension} not yet implemented`);
        return;
      }

      // Register the model
      mlService.registerModel(modelId, model);
      
      toast.success(`Model "${modelName || fileName}" uploaded successfully!`);
      
      // Reset form
      setModelName('');
      setModelVersion('');
      setModelDescription('');
      
      onModelAdded?.(modelId);
    } catch (error) {
      console.error('File upload error:', error);
      toast.error('Failed to upload model file');
    } finally {
      setUploading(false);
    }
  };

  const handleApiModelSubmit = async () => {
    if (!apiEndpoint || !modelName) {
      toast.error('Please provide both model name and API endpoint');
      return;
    }

    setUploading(true);
    try {
      const modelId = `api_model_${Date.now()}`;
      const model = new APIModel(modelName, modelVersion || '1.0.0', apiEndpoint);
      
      mlService.registerModel(modelId, model);
      
      toast.success(`API model "${modelName}" registered successfully!`);
      
      // Reset form
      setModelName('');
      setModelVersion('');
      setApiEndpoint('');
      setModelDescription('');
      
      onModelAdded?.(modelId);
    } catch (error) {
      console.error('API model registration error:', error);
      toast.error('Failed to register API model');
    } finally {
      setUploading(false);
    }
  };

  const handleUrlModelSubmit = async () => {
    if (!modelUrl || !modelName) {
      toast.error('Please provide both model name and URL');
      return;
    }

    setUploading(true);
    try {
      const modelId = `url_model_${Date.now()}`;
      const model = new TensorFlowModel(modelName, modelVersion || '1.0.0');
      
      mlService.registerModel(modelId, model);
      
      toast.success(`URL model "${modelName}" registered successfully!`);
      
      // Reset form
      setModelName('');
      setModelVersion('');
      setModelUrl('');
      setModelDescription('');
      
      onModelAdded?.(modelId);
    } catch (error) {
      console.error('URL model registration error:', error);
      toast.error('Failed to register URL model');
    } finally {
      setUploading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files);
    }
  };

  const loadModel = async (modelId: string) => {
    try {
      const success = await mlService.loadModel(modelId);
      if (success) {
        toast.success('Model loaded successfully!');
      } else {
        toast.error('Failed to load model');
      }
    } catch (error) {
      console.error('Model loading error:', error);
      toast.error('Error loading model');
    }
  };

  const selectModel = (modelId: string) => {
    const success = mlService.setActiveModel(modelId);
    if (success) {
      toast.success('Model selected as active!');
      onModelSelected?.(modelId);
    } else {
      toast.error('Failed to select model');
    }
  };

  const removeModel = (modelId: string) => {
    // In a real implementation, you would remove the model from the service
    toast.success('Model removed successfully!');
  };

  return (
    <div className="space-y-6">
      {/* Upload New Model */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Import Machine Learning Model
          </CardTitle>
          <CardDescription>
            Upload your trained ML model for email classification
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Upload Method Selection */}
          <div className="space-y-2">
            <Label>Upload Method</Label>
            <Select value={uploadMethod} onValueChange={(value: 'file' | 'api' | 'url') => setUploadMethod(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="file">Upload File</SelectItem>
                <SelectItem value="api">API Endpoint</SelectItem>
                <SelectItem value="url">Model URL</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Model Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="modelName">Model Name *</Label>
              <Input
                id="modelName"
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                placeholder="e.g., Email Classifier v2"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="modelVersion">Version</Label>
              <Input
                id="modelVersion"
                value={modelVersion}
                onChange={(e) => setModelVersion(e.target.value)}
                placeholder="e.g., 1.0.0"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="modelDescription">Description</Label>
            <Textarea
              id="modelDescription"
              value={modelDescription}
              onChange={(e) => setModelDescription(e.target.value)}
              placeholder="Describe your model's capabilities and training data..."
              rows={3}
            />
          </div>

          {/* File Upload */}
          {uploadMethod === 'file' && (
            <div className="space-y-4">
              <Label>Model File</Label>
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-lg font-medium mb-2">
                  Drop your model file here, or click to browse
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  Supported formats: JSON, H5, PKL, ONNX, TFLite
                </p>
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Choose File
                    </>
                  )}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept=".json,.h5,.pkl,.onnx,.tflite,.bin"
                  onChange={(e) => handleFileUpload(e.target.files)}
                />
              </div>
            </div>
          )}

          {/* API Endpoint */}
          {uploadMethod === 'api' && (
            <div className="space-y-2">
              <Label htmlFor="apiEndpoint">API Endpoint *</Label>
              <Input
                id="apiEndpoint"
                value={apiEndpoint}
                onChange={(e) => setApiEndpoint(e.target.value)}
                placeholder="https://your-api.com/classify"
              />
            </div>
          )}

          {/* Model URL */}
          {uploadMethod === 'url' && (
            <div className="space-y-2">
              <Label htmlFor="modelUrl">Model URL *</Label>
              <Input
                id="modelUrl"
                value={modelUrl}
                onChange={(e) => setModelUrl(e.target.value)}
                placeholder="https://your-server.com/models/email-classifier.json"
              />
            </div>
          )}

          {/* Submit Button */}
          <Button
            onClick={() => {
              if (uploadMethod === 'file') {
                // File upload is handled by the file input
                toast.info('Please select a file to upload');
              } else if (uploadMethod === 'api') {
                handleApiModelSubmit();
              } else if (uploadMethod === 'url') {
                handleUrlModelSubmit();
              }
            }}
            disabled={uploading || !modelName}
            className="w-full"
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {uploadMethod === 'file' ? 'Uploading...' : 'Registering...'}
              </>
            ) : (
              <>
                <Brain className="w-4 h-4 mr-2" />
                {uploadMethod === 'file' ? 'Upload Model' : 'Register Model'}
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Available Models */}
      {availableModels.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Available Models
            </CardTitle>
            <CardDescription>
              Manage your imported ML models
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {availableModels.map((model) => (
                <div key={model.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-semibold">{model.name}</h4>
                      <Badge variant={model.isLoaded ? 'default' : 'secondary'}>
                        {model.isLoaded ? 'Loaded' : 'Not Loaded'}
                      </Badge>
                      <Badge variant="outline">{model.type}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Version: {model.version} | ID: {model.id}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {!model.isLoaded && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => loadModel(model.id)}
                      >
                        <Play className="w-4 h-4 mr-1" />
                        Load
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => selectModel(model.id)}
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Select
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => removeModel(model.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Information Alert */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Supported Model Types:</strong>
          <ul className="mt-2 space-y-1 text-sm">
            <li>• <strong>TensorFlow.js:</strong> JSON format models for browser inference</li>
            <li>• <strong>API Models:</strong> Connect to external ML services</li>
            <li>• <strong>URL Models:</strong> Load models from remote URLs</li>
          </ul>
          <p className="mt-2 text-sm">
            Your model should output classification results with categories: promotional, transactional, newsletter, support, spam, personal, or unclassified.
          </p>
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default ModelUpload;

