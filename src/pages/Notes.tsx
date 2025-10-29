import { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Search, StickyNote, Book, Sparkles, Loader2, History, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";

interface Note {
  id: string;
  content: string;
  note_type: string;
  page_number: number | null;
  created_at: string;
  books: {
    id: string;
    title: string;
    author: string | null;
    cover_url: string | null;
  };
}

interface AIInsight {
  id: string;
  book_id: string;
  prompt_type: string;
  custom_instruction: string | null;
  generated_content: string;
  created_at: string;
  books: {
    id: string;
    title: string;
    author: string | null;
    cover_url: string | null;
  };
}

const Notes = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [filteredNotes, setFilteredNotes] = useState<Note[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [selectedBook, setSelectedBook] = useState<string>("");
  const [books, setBooks] = useState<Array<{ id: string; title: string; author: string | null }>>([]);
  const [promptType, setPromptType] = useState<string>("summary");
  const [customInstruction, setCustomInstruction] = useState("");
  const [aiResult, setAiResult] = useState<string>("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [savedInsights, setSavedInsights] = useState<AIInsight[]>([]);
  const [currentInsightId, setCurrentInsightId] = useState<string | null>(null);

  useEffect(() => {
    fetchNotes();
    fetchBooks();
    fetchSavedInsights();
  }, []);

  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = notes.filter(
        (note) =>
          note.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
          note.books.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          note.books.author?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredNotes(filtered);
    } else {
      setFilteredNotes(notes);
    }
  }, [searchQuery, notes]);

  const fetchNotes = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("notes")
        .select(`
          id,
          content,
          note_type,
          page_number,
          created_at,
          books (
            id,
            title,
            author,
            cover_url
          )
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setNotes(data || []);
      setFilteredNotes(data || []);
    } catch (error: any) {
      toast.error("Failed to load notes");
    } finally {
      setLoading(false);
    }
  };

  const fetchBooks = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("user_books")
        .select(`
          book_id,
          books (
            id,
            title,
            author
          )
        `)
        .eq("user_id", user.id);

      if (error) throw error;
      
      const bookList = data?.map(ub => ({
        id: ub.books.id,
        title: ub.books.title,
        author: ub.books.author
      })) || [];
      
      setBooks(bookList);
    } catch (error: any) {
      toast.error("Failed to load books");
    }
  };

  const fetchSavedInsights = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("ai_insights")
        .select(`
          id,
          book_id,
          prompt_type,
          custom_instruction,
          generated_content,
          created_at,
          books (
            id,
            title,
            author,
            cover_url
          )
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setSavedInsights(data || []);
    } catch (error: any) {
      toast.error("Failed to load saved insights");
    }
  };

  const handleGenerateAI = async () => {
    if (!selectedBook) {
      toast.error("Please select a book");
      return;
    }

    if (promptType === 'custom' && !customInstruction.trim()) {
      toast.error("Please provide custom instructions");
      return;
    }

    setAiLoading(true);
    setAiResult("");
    setCurrentInsightId(null);

    try {
      const { data, error } = await supabase.functions.invoke('process-notes-ai', {
        body: {
          bookId: selectedBook,
          promptType,
          customInstruction: promptType === 'custom' ? customInstruction : undefined
        }
      });

      if (error) throw error;

      if (data?.content) {
        setAiResult(data.content);
        toast.success("AI content generated successfully!");
      } else {
        throw new Error("No content generated");
      }
    } catch (error: any) {
      console.error('AI generation error:', error);
      toast.error(error.message || "Failed to generate AI content");
    } finally {
      setAiLoading(false);
    }
  };

  const handleSaveInsight = async () => {
    if (!selectedBook || !aiResult) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("ai_insights")
        .insert({
          user_id: user.id,
          book_id: selectedBook,
          prompt_type: promptType,
          custom_instruction: promptType === 'custom' ? customInstruction : null,
          generated_content: aiResult
        });

      if (error) throw error;

      toast.success("Insight saved successfully!");
      setAiResult("");
      setCustomInstruction("");
      setDialogOpen(false);
      fetchSavedInsights();
    } catch (error: any) {
      toast.error("Failed to save insight");
    }
  };

  const handleDeleteInsight = async (insightId: string) => {
    try {
      const { error } = await supabase
        .from("ai_insights")
        .delete()
        .eq("id", insightId);

      if (error) throw error;

      toast.success("Insight deleted");
      fetchSavedInsights();
    } catch (error: any) {
      toast.error("Failed to delete insight");
    }
  };

  const getPromptTitle = (type: string) => {
    const titles: Record<string, string> = {
      summary: 'Summary',
      takeaways: 'Key Takeaways',
      action_plan: 'Action Plan',
      custom: 'Custom'
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

  return (
    <div className="min-h-screen gradient-warm">
      <Navbar />
      <main className="container mx-auto px-4 py-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Notes & Insights</h1>
            <p className="text-muted-foreground">Your reading notes, quotes, and AI-generated insights</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Sparkles className="h-4 w-4" />
                Generate AI Insights
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Generate AI Insights</DialogTitle>
                <DialogDescription>
                  Use AI to create personalized summaries, key takeaways, or action plans based on your notes
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="book-select">Select Book</Label>
                  <Select value={selectedBook} onValueChange={setSelectedBook}>
                    <SelectTrigger id="book-select">
                      <SelectValue placeholder="Choose a book" />
                    </SelectTrigger>
                    <SelectContent>
                      {books.map(book => (
                        <SelectItem key={book.id} value={book.id}>
                          {book.title} {book.author && `by ${book.author}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="prompt-type">Output Type</Label>
                  <Select value={promptType} onValueChange={setPromptType}>
                    <SelectTrigger id="prompt-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="summary">Personalized Summary</SelectItem>
                      <SelectItem value="takeaways">Key Takeaways</SelectItem>
                      <SelectItem value="action_plan">Action Plan</SelectItem>
                      <SelectItem value="custom">Custom Instructions</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {promptType === 'custom' && (
                  <div className="space-y-2">
                    <Label htmlFor="custom-instruction">Your Instructions</Label>
                    <Textarea
                      id="custom-instruction"
                      value={customInstruction}
                      onChange={(e) => setCustomInstruction(e.target.value)}
                      placeholder="Tell the AI what you want to know about this book..."
                      rows={4}
                    />
                  </div>
                )}

                <Button 
                  onClick={handleGenerateAI} 
                  disabled={aiLoading || !selectedBook}
                  className="w-full"
                >
                  {aiLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generate
                    </>
                  )}
                </Button>

                {aiResult && (
                  <Card>
                    <CardHeader>
                      <CardTitle>AI Generated Content</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="prose prose-sm max-w-none whitespace-pre-wrap">
                        {aiResult}
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={handleSaveInsight} className="flex-1">
                          Save Insight
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={() => {
                            setAiResult("");
                            setCustomInstruction("");
                          }}
                          className="flex-1"
                        >
                          Discard
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="notes" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="notes">
              <StickyNote className="h-4 w-4 mr-2" />
              Notes
            </TabsTrigger>
            <TabsTrigger value="insights">
              <History className="h-4 w-4 mr-2" />
              Saved Insights
            </TabsTrigger>
          </TabsList>

          <TabsContent value="notes" className="space-y-4 mt-6">

            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search notes by content or book..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {filteredNotes.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <StickyNote className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>{searchQuery ? "No notes found matching your search" : "No notes yet"}</p>
                <p className="text-sm mt-2">
                  {!searchQuery && "Start adding notes while reading your books"}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredNotes.map((note) => (
              <Card key={note.id} className="shadow-book hover:shadow-reading transition-smooth">
                <CardContent className="p-6">
                  <div className="flex gap-4">
                    <Link to={`/book/${note.books.id}`} className="flex-shrink-0">
                      <div className="w-16 h-24 bg-muted rounded flex items-center justify-center overflow-hidden">
                        {note.books.cover_url ? (
                          <img
                            src={note.books.cover_url}
                            alt={note.books.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Book className="h-8 w-8 text-muted-foreground" />
                        )}
                      </div>
                    </Link>
                    
                    <div className="flex-1 space-y-2">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <Link
                            to={`/book/${note.books.id}`}
                            className="font-semibold hover:text-primary transition-colors"
                          >
                            {note.books.title}
                          </Link>
                          {note.books.author && (
                            <p className="text-sm text-muted-foreground">{note.books.author}</p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Badge variant={note.note_type === "quote" ? "default" : "secondary"}>
                            {note.note_type === "quote" ? "Quote" : "Note"}
                          </Badge>
                          {note.page_number && (
                            <Badge variant="outline">Page {note.page_number}</Badge>
                          )}
                        </div>
                      </div>
                      
                      <p className="text-sm leading-relaxed">{note.content}</p>
                      
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(note.created_at), "MMM d, yyyy 'at' h:mm a")}
                      </p>
                    </div>
                  </div>
                </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="insights" className="space-y-4 mt-6">
            {savedInsights.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No saved insights yet</p>
                <p className="text-sm mt-2">
                  Generate AI insights from your notes and save them here
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {savedInsights.map((insight) => (
                  <Card key={insight.id} className="shadow-book hover:shadow-reading transition-smooth">
                    <CardContent className="p-6">
                      <div className="space-y-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex gap-4 flex-1">
                            <Link to={`/book/${insight.books.id}`} className="flex-shrink-0">
                              <div className="w-16 h-24 bg-muted rounded flex items-center justify-center overflow-hidden">
                                {insight.books.cover_url ? (
                                  <img
                                    src={insight.books.cover_url}
                                    alt={insight.books.title}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <Book className="h-8 w-8 text-muted-foreground" />
                                )}
                              </div>
                            </Link>
                            
                            <div className="flex-1 space-y-2">
                              <div>
                                <Link
                                  to={`/book/${insight.books.id}`}
                                  className="font-semibold hover:text-primary transition-colors"
                                >
                                  {insight.books.title}
                                </Link>
                                {insight.books.author && (
                                  <p className="text-sm text-muted-foreground">{insight.books.author}</p>
                                )}
                              </div>
                              
                              <div className="flex gap-2">
                                <Badge variant="default">
                                  {getPromptTitle(insight.prompt_type)}
                                </Badge>
                              </div>

                              {insight.custom_instruction && (
                                <div className="text-sm text-muted-foreground italic">
                                  "{insight.custom_instruction}"
                                </div>
                              )}
                            </div>
                          </div>

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteInsight(insight.id)}
                            className="flex-shrink-0"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        
                        <div className="prose prose-sm max-w-none whitespace-pre-wrap text-sm leading-relaxed">
                          {insight.generated_content}
                        </div>
                        
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(insight.created_at), "MMM d, yyyy 'at' h:mm a")}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Notes;
