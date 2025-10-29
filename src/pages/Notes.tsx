import { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Search, StickyNote, Book } from "lucide-react";
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

const Notes = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [filteredNotes, setFilteredNotes] = useState<Note[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotes();
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
        <div>
          <h1 className="text-3xl font-bold mb-2">All Notes</h1>
          <p className="text-muted-foreground">Your reading notes and quotes from all books</p>
        </div>

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
      </main>
    </div>
  );
};

export default Notes;
