import React, { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Bold, 
  Italic, 
  Underline, 
  AlignLeft, 
  AlignCenter, 
  AlignRight,
  List,
  ListOrdered,
  Image,
  Link,
  Type,
  Palette,
  Upload
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  mergeTags?: string[];
  onInsertMergeTag?: (tag: string) => void;
  className?: string;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = "Enter your email content...",
  mergeTags = [],
  onInsertMergeTag,
  className = ""
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [isImageUploading, setIsImageUploading] = useState(false);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      // Highlight placeholders in the content
      const highlightedValue = value.replace(/\{\{([^}]+)\}\}/g, '<span style="color: #8b5cf6; background-color: #f3f0ff; padding: 1px 3px; border-radius: 3px; font-weight: 500;">{{$1}}</span>');
      editorRef.current.innerHTML = highlightedValue;
    }
  }, [value]);

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    handleContentChange();
  };

  const handleContentChange = () => {
    if (editorRef.current) {
      // Get the raw content without highlighting spans
      const rawContent = editorRef.current.innerText || editorRef.current.textContent || '';
      // Convert back to HTML with placeholders
      const content = rawContent.replace(/\{\{([^}]+)\}\}/g, '{{$1}}');
      onChange(content);
      
      // Re-apply highlighting
      const highlightedContent = content.replace(/\{\{([^}]+)\}\}/g, '<span style="color: #8b5cf6; background-color: #f3f0ff; padding: 1px 3px; border-radius: 3px; font-weight: 500;">{{$1}}</span>');
      if (editorRef.current.innerHTML !== highlightedContent) {
        editorRef.current.innerHTML = highlightedContent;
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
    handleContentChange();
  };

  const insertImage = (url: string, alt: string = '') => {
    const img = `<img src="${url}" alt="${alt}" style="max-width: 100%; height: auto; border-radius: 4px; margin: 8px 0;" />`;
    document.execCommand('insertHTML', false, img);
    handleContentChange();
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image smaller than 5MB",
        variant: "destructive",
      });
      return;
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file",
        variant: "destructive",
      });
      return;
    }

    setIsImageUploading(true);
    
    try {
      // Convert to base64 for now (in production, you'd upload to a CDN)
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target?.result as string;
        insertImage(base64, file.name);
        setIsImageUploading(false);
        toast({
          title: "Image uploaded",
          description: "Image has been added to your email",
        });
      };
      reader.readAsDataURL(file);
    } catch (error) {
      setIsImageUploading(false);
      toast({
        title: "Upload failed",
        description: "Failed to upload image. Please try again.",
        variant: "destructive",
      });
    }
  };

  const insertMergeTag = (tag: string) => {
    const mergeTag = `{{${tag}}}`;
    document.execCommand('insertText', false, mergeTag);
    handleContentChange();
    onInsertMergeTag?.(tag);
  };

  const ToolbarButton: React.FC<{
    onClick: () => void;
    icon: React.ReactNode;
    title: string;
    active?: boolean;
  }> = ({ onClick, icon, title, active = false }) => (
    <Button
      type="button"
      variant={active ? "default" : "ghost"}
      size="sm"
      onClick={onClick}
      title={title}
      className="h-8 w-8 p-0"
    >
      {icon}
    </Button>
  );

  return (
    <div className={`border border-border rounded-lg ${className}`}>
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 border-b border-border bg-muted/30">
        {/* Text Formatting */}
        <div className="flex items-center gap-1 border-r border-border pr-2">
          <ToolbarButton
            onClick={() => execCommand('bold')}
            icon={<Bold className="w-4 h-4" />}
            title="Bold"
          />
          <ToolbarButton
            onClick={() => execCommand('italic')}
            icon={<Italic className="w-4 h-4" />}
            title="Italic"
          />
          <ToolbarButton
            onClick={() => execCommand('underline')}
            icon={<Underline className="w-4 h-4" />}
            title="Underline"
          />
        </div>

        {/* Font Size */}
        <div className="flex items-center gap-1 border-r border-border pr-2">
          <Select onValueChange={(value) => execCommand('fontSize', value)}>
            <SelectTrigger className="w-20 h-8">
              <SelectValue placeholder="Size" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">8px</SelectItem>
              <SelectItem value="2">10px</SelectItem>
              <SelectItem value="3">12px</SelectItem>
              <SelectItem value="4">14px</SelectItem>
              <SelectItem value="5">16px</SelectItem>
              <SelectItem value="6">18px</SelectItem>
              <SelectItem value="7">24px</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Text Alignment */}
        <div className="flex items-center gap-1 border-r border-border pr-2">
          <ToolbarButton
            onClick={() => execCommand('justifyLeft')}
            icon={<AlignLeft className="w-4 h-4" />}
            title="Align Left"
          />
          <ToolbarButton
            onClick={() => execCommand('justifyCenter')}
            icon={<AlignCenter className="w-4 h-4" />}
            title="Align Center"
          />
          <ToolbarButton
            onClick={() => execCommand('justifyRight')}
            icon={<AlignRight className="w-4 h-4" />}
            title="Align Right"
          />
        </div>

        {/* Lists */}
        <div className="flex items-center gap-1 border-r border-border pr-2">
          <ToolbarButton
            onClick={() => execCommand('insertUnorderedList')}
            icon={<List className="w-4 h-4" />}
            title="Bullet List"
          />
          <ToolbarButton
            onClick={() => execCommand('insertOrderedList')}
            icon={<ListOrdered className="w-4 h-4" />}
            title="Numbered List"
          />
        </div>

        {/* Media */}
        <div className="flex items-center gap-1">
          <ToolbarButton
            onClick={() => fileInputRef.current?.click()}
            icon={<Upload className="w-4 h-4" />}
            title="Upload Image"
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />
          <ToolbarButton
            onClick={() => {
              const url = prompt('Enter image URL:');
              if (url) insertImage(url);
            }}
            icon={<Image className="w-4 h-4" />}
            title="Insert Image URL"
          />
        </div>
      </div>

      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleContentChange}
        onPaste={handlePaste}
        className="min-h-[200px] p-4 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-b-lg"
        style={{
          fontFamily: 'system-ui, -apple-system, sans-serif',
          fontSize: '14px',
          lineHeight: '1.5',
        }}
        data-placeholder={placeholder}
      />

      {/* Merge Tags */}
      {mergeTags.length > 0 && (
        <div className="border-t border-border p-3 bg-muted/20">
          <div className="flex items-center gap-2 mb-2">
            <Type className="w-4 h-4 text-muted-foreground" />
            <Label className="text-sm font-medium text-foreground">Merge Tags</Label>
          </div>
          <div className="flex flex-wrap gap-1">
            {mergeTags.map(tag => (
              <Badge
                key={tag}
                variant="outline"
                className="text-xs cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                onClick={() => insertMergeTag(tag)}
              >
                {`{{${tag}}}`}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Loading indicator for image upload */}
      {isImageUploading && (
        <div className="absolute inset-0 bg-background/80 flex items-center justify-center rounded-lg">
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            <span className="text-sm text-muted-foreground">Uploading image...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default RichTextEditor;
