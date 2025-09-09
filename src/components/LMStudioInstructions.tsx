import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle, ExternalLink } from 'lucide-react';

interface LMStudioInstructionsProps {
  onCheckConnection?: () => void;
  isChecking?: boolean;
}

export const LMStudioInstructions: React.FC<LMStudioInstructionsProps> = ({
  onCheckConnection,
  isChecking = false
}) => {
  return (
    <Alert className="border-orange-200 bg-orange-50">
      <AlertCircle className="h-4 w-4 text-orange-600" />
      <AlertTitle className="text-orange-800">LM Studio Setup Required</AlertTitle>
      <AlertDescription className="text-orange-700 mt-2">
        <p className="mb-3">
          To use AI chat features, you need to run LM Studio locally on your computer. Here's how:
        </p>

        <ol className="list-decimal list-inside space-y-2 mb-4 text-sm">
          <li>
            <strong>Download LM Studio:</strong> Visit{' '}
            <a
              href="https://lmstudio.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="text-orange-800 hover:text-orange-900 underline inline-flex items-center gap-1"
            >
              lmstudio.ai <ExternalLink className="h-3 w-3" />
            </a>{' '}
            and download the application
          </li>
          <li>
            <strong>Download a model:</strong> In LM Studio, go to the "My Models" tab and download a GPT model
            (e.g., GPT-2, GPT-J, or Llama models work well)
          </li>
          <li>
            <strong>Load the model:</strong> Go to "Chat" tab, select your downloaded model, and click "Load Model"
          </li>
          <li>
            <strong>Start local server:</strong> Go to "Local Server" tab and click "Start Server"
          </li>
          <li>
            <strong>Verify connection:</strong> Ensure the server is running on{' '}
            <code className="bg-orange-100 px-1 rounded text-xs">http://127.0.0.1:1234</code>
          </li>
        </ol>

        <div className="flex items-center gap-2">
          {onCheckConnection && (
            <Button
              variant="outline"
              size="sm"
              onClick={onCheckConnection}
              disabled={isChecking}
              className="text-orange-800 border-orange-300 hover:bg-orange-100"
            >
              {isChecking ? 'Checking...' : 'Check Connection'}
            </Button>
          )}
          <p className="text-xs text-orange-600">
            <strong>Note:</strong> Each user runs their own LM Studio instance locally.
          </p>
        </div>
      </AlertDescription>
    </Alert>
  );
};
