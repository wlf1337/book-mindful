import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Pause, Play, Square } from "lucide-react";

const ReadingSession = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [book, setBook] = useState<any>(null);
  const [userBook, setUserBook] = useState<any>(null);
  const [isReading, setIsReading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [startPage, setStartPage] = useState<number>(0);
  const [showEndDialog, setShowEndDialog] = useState(false);
  const [endPage, setEndPage] = useState<string>("");

  useEffect(() => {
    if (id) fetchBookData();
  }, [id]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isReading) {
      interval = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isReading]);

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
      setIsReading(true);
      toast.success("Reading session started");
    } catch (error: any) {
      toast.error("Failed to start session");
    }
  };

  const pauseSession = () => {
    setIsReading(false);
  };

  const resumeSession = () => {
    setIsReading(true);
  };

  const stopSession = () => {
    setShowEndDialog(true);
  };

  const finishSession = async () => {
    try {
      const endPageNum = parseInt(endPage);
      if (isNaN(endPageNum) || endPageNum < startPage) {
        toast.error("Please enter a valid page number");
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
    <div className="min-h-screen gradient-warm">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <Card className="shadow-reading">
            <CardHeader>
              <CardTitle className="text-center text-2xl">{book.title}</CardTitle>
              {book.author && <p className="text-center text-muted-foreground">{book.author}</p>}
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="text-center">
                <div className="text-6xl font-bold mb-4 font-mono text-primary">
                  {formatTime(elapsedSeconds)}
                </div>
                <p className="text-muted-foreground">
                  Starting from page {startPage}
                </p>
              </div>

              <div className="flex justify-center gap-4">
                {!sessionId ? (
                  <Button size="lg" onClick={startSession} className="px-12">
                    <Play className="h-5 w-5 mr-2" />
                    Start Reading
                  </Button>
                ) : (
                  <>
                    {isReading ? (
                      <Button size="lg" variant="secondary" onClick={pauseSession}>
                        <Pause className="h-5 w-5 mr-2" />
                        Pause
                      </Button>
                    ) : (
                      <Button size="lg" onClick={resumeSession}>
                        <Play className="h-5 w-5 mr-2" />
                        Resume
                      </Button>
                    )}
                    <Button size="lg" variant="destructive" onClick={stopSession}>
                      <Square className="h-5 w-5 mr-2" />
                      Stop
                    </Button>
                  </>
                )}
              </div>
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
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={finishSession} className="flex-1">
                Save Session
              </Button>
              <Button variant="outline" onClick={() => setShowEndDialog(false)}>
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
