import { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Search, StickyNote, Book, Trash2 } from "lucide-react";
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

interface BookWithNotes {
  bookId: string;
  bookTitle: string;
  bookAuthor: string | null;
  bookCover: string | null;
  notes: Note[];
}

const Notes = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [groupedNotes, setGroupedNotes] = useState<BookWithNotes[]>([]);
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
      groupNotesByBook(filtered);
    } else {
      groupNotesByBook(notes);
    }
  }, [searchQuery, notes]);

  const groupNotesByBook = (notesToGroup: Note[]) => {
    const grouped = notesToGroup.reduce((acc, note) => {
      const bookId = note.books.id;
      const existing = acc.find(b => b.bookId === bookId);
      
      if (existing) {
        existing.notes.push(note);
      } else {
        acc.push({
          bookId,
          bookTitle: note.books.title,
          bookAuthor: note.books.author,
          bookCover: note.books.cover_url,
          notes: [note]
        });
      }
      
      return acc;
    }, [] as BookWithNotes[]);

    setGroupedNotes(grouped);
  };

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
    } catch (error: any) {
      toast.error("Failed to load notes");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      const { error } = await supabase
        .from("notes")
        .delete()
        .eq("id", noteId);

      if (error) throw error;

      toast.success("Note deleted");
      fetchNotes();
    } catch (error: any) {
      toast.error("Failed to delete note");
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
          <h1 className="text-3xl font-bold mb-2">Notes</h1>
          <p className="text-muted-foreground">Your reading notes and quotes</p>
        </div>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search notes by content or book..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {groupedNotes.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <StickyNote className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{searchQuery ? "No notes found matching your search" : "No notes yet"}</p>
              <p className="text-sm mt-2">
                {!searchQuery && "Start adding notes while reading your books"}
              </p>
            </div>
          ) : (
            <Accordion type="multiple" className="space-y-4">
              {groupedNotes.map((bookGroup) => (
                <AccordionItem 
                  key={bookGroup.bookId} 
                  value={bookGroup.bookId}
                  className="border rounded-lg shadow-book"
                >
                  <AccordionTrigger className="px-6 py-4 hover:no-underline">
                    <div className="flex items-center gap-4 flex-1 text-left">
                      <Link to={`/book/${bookGroup.bookId}`} className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                        <div className="w-12 h-16 bg-muted rounded flex items-center justify-center overflow-hidden">
                          {bookGroup.bookCover ? (
                            <img
                              src={bookGroup.bookCover}
                              alt={bookGroup.bookTitle}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Book className="h-6 w-6 text-muted-foreground" />
                          )}
                        </div>
                      </Link>
                      <div className="flex-1">
                        <h3 className="font-semibold">{bookGroup.bookTitle}</h3>
                        {bookGroup.bookAuthor && (
                          <p className="text-sm text-muted-foreground">{bookGroup.bookAuthor}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {bookGroup.notes.length} {bookGroup.notes.length === 1 ? 'note' : 'notes'}
                        </p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-6 pb-4">
                    <div className="space-y-3 pt-2">
                      {bookGroup.notes.map((note) => (
                        <Card key={note.id} className="bg-muted/30">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 space-y-2">
                                <div className="flex items-center gap-2">
                                  <Badge variant={note.note_type === "quote" ? "default" : "secondary"} className="text-xs">
                                    {note.note_type === "quote" ? "Quote" : "Note"}
                                  </Badge>
                                  {note.page_number && (
                                    <Badge variant="outline" className="text-xs">Page {note.page_number}</Badge>
                                  )}
                                </div>
                                <p className="text-sm leading-relaxed">{note.content}</p>
                                <p className="text-xs text-muted-foreground">
                                  {format(new Date(note.created_at), "MMM d, yyyy 'at' h:mm a")}
                                </p>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteNote(note.id)}
                                className="flex-shrink-0 h-8 w-8"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </div>
      </main>
    </div>
  );
};

export default Notes;
