import { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Shield, Save, Key } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { aiPromptSchema } from "@/lib/validation";

interface AIPrompt {
  id: string;
  prompt_type: string;
  system_prompt: string;
  description: string | null;
}

const Admin = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [prompts, setPrompts] = useState<AIPrompt[]>([]);
  const [editingPrompts, setEditingPrompts] = useState<Record<string, string>>({});

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }

      const { data: roles, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .single();

      if (error || !roles) {
        toast.error("Access denied - Admin only");
        navigate('/');
        return;
      }

      setIsAdmin(true);
      fetchPrompts();
    } catch (error) {
      toast.error("Failed to verify admin access");
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const fetchPrompts = async () => {
    try {
      const { data, error } = await supabase
        .from('ai_prompts')
        .select('*')
        .order('prompt_type');

      if (error) throw error;
      
      setPrompts(data || []);
      const initialEdits: Record<string, string> = {};
      data?.forEach(prompt => {
        initialEdits[prompt.id] = prompt.system_prompt;
      });
      setEditingPrompts(initialEdits);
    } catch (error: any) {
      toast.error("Failed to load prompts");
    }
  };

  const handleSavePrompt = async (promptId: string) => {
    // Validate prompt content
    const validation = aiPromptSchema.safeParse({
      systemPrompt: editingPrompts[promptId],
    });

    if (!validation.success) {
      const firstError = validation.error.errors[0];
      toast.error(firstError.message);
      return;
    }

    try {
      const { error } = await supabase
        .from('ai_prompts')
        .update({ system_prompt: validation.data.systemPrompt })
        .eq('id', promptId);

      if (error) throw error;

      toast.success("Prompt updated successfully");
      fetchPrompts();
    } catch (error: any) {
      toast.error("Failed to update prompt");
    }
  };

  const getPromptTitle = (type: string) => {
    const titles: Record<string, string> = {
      summary: 'Personalized Summary',
      takeaways: 'Key Takeaways',
      action_plan: 'Action Plan',
      custom: 'Custom Instructions'
    };
    return titles[type] || type;
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="container mx-auto px-4 py-8 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen gradient-warm">
      <Navbar />
      <main className="container mx-auto px-4 py-8 space-y-8">
        <div className="flex items-center gap-3">
          <Shield className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground">Manage AI prompts and settings</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              <CardTitle>API Configuration</CardTitle>
            </div>
            <CardDescription>
              OpenAI API key is configured via Supabase secrets
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              To update the OpenAI API key, contact your system administrator to update the OPENAI_API_KEY secret in Supabase.
            </p>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <h2 className="text-2xl font-semibold">AI System Prompts</h2>
          {prompts.map((prompt) => (
            <Card key={prompt.id}>
              <CardHeader>
                <CardTitle>{getPromptTitle(prompt.prompt_type)}</CardTitle>
                {prompt.description && (
                  <CardDescription>{prompt.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor={`prompt-${prompt.id}`}>System Prompt</Label>
                  <Textarea
                    id={`prompt-${prompt.id}`}
                    value={editingPrompts[prompt.id] || ''}
                    onChange={(e) => setEditingPrompts({
                      ...editingPrompts,
                      [prompt.id]: e.target.value
                    })}
                    rows={6}
                    className="mt-2"
                  />
                </div>
                <Button 
                  onClick={() => handleSavePrompt(prompt.id)}
                  className="w-full sm:w-auto"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Prompt
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
};

export default Admin;