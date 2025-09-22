import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface TemplateTestProps {
  contacts: any[];
}

const TemplateTest = ({ contacts }: TemplateTestProps) => {
  // Test template replacement
  const testTemplate = "Hi {{firstName}}, I see you're from {{city}}. Your company {{company}} looks great!";
  
  const replaceVariables = (text: string, contact: any) => {
    let result = text;
    Object.keys(contact).forEach(key => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      const value = contact[key] || `[${key}]`;
      result = result.replace(regex, String(value));
    });
    return result;
  };

  if (!contacts || contacts.length === 0) {
    return (
      <Card className="border-yellow-200 bg-yellow-50">
        <CardHeader>
          <CardTitle className="text-yellow-800">Template Test - No Contacts</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-yellow-700">No contacts available for testing. Please upload a CSV file first.</p>
        </CardContent>
      </Card>
    );
  }

  const firstContact = contacts[0];
  const processedTemplate = replaceVariables(testTemplate, firstContact);

  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardHeader>
        <CardTitle className="text-blue-800">Template Test</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h4 className="font-medium text-blue-800 mb-2">Test Template:</h4>
          <p className="text-sm bg-white p-2 rounded border font-mono">
            {testTemplate}
          </p>
        </div>
        
        <div>
          <h4 className="font-medium text-blue-800 mb-2">First Contact Data:</h4>
          <div className="bg-white p-2 rounded border">
            <pre className="text-xs overflow-auto">
              {JSON.stringify(firstContact, null, 2)}
            </pre>
          </div>
        </div>
        
        <div>
          <h4 className="font-medium text-blue-800 mb-2">Processed Result:</h4>
          <p className="text-sm bg-white p-2 rounded border">
            {processedTemplate}
          </p>
        </div>
        
        <div>
          <h4 className="font-medium text-blue-800 mb-2">Available Fields:</h4>
          <div className="flex flex-wrap gap-1">
            {Object.keys(firstContact).map(key => (
              <span key={key} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                {`{{${key}}}`}
              </span>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TemplateTest;
