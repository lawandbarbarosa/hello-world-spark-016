import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTheme } from '@/hooks/useTheme';
import { useSettings } from '@/hooks/useSettings';
import { toast } from 'sonner';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Loader2, Save, Settings as SettingsIcon, Sun, Moon, Monitor } from 'lucide-react';

const settingsSchema = z.object({
  // General Settings
  timezone: z.string().min(1, 'Timezone is required'),
  theme_mode: z.enum(['light', 'dark', 'auto']),
  
  // Sending Settings
  daily_send_limit: z.number().min(1, 'Daily limit must be at least 1').max(10000, 'Daily limit cannot exceed 10,000'),
  send_time_start: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'),
  send_time_end: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'),
  reply_handling_enabled: z.boolean(),
  
  // Contact & Personalization Settings
  fallback_first_name: z.string().default('there'),
  fallback_company: z.string().default('your company'),
  
  // Email Composition Settings
  default_signature: z.string(),
  from_name_format: z.enum(['first_last', 'company_team']),
  
  // Security & Compliance
  unsubscribe_link_enabled: z.boolean(),
  legal_disclaimer: z.string(),
});

type SettingsFormData = z.infer<typeof settingsSchema>;

const timezones = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver', 
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Australia/Sydney',
];

const Settings = () => {
  const { theme, setTheme } = useTheme();
  const { settings, loading, updateSettings } = useSettings();
  const [saving, setSaving] = useState(false);

  const form = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      timezone: 'UTC',
      theme_mode: 'light',
      daily_send_limit: 50,
      send_time_start: '08:00',
      send_time_end: '18:00',
      reply_handling_enabled: true,
      fallback_first_name: 'there',
      fallback_company: 'your company',
      default_signature: '',
      from_name_format: 'first_last',
      unsubscribe_link_enabled: true,
      legal_disclaimer: '',
    },
  });

  // Update form when settings load
  useEffect(() => {
    if (settings) {
      form.reset({
        timezone: settings.timezone,
        theme_mode: settings.theme_mode,
        daily_send_limit: settings.daily_send_limit,
        send_time_start: settings.send_time_start,
        send_time_end: settings.send_time_end,
        reply_handling_enabled: settings.reply_handling_enabled,
        fallback_first_name: settings.fallback_merge_tags.first_name,
        fallback_company: settings.fallback_merge_tags.company,
        default_signature: settings.default_signature,
        from_name_format: settings.from_name_format,
        unsubscribe_link_enabled: settings.unsubscribe_link_enabled,
        legal_disclaimer: settings.legal_disclaimer,
      });
    }
  }, [settings, form]);

  const onSubmit = async (data: SettingsFormData) => {
    setSaving(true);
    try {
      await updateSettings({
        timezone: data.timezone,
        theme_mode: data.theme_mode,
        daily_send_limit: data.daily_send_limit,
        send_time_start: data.send_time_start,
        send_time_end: data.send_time_end,
        reply_handling_enabled: data.reply_handling_enabled,
        fallback_merge_tags: {
          first_name: data.fallback_first_name,
          company: data.fallback_company,
        },
        default_signature: data.default_signature,
        from_name_format: data.from_name_format,
        unsubscribe_link_enabled: data.unsubscribe_link_enabled,
        legal_disclaimer: data.legal_disclaimer,
      });

      // Update theme immediately
      if (data.theme_mode !== theme) {
        setTheme(data.theme_mode);
      }

      toast.success('Settings saved successfully');
    } catch (error) {
      toast.error('Failed to save settings');
      console.error('Error saving settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const getThemeIcon = (themeMode: string) => {
    switch (themeMode) {
      case 'light': return <Sun className="h-4 w-4" />;
      case 'dark': return <Moon className="h-4 w-4" />;
      case 'auto': return <Monitor className="h-4 w-4" />;
      default: return <Sun className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <SettingsIcon className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* General Settings */}
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>
                Configure basic preferences for your account
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="timezone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Timezone</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select timezone" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {timezones.map((tz) => (
                          <SelectItem key={tz} value={tz}>
                            {tz}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Default timezone for campaign scheduling
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="theme_mode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Theme Mode</FormLabel>
                    <Select 
                      onValueChange={(value) => {
                        field.onChange(value);
                        // Apply theme immediately for preview
                        setTheme(value as 'light' | 'dark' | 'auto');
                      }} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <div className="flex items-center gap-2">
                            {getThemeIcon(field.value)}
                            <SelectValue placeholder="Select theme" />
                          </div>
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="light">
                          <div className="flex items-center gap-2">
                            <Sun className="h-4 w-4" />
                            Light
                          </div>
                        </SelectItem>
                        <SelectItem value="dark">
                          <div className="flex items-center gap-2">
                            <Moon className="h-4 w-4" />
                            Dark
                          </div>
                        </SelectItem>
                        <SelectItem value="auto">
                          <div className="flex items-center gap-2">
                            <Monitor className="h-4 w-4" />
                            Auto (System)
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Choose your preferred theme mode. Auto follows your system preference.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Sending Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Sending Settings</CardTitle>
              <CardDescription>
                Control email sending behavior and limits
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="daily_send_limit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Daily Send Limit</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={10000}
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                      />
                    </FormControl>
                    <FormDescription>
                      Maximum emails per day per sender account (1-10,000)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="send_time_start"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Send Time Start</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormDescription>
                        Earliest time to send emails
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="send_time_end"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Send Time End</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormDescription>
                        Latest time to send emails
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="reply_handling_enabled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Reply Handling</FormLabel>
                      <FormDescription>
                        Stop follow-ups when recipient replies
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Contact & Personalization Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Contact & Personalization Settings</CardTitle>
              <CardDescription>
                Configure default values for email personalization
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="fallback_first_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fallback First Name</FormLabel>
                      <FormControl>
                        <Input placeholder="there" {...field} />
                      </FormControl>
                      <FormDescription>
                        Used when first_name merge tag is empty
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="fallback_company"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fallback Company</FormLabel>
                      <FormControl>
                        <Input placeholder="your company" {...field} />
                      </FormControl>
                      <FormDescription>
                        Used when company merge tag is empty
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Email Composition Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Email Composition Settings</CardTitle>
              <CardDescription>
                Configure default email composition options
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="default_signature"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Default Signature</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Best regards,&#10;Your Name&#10;Your Company"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      This signature will be automatically added to all outgoing emails
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="from_name_format"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>From Name Format</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select format" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="first_last">First Last</SelectItem>
                        <SelectItem value="company_team">Company Team</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      How the sender name appears in emails
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Security & Compliance */}
          <Card>
            <CardHeader>
              <CardTitle>Security & Compliance</CardTitle>
              <CardDescription>
                Configure security and compliance settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="unsubscribe_link_enabled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Unsubscribe Link</FormLabel>
                      <FormDescription>
                        Automatically include unsubscribe link in all campaigns
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="legal_disclaimer"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Legal Disclaimer</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="This email was sent to you because you opted in to receive communications..."
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      This disclaimer will be appended to all emails
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" disabled={saving} className="min-w-32">
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Settings
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default Settings;