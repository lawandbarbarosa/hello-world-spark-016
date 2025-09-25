import React from 'react';
import TestReplyTracking from '@/components/Replies/TestReplyTracking';

const TestReplyPage = () => {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Reply Tracking Test
          </h1>
          <p className="text-muted-foreground">
            Test and verify your email reply tracking functionality
          </p>
        </div>
        
        <div className="flex justify-center">
          <TestReplyTracking />
        </div>
      </div>
    </div>
  );
};

export default TestReplyPage;