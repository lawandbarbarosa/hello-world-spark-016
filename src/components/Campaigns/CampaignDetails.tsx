import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface CampaignData {
  name: string;
  description: string;
  senderAccounts: any[];
  contacts: any[];
  sequence: any[];
}

interface CampaignDetailsProps {
  data: CampaignData;
  onUpdate: (data: Partial<CampaignData>) => void;
}

const CampaignDetails = ({ data, onUpdate }: CampaignDetailsProps) => {
  const [name, setName] = useState(data.name || "");
  const [description, setDescription] = useState(data.description || "");

  useEffect(() => {
    onUpdate({ name, description });
  }, [name, description, onUpdate]);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="campaign-name" className="text-sm font-medium text-foreground">
          Campaign Name *
        </Label>
        <Input
          id="campaign-name"
          placeholder="e.g., Product Launch Outreach"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="bg-background border-border text-foreground"
        />
        <p className="text-xs text-muted-foreground">
          Choose a descriptive name for your campaign
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="campaign-description" className="text-sm font-medium text-foreground">
          Description
        </Label>
        <Textarea
          id="campaign-description"
          placeholder="Describe the purpose and goals of this campaign..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          className="bg-background border-border text-foreground"
        />
        <p className="text-xs text-muted-foreground">
          Optional: Add a description to help you remember this campaign's purpose
        </p>
      </div>

      <div className="bg-muted p-4 rounded-lg">
        <h3 className="text-sm font-medium text-foreground mb-2">Campaign Overview</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Name:</span>
            <span className="ml-2 text-foreground">{name || "Not set"}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Description:</span>
            <span className="ml-2 text-foreground">{description || "Not set"}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CampaignDetails;