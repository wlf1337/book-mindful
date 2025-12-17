import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Book, Clock, FileText, Play, Star, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { noteSchema } from "@/lib/validation";
import { ScanToNote } from "@/components/ScanToNote";

const BookDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [book, setBook] = useState<any>(null);
  const [userBook, setUserBook] = useState<any>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [newNote, setNewNote] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) fetchBookData();
  }, [id]);

  const fetchBookData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: bookData, error: bookError } = await supabase
        .from("books")
        .select("*")
        .eq("id", id)
        .single();

      if (bookError) throw bookError;

      const { data: userBookData, error: userBookError } = await supabase
        .from("user_books")
        .select("*")
        .eq("book_id", id)
        .eq("user_id", user.id)
        .single();

      if (userBookError) throw userBookError;

      const { data: sessionsData } = await supabase
        .from("reading_sessions")
        .select("*")
        .eq("book_id", id)
        .eq("user_id", user.id)
        .order("started_at", { ascending: false });

      const { data: notesData } = await supabase
        .from("notes")
        .select("*")
        .eq("book_id", id)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      setBook(bookData);
      setUserBook(userBookData);
      setSessions(sessionsData || []);
      setNotes(notesData || []);
    } catch (error: any) {
      toast.error("Failed to load book details");
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (newStatus: string) => {
    try {
      const { error } = await supabase
        .from("user_books")
        .update({
          status: newStatus as "reading" | "completed" | "want_to_read",
          started_at: newStatus === "reading" && !userBook.started_at ? new Date().toISOString() : userBook.started_at,
          completed_at: newStatus === "completed" ? new Date().toISOString() : null,
        })
        .eq("id", userBook.id);

      if (error) throw error;
      toast.success("Status updated");
      fetchBookData();
    } catch (error: any) {
      toast.error("Failed to update status");
    }
  };

  const addNote = async () => {
    // Validate note content
    const validation = noteSchema.safeParse({ content: newNote });
    if (!validation.success) {
      const firstError = validation.error.errors[0];
      toast.error(firstError.message);
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("notes")
        .insert({
          user_id: user.id,
          book_id: id,
          content: validation.data.content,
          note_type: "note",
        });

      if (error) throw error;
      toast.success("Note added");
      setNewNote("");
      fetchBookData();
    } catch (error: any) {
      toast.error("Failed to add note");
    }
  };

  const deleteNote = async (noteId: string) => {
    try {
      const { error } = await supabase
        .from("notes")
        .delete()
        .eq("id", noteId);

      if (error) throw error;
      toast.success("Note deleted");
      fetchBookData();
    } catch (error: any) {
      toast.error("Failed to delete note");
    }
  };

  const deleteBook = async () => {
    try {
      const { error } = await supabase
        .from("user_books")
        .delete()
        .eq("id", userBook.id);

      if (error) throw error;
      toast.success("Book removed from library");
      navigate("/home");
    } catch (error: any) {
      toast.error("Failed to delete book");
    }
  };

  const startReading = () => {
    navigate(`/read/${id}`);
  };

  if (loading || !book || !userBook) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="container mx-auto px-4 py-8 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  const totalReadingTime = sessions.reduce((acc, s) => acc + (s.duration_seconds || 0), 0);
  const totalPages = sessions.reduce((acc, s) => acc + (s.pages_read || 0), 0);
  const avgSpeed = totalPages && totalReadingTime ? (totalPages / (totalReadingTime / 60)).toFixed(1) : 0;

  return (
    <div className="min-h-screen gradient-warm">
      <Navbar />
      <main className="container mx-auto px-4 py-8 space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <Card className="shadow-book">
              <CardContent className="p-6 space-y-6">
                <div className="aspect-[2/3] relative bg-muted flex items-center justify-center rounded-lg overflow-hidden">
                  {book.cover_url ? (
                    <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
                  ) : (
                    <Book className="h-24 w-24 text-muted-foreground" />
                  )}
                </div>
                
                <div>
                  <h1 className="text-2xl font-bold mb-2">{book.title}</h1>
                  {book.author && <p className="text-muted-foreground mb-4">{book.author}</p>}
                  {book.page_count && (
                    <p className="text-sm text-muted-foreground mb-4">{book.page_count} pages</p>
                  )}
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Reading Status</label>
                    <Select value={userBook.status} onValueChange={updateStatus}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="want_to_read">Up Next</SelectItem>
                        <SelectItem value="reading">Reading</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {book.page_count && (
                    <div className="mt-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Progress</span>
                        <span className="font-medium">
                          {Math.round((userBook.current_page / book.page_count) * 100)}%
                        </span>
                      </div>
                      <div className="h-2 bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full bg-accent transition-all"
                          style={{ width: `${(userBook.current_page / book.page_count) * 100}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {userBook.current_page} / {book.page_count} pages
                      </p>
                    </div>
                  )}
                </div>

                <Button onClick={startReading} className="w-full" size="lg">
                  <Play className="h-4 w-4 mr-2" />
                  Start Reading Session
                </Button>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" className="w-full text-muted-foreground hover:text-destructive" size="sm">
                      <Trash2 className="h-3 w-3 mr-2" />
                      Remove from Library
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Remove this book?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will remove the book from your library, including all your notes and reading sessions.
                        This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={deleteBook} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        Remove Book
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2 space-y-6">
            {book.description && (
              <Card className="shadow-book">
                <CardHeader>
                  <CardTitle>Description</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{book.description}</p>
                </CardContent>
              </Card>
            )}

            <Card className="shadow-book">
              <CardHeader>
                <CardTitle>Reading Statistics</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <Clock className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-2xl font-bold">{Math.round(totalReadingTime / 60)}m</p>
                  <p className="text-xs text-muted-foreground">Total Time</p>
                </div>
                <div className="text-center">
                  <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-2xl font-bold">{sessions.length}</p>
                  <p className="text-xs text-muted-foreground">Sessions</p>
                </div>
                <div className="text-center">
                  <Star className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-2xl font-bold">{avgSpeed}</p>
                  <p className="text-xs text-muted-foreground">Pages/min</p>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-book">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Notes</CardTitle>
                <ScanToNote
                  onSaveNote={async (text) => {
                    const { data: { user } } = await supabase.auth.getUser();
                    if (!user) throw new Error("Not authenticated");
                    const { error } = await supabase.from("notes").insert({
                      user_id: user.id,
                      book_id: id,
                      content: text,
                      note_type: "quote",
                    });
                    if (error) throw error;
                    fetchBookData();
                  }}
                />
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Textarea
                    placeholder="Add a note or quote..."
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    rows={3}
                  />
                  <Button onClick={addNote} disabled={!newNote.trim()}>
                    Add Note
                  </Button>
                </div>

                <div className="space-y-3">
                  {notes.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4">No notes yet</p>
                  ) : (
                    notes.map((note) => (
                      <Card key={note.id}>
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start gap-4">
                            <div className="flex-1">
                              <p className="text-sm">{note.content}</p>
                              <p className="text-xs text-muted-foreground mt-2">
                                {format(new Date(note.created_at), "MMM d, yyyy 'at' h:mm a")}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteNote(note.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default BookDetail;
