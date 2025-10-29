import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Pause, Play, Square, Trash2 } from "lucide-react";
import { noteSchema, pageNumberSchema } from "@/lib/validation";

const ReadingSession = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [book, setBook] = useState<any>(null);
  const [userBook, setUserBook] = useState<any>(null);
  const [isReading, setIsReading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [totalPausedTime, setTotalPausedTime] = useState(0);
  const [pauseStartTime, setPauseStartTime] = useState<number | null>(null);
  const [startPage, setStartPage] = useState<number>(0);
  const [showEndDialog, setShowEndDialog] = useState(false);
  const [endPage, setEndPage] = useState<string>("");
  const [currentNote, setCurrentNote] = useState<string>("");
  const [sessionNotes, setSessionNotes] = useState<any[]>([]);

  useEffect(() => {
    if (id) {
      fetchBookData();
      // Restore session state from localStorage if available
      const savedState = localStorage.getItem(`reading-session-${id}`);
      if (savedState) {
        try {
          const state = JSON.parse(savedState);
          if (state.sessionId && state.sessionStartTime) {
            setSessionId(state.sessionId);
            setSessionStartTime(state.sessionStartTime);
            setTotalPausedTime(state.totalPausedTime || 0);
            setIsReading(state.isReading || false);
            if (state.pauseStartTime) {
              setPauseStartTime(state.pauseStartTime);
            }
            // Recalculate elapsed time
            const now = Date.now();
            const elapsed = Math.floor((now - state.sessionStartTime - (state.totalPausedTime || 0)) / 1000);
            setElapsedSeconds(elapsed);
          }
        } catch (e) {
          console.error('Failed to restore session state', e);
        }
      }
    }
  }, [id]);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    if (sessionId && sessionStartTime && id) {
      const state = {
        sessionId,
        sessionStartTime,
        totalPausedTime,
        isReading,
        pauseStartTime,
      };
      localStorage.setItem(`reading-session-${id}`, JSON.stringify(state));
    }
  }, [sessionId, sessionStartTime, totalPausedTime, isReading, pauseStartTime, id]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isReading && sessionStartTime) {
      // Update timer based on actual elapsed time, not intervals
      const updateTimer = () => {
        const now = Date.now();
        const elapsed = Math.floor((now - sessionStartTime - totalPausedTime) / 1000);
        setElapsedSeconds(elapsed);
      };
      
      updateTimer(); // Update immediately
      interval = setInterval(updateTimer, 1000);
    }
    return () => clearInterval(interval);
  }, [isReading, sessionStartTime, totalPausedTime]);

  // Handle visibility changes to recalculate time when app regains focus
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && isReading && sessionStartTime) {
        // Recalculate elapsed time when app becomes visible
        const now = Date.now();
        const elapsed = Math.floor((now - sessionStartTime - totalPausedTime) / 1000);
        setElapsedSeconds(elapsed);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isReading, sessionStartTime, totalPausedTime]);

  const fetchBookData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: bookData } = await supabase
        .from("books")
        .select("*")
        .eq("id", id)
        .single();

      const { data: userBookData } = await supabase
        .from("user_books")
        .select("*")
        .eq("book_id", id)
        .eq("user_id", user.id)
        .single();

      setBook(bookData);
      setUserBook(userBookData);
      setStartPage(userBookData.current_page || 0);
    } catch (error: any) {
      toast.error("Failed to load book data");
    }
  };

  const startSession = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("reading_sessions")
        .insert({
          user_id: user.id,
          book_id: id,
          start_page: startPage,
        })
        .select()
        .single();

      if (error) throw error;

      setSessionId(data.id);
      setSessionStartTime(Date.now());
      setTotalPausedTime(0);
      setElapsedSeconds(0);
      setIsReading(true);
      setSessionNotes([]);
      toast.success("Reading session started");
    } catch (error: any) {
      toast.error("Failed to start session");
    }
  };

  const pauseSession = () => {
    setIsReading(false);
    setPauseStartTime(Date.now());
  };

  const resumeSession = () => {
    if (pauseStartTime) {
      const pauseDuration = Date.now() - pauseStartTime;
      setTotalPausedTime(prev => prev + pauseDuration);
      setPauseStartTime(null);
    }
    setIsReading(true);
  };

  const stopSession = () => {
    setShowEndDialog(true);
  };

  const addNote = async () => {
    // Validate note content
    const validation = noteSchema.safeParse({ content: currentNote });
    if (!validation.success) {
      const firstError = validation.error.errors[0];
      toast.error(firstError.message);
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("notes")
        .insert({
          user_id: user.id,
          book_id: id,
          content: validation.data.content,
          note_type: "note",
        })
        .select()
        .single();

      if (error) throw error;

      setSessionNotes([...sessionNotes, data]);
      setCurrentNote("");
      toast.success("Note saved!");
    } catch (error: any) {
      toast.error("Failed to save note");
    }
  };

  const deleteSessionNote = async (noteId: string) => {
    try {
      const { error } = await supabase
        .from("notes")
        .delete()
        .eq("id", noteId);

      if (error) throw error;

      setSessionNotes(sessionNotes.filter(n => n.id !== noteId));
      toast.success("Note deleted");
    } catch (error: any) {
      toast.error("Failed to delete note");
    }
  };

  const finishSession = async () => {
    try {
      const endPageNum = parseInt(endPage);
      
      // Validate end page number
      const validation = pageNumberSchema.safeParse({ page: endPageNum });
      if (!validation.success) {
        toast.error("Invalid page number");
        return;
      }
      
      if (endPageNum < startPage) {
        toast.error("End page must be greater than or equal to start page");
        return;
      }

      const pagesRead = endPageNum - startPage;

      const { error: sessionError } = await supabase
        .from("reading_sessions")
        .update({
          ended_at: new Date().toISOString(),
          duration_seconds: elapsedSeconds,
          end_page: endPageNum,
          pages_read: pagesRead,
        })
        .eq("id", sessionId);

      if (sessionError) throw sessionError;

      const { error: userBookError } = await supabase
        .from("user_books")
        .update({
          current_page: endPageNum,
          status: endPageNum >= (book.page_count || 0) ? "completed" : "reading",
          completed_at: endPageNum >= (book.page_count || 0) ? new Date().toISOString() : null,
        })
        .eq("id", userBook.id);

      if (userBookError) throw userBookError;

      // Clear saved state from localStorage
      localStorage.removeItem(`reading-session-${id}`);
      
      toast.success("Reading session saved!");
      navigate(`/book/${id}`);
    } catch (error: any) {
      toast.error("Failed to save session");
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  if (!book || !userBook) {
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
    <div className="min-h-screen bg-background pb-20">
      <Navbar />
      <main className="container mx-auto px-3 sm:px-4 py-6 sm:py-8">
        <div className="max-w-2xl mx-auto">
          <Card className="shadow-sm border-muted">
            <CardHeader className="pb-4">
              <CardTitle className="text-center text-xl sm:text-2xl">{book.title}</CardTitle>
              {book.author && <p className="text-center text-sm sm:text-base text-muted-foreground">{book.author}</p>}
            </CardHeader>
            <CardContent className="space-y-6 sm:space-y-8">
              <div className="text-center">
                <div className="text-5xl sm:text-6xl font-bold mb-3 sm:mb-4 font-mono text-foreground">
                  {formatTime(elapsedSeconds)}
                </div>
                {!sessionId && (
                  <div className="mb-4 max-w-xs mx-auto">
                    <Label htmlFor="startPage" className="text-sm">Starting Page</Label>
                    <Input
                      id="startPage"
                      type="number"
                      value={startPage}
                      onChange={(e) => setStartPage(parseInt(e.target.value) || 0)}
                      min={0}
                      max={book.page_count || undefined}
                      className="mt-2 text-center text-lg font-semibold h-12"
                    />
                    {book.page_count && (
                      <p className="text-xs text-muted-foreground mt-1">
                        of {book.page_count} pages
                      </p>
                    )}
                  </div>
                )}
                {sessionId && (
                  <p className="text-sm sm:text-base text-muted-foreground">
                    Started from page {startPage}
                  </p>
                )}
              </div>

              <div className="flex justify-center gap-3 sm:gap-4">
                {!sessionId ? (
                  <Button size="lg" onClick={startSession} className="px-8 sm:px-12 h-12 sm:h-auto text-base shadow-sm">
                    <Play className="h-5 w-5 mr-2" />
                    Start Reading
                  </Button>
                ) : (
                  <>
                    {isReading ? (
                      <Button size="lg" variant="secondary" onClick={pauseSession} className="h-12 sm:h-auto shadow-sm">
                        <Pause className="h-5 w-5 mr-2" />
                        Pause
                      </Button>
                    ) : (
                      <Button size="lg" onClick={resumeSession} className="h-12 sm:h-auto shadow-sm">
                        <Play className="h-5 w-5 mr-2" />
                        Resume
                      </Button>
                    )}
                    <Button size="lg" variant="outline" onClick={stopSession} className="h-12 sm:h-auto shadow-sm">
                      <Square className="h-5 w-5 mr-2" />
                      Stop
                    </Button>
                  </>
                )}
              </div>

              {sessionId && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentNote" className="text-sm font-medium">Add a Note</Label>
                    <Textarea
                      id="currentNote"
                      placeholder="Write a thought, quote, or reflection..."
                      value={currentNote}
                      onChange={(e) => setCurrentNote(e.target.value)}
                      rows={3}
                      className="text-base"
                    />
                    <Button 
                      onClick={addNote} 
                      disabled={!currentNote.trim()}
                      className="w-full h-11 shadow-sm"
                    >
                      Save Note
                    </Button>
                  </div>

                  {sessionNotes.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Notes from this session ({sessionNotes.length})</Label>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {sessionNotes.map((note) => (
                          <Card key={note.id} className="bg-muted/30 border-muted">
                            <CardContent className="p-3">
                              <div className="flex justify-between items-start gap-2">
                                <p className="text-sm flex-1">{note.content}</p>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => deleteSessionNote(note.id)}
                                  className="h-8 w-8 p-0"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <Dialog open={showEndDialog} onOpenChange={setShowEndDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>End Reading Session</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="endPage">What page are you on now?</Label>
              <Input
                id="endPage"
                type="number"
                placeholder={`Page ${startPage + 1} or higher`}
                value={endPage}
                onChange={(e) => setEndPage(e.target.value)}
                min={startPage}
                className="h-12 text-base"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={finishSession} className="flex-1 h-11 shadow-sm">
                Save Session
              </Button>
              <Button variant="outline" onClick={() => setShowEndDialog(false)} className="h-11 shadow-sm">
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ReadingSession;
