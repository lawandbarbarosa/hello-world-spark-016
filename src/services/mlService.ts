// ML Service for Email Classification
// This service handles different types of ML models for email classification

export interface EmailFeatures {
  subject: string;
  content: string;
  sender: string;
  recipient?: string;
  timestamp?: string;
  attachments?: boolean;
  links?: string[];
}

export interface ClassificationResult {
  category: string;
  confidence: number;
  probabilities?: Record<string, number>;
  model_version?: string;
  processing_time?: number;
}

export interface MLModel {
  name: string;
  version: string;
  type: 'tensorflow' | 'pytorch' | 'sklearn' | 'custom' | 'api';
  isLoaded: boolean;
  load: () => Promise<void>;
  predict: (features: EmailFeatures) => Promise<ClassificationResult>;
  preprocess: (features: EmailFeatures) => any;
}

// Available classification categories
export const CLASSIFICATION_CATEGORIES = [
  'promotional',
  'transactional', 
  'newsletter',
  'support',
  'spam',
  'personal',
  'unclassified'
] as const;

export type ClassificationCategory = typeof CLASSIFICATION_CATEGORIES[number];

class MLService {
  private models: Map<string, MLModel> = new Map();
  private activeModel: string | null = null;

  // Register a new ML model
  registerModel(modelId: string, model: MLModel): void {
    this.models.set(modelId, model);
    console.log(`ML Model registered: ${modelId} (${model.type})`);
  }

  // Set the active model for predictions
  setActiveModel(modelId: string): boolean {
    if (this.models.has(modelId)) {
      this.activeModel = modelId;
      console.log(`Active ML model set to: ${modelId}`);
      return true;
    }
    console.error(`Model ${modelId} not found`);
    return false;
  }

  // Get list of available models
  getAvailableModels(): Array<{id: string, name: string, version: string, type: string, isLoaded: boolean}> {
    return Array.from(this.models.entries()).map(([id, model]) => ({
      id,
      name: model.name,
      version: model.version,
      type: model.type,
      isLoaded: model.isLoaded
    }));
  }

  // Load a specific model
  async loadModel(modelId: string): Promise<boolean> {
    const model = this.models.get(modelId);
    if (!model) {
      console.error(`Model ${modelId} not found`);
      return false;
    }

    try {
      await model.load();
      console.log(`Model ${modelId} loaded successfully`);
      return true;
    } catch (error) {
      console.error(`Failed to load model ${modelId}:`, error);
      return false;
    }
  }

  // Classify an email using the active model
  async classifyEmail(features: EmailFeatures): Promise<ClassificationResult | null> {
    if (!this.activeModel) {
      console.error('No active model set');
      return null;
    }

    const model = this.models.get(this.activeModel);
    if (!model || !model.isLoaded) {
      console.error(`Active model ${this.activeModel} is not loaded`);
      return null;
    }

    try {
      const startTime = performance.now();
      const result = await model.predict(features);
      const processingTime = performance.now() - startTime;
      
      return {
        ...result,
        processing_time: processingTime
      };
    } catch (error) {
      console.error('Classification failed:', error);
      return null;
    }
  }

  // Batch classify multiple emails
  async classifyEmailsBatch(emails: EmailFeatures[]): Promise<ClassificationResult[]> {
    const results: ClassificationResult[] = [];
    
    for (const email of emails) {
      const result = await this.classifyEmail(email);
      if (result) {
        results.push(result);
      } else {
        // Fallback classification
        results.push({
          category: 'unclassified',
          confidence: 0.0,
          model_version: 'fallback'
        });
      }
    }
    
    return results;
  }

  // Get model statistics
  getModelStats(modelId: string): any {
    const model = this.models.get(modelId);
    if (!model) return null;

    return {
      name: model.name,
      version: model.version,
      type: model.type,
      isLoaded: model.isLoaded,
      isActive: this.activeModel === modelId
    };
  }
}

// Create singleton instance
export const mlService = new MLService();

// Example TensorFlow.js model implementation
export class TensorFlowModel implements MLModel {
  name: string;
  version: string;
  type: 'tensorflow' = 'tensorflow';
  isLoaded: boolean = false;
  private model: any = null;

  constructor(name: string, version: string) {
    this.name = name;
    this.version = version;
  }

  async load(): Promise<void> {
    try {
      // This would load your actual TensorFlow.js model
      // Example: this.model = await tf.loadLayersModel('/models/email-classifier.json');
      console.log(`Loading TensorFlow model: ${this.name}`);
      
      // Simulate model loading
      await new Promise(resolve => setTimeout(resolve, 1000));
      this.isLoaded = true;
      
      console.log(`TensorFlow model ${this.name} loaded successfully`);
    } catch (error) {
      console.error(`Failed to load TensorFlow model ${this.name}:`, error);
      throw error;
    }
  }

  preprocess(features: EmailFeatures): any {
    // Preprocess email features for the model
    const text = `${features.subject} ${features.content}`.toLowerCase();
    
    // This would include your actual preprocessing logic
    // e.g., tokenization, vectorization, etc.
    return {
      text: text,
      sender: features.sender,
      hasAttachments: features.attachments || false,
      linkCount: features.links?.length || 0
    };
  }

  async predict(features: EmailFeatures): Promise<ClassificationResult> {
    if (!this.isLoaded) {
      throw new Error('Model not loaded');
    }

    const processedFeatures = this.preprocess(features);
    
    // This would run your actual model prediction
    // Example: const prediction = this.model.predict(processedFeatures);
    
    // Mock prediction for demonstration
    const mockProbabilities = {
      promotional: Math.random() * 0.3,
      transactional: Math.random() * 0.3,
      newsletter: Math.random() * 0.2,
      support: Math.random() * 0.2,
      spam: Math.random() * 0.1,
      personal: Math.random() * 0.2,
      unclassified: Math.random() * 0.1
    };

    // Normalize probabilities
    const total = Object.values(mockProbabilities).reduce((sum, val) => sum + val, 0);
    Object.keys(mockProbabilities).forEach(key => {
      mockProbabilities[key] = mockProbabilities[key] / total;
    });

    // Get the category with highest probability
    const category = Object.entries(mockProbabilities).reduce((a, b) => 
      mockProbabilities[a[0]] > mockProbabilities[b[0]] ? a : b
    )[0] as ClassificationCategory;

    return {
      category,
      confidence: mockProbabilities[category],
      probabilities: mockProbabilities,
      model_version: this.version
    };
  }
}

// Example API-based model implementation
export class APIModel implements MLModel {
  name: string;
  version: string;
  type: 'api' = 'api';
  isLoaded: boolean = true; // API models are always "loaded"
  private apiEndpoint: string;

  constructor(name: string, version: string, apiEndpoint: string) {
    this.name = name;
    this.version = version;
    this.apiEndpoint = apiEndpoint;
  }

  async load(): Promise<void> {
    // API models don't need to be loaded
    this.isLoaded = true;
  }

  preprocess(features: EmailFeatures): any {
    return {
      subject: features.subject,
      content: features.content,
      sender: features.sender,
      recipient: features.recipient,
      timestamp: features.timestamp,
      attachments: features.attachments,
      links: features.links
    };
  }

  async predict(features: EmailFeatures): Promise<ClassificationResult> {
    const processedFeatures = this.preprocess(features);
    
    try {
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(processedFeatures)
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }

      const result = await response.json();
      return {
        category: result.category,
        confidence: result.confidence,
        probabilities: result.probabilities,
        model_version: this.version
      };
    } catch (error) {
      console.error('API prediction failed:', error);
      throw error;
    }
  }
}

export default mlService;

