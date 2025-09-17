import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Mail, Trash2, Settings } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface SenderAccount {
  id: string;
  email: string;
  provider: string;
  dailyLimit: number;
}

interface CampaignData {
  name: string;
  description: string;
  senderAccounts: SenderAccount[];
  contacts: any[];
  sequence: any[];
}

interface SenderAccountsProps {
  data: CampaignData;
  onUpdate: (data: Partial<CampaignData>) => void;
}

const SenderAccounts = ({ data, onUpdate }: SenderAccountsProps) => {
  const [accounts, setAccounts] = useState<SenderAccount[]>(data.senderAccounts || []);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newAccount, setNewAccount] = useState({
    email: "",
    provider: "",
    dailyLimit: 50
  });

  useEffect(() => {
    onUpdate({ senderAccounts: accounts });
  }, [accounts, onUpdate]);

  const handleAddAccount = () => {
    if (newAccount.email && newAccount.provider) {
      // Check if email already exists
      const emailExists = accounts.some(account => 
        account.email.toLowerCase() === newAccount.email.toLowerCase()
      );
      
      if (emailExists) {
        toast({
          title: "Duplicate Email",
          description: "This email address is already added as a sender account.",
          variant: "destructive",
        });
        return;
      }
      
      const account: SenderAccount = {
        id: Date.now().toString(),
        email: newAccount.email,
        provider: newAccount.provider,
        dailyLimit: newAccount.dailyLimit
      };
      setAccounts([...accounts, account]);
      setNewAccount({ email: "", provider: "", dailyLimit: 50 });
      setShowAddForm(false);
    }
  };

  const handleRemoveAccount = (id: string) => {
    setAccounts(accounts.filter(account => account.id !== id));
  };

  const totalDailyLimit = accounts.reduce((sum, account) => sum + account.dailyLimit, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Email Sender Accounts</h3>
          <p className="text-sm text-muted-foreground">
            Add email accounts to send campaigns from. Emails will be distributed across all accounts.
          </p>
        </div>
        <Button 
          onClick={() => setShowAddForm(true)}
          className="bg-gradient-primary text-primary-foreground hover:opacity-90"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Account
        </Button>
      </div>

      {/* Add Account Form */}
      {showAddForm && (
        <Card className="bg-gradient-card border-border">
          <CardHeader>
            <CardTitle className="text-base text-foreground">Add New Sender Account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sender-email" className="text-sm font-medium text-foreground">
                  Email Address *
                </Label>
                <Input
                  id="sender-email"
                  type="email"
                  placeholder="sender@company.com"
                  value={newAccount.email}
                  onChange={(e) => setNewAccount({...newAccount, email: e.target.value})}
                  className="bg-background border-border text-foreground"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="provider" className="text-sm font-medium text-foreground">
                  Email Provider *
                </Label>
                <Select value={newAccount.provider} onValueChange={(value) => setNewAccount({...newAccount, provider: value})}>
                  <SelectTrigger className="bg-background border-border text-foreground">
                    <SelectValue placeholder="Select provider" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gmail">Gmail</SelectItem>
                    <SelectItem value="outlook">Outlook</SelectItem>
                    <SelectItem value="smtp">Custom SMTP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="daily-limit" className="text-sm font-medium text-foreground">
                Daily Sending Limit
              </Label>
              <Input
                id="daily-limit"
                type="number"
                min="1"
                max="500"
                value={newAccount.dailyLimit}
                onChange={(e) => setNewAccount({...newAccount, dailyLimit: parseInt(e.target.value) || 50})}
                className="bg-background border-border text-foreground"
              />
              <p className="text-xs text-muted-foreground">
                Recommended: 50-100 emails per day per account to maintain good reputation
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAddForm(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleAddAccount}
                disabled={!newAccount.email || !newAccount.provider}
                className="bg-gradient-primary text-primary-foreground hover:opacity-90"
              >
                Add Account
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Existing Accounts */}
      <div className="space-y-4">
        {accounts.length > 0 ? (
          <>
            {accounts.map((account) => (
              <Card key={account.id} className="bg-gradient-card border-border">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                        <Mail className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-medium text-foreground">{account.email}</h4>
                        <p className="text-sm text-muted-foreground capitalize">
                          {account.provider} • {account.dailyLimit} emails/day
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm">
                        <Settings className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleRemoveAccount(account.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Summary */}
            <Card className="bg-muted/50 border-border">
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Total Accounts:</span>
                    <span className="ml-2 font-medium text-foreground">{accounts.length}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Daily Limit:</span>
                    <span className="ml-2 font-medium text-foreground">{totalDailyLimit} emails</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Distribution:</span>
                    <span className="ml-2 font-medium text-foreground">Round-robin</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <Card className="py-12 bg-gradient-card border-border">
            <CardContent className="text-center">
              <Mail className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No Sender Accounts</h3>
              <p className="text-muted-foreground mb-4">
                Add at least one sender account to send your campaigns
              </p>
              <Button 
                onClick={() => setShowAddForm(true)}
                className="bg-gradient-primary text-primary-foreground hover:opacity-90"
              >
                Add Your First Account
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default SenderAccounts;
