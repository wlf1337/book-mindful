import { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { StatsCard } from "@/components/StatsCard";
import { BookCard } from "@/components/BookCard";
import { AddBookDialog } from "@/components/AddBookDialog";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { BookOpen, Clock, Target, TrendingUp, Flame, Plus } from "lucide-react";
import { toast } from "sonner";

interface Book {
  id: string;
  book_id: string;
  status: string;
  current_page: number;
  books: {
    title: string;
    author: string | null;
    cover_url: string | null;
    page_count: number | null;
  };
}

const Dashboard = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [stats, setStats] = useState({
    totalBooks: 0,
    booksCompleted: 0,
    readingStreak: 0,
    avgReadingTime: 0,
    pagesRead: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch both reading and want_to_read books
      const { data: readingBooks, error: readingError } = await supabase
        .from("user_books")
        .select(`
          id,
          book_id,
          status,
          current_page,
          books (
            title,
            author,
            cover_url,
            page_count
          )
        `)
        .eq("user_id", user.id)
        .in("status", ["reading", "want_to_read"])
        .order("status", { ascending: true }); // reading comes before want_to_read

      if (readingError) throw readingError;

      // Sort so reading books appear first
      const sortedBooks = (readingBooks || []).sort((a, b) => {
        if (a.status === "reading" && b.status !== "reading") return -1;
        if (a.status !== "reading" && b.status === "reading") return 1;
        return 0;
      });

      const { count: totalCount } = await supabase
        .from("user_books")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);

      const { count: completedCount } = await supabase
        .from("user_books")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "completed");

      const { data: sessions } = await supabase
        .from("reading_sessions")
        .select("duration_seconds, pages_read, started_at")
        .eq("user_id", user.id)
        .not("ended_at", "is", null)
        .order("started_at", { ascending: false });

      const totalMinutes = sessions?.reduce((acc, s) => acc + (s.duration_seconds || 0), 0) || 0;
      const avgMinutes = sessions?.length ? Math.round(totalMinutes / sessions.length / 60) : 0;
      const totalPagesRead = sessions?.reduce((acc, s) => acc + (s.pages_read || 0), 0) || 0;

      const streak = calculateStreak(sessions || []);

      setBooks(sortedBooks);
      setStats({
        totalBooks: totalCount || 0,
        booksCompleted: completedCount || 0,
        readingStreak: streak,
        avgReadingTime: avgMinutes,
        pagesRead: totalPagesRead,
      });
    } catch (error: any) {
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const calculateStreak = (sessions: any[]) => {
    if (!sessions.length) return 0;

    const uniqueDates = [...new Set(sessions.map(s => 
      new Date(s.started_at).toDateString()
    ))];

    let streak = 0;
    const today = new Date();
    
    for (let i = 0; i < uniqueDates.length; i++) {
      const date = new Date(uniqueDates[i]);
      const daysDiff = Math.floor((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff === i) {
        streak++;
      } else {
        break;
      }
    }
    
    return streak;
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
      <main className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 space-y-6 sm:space-y-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2">Dashboard</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Track your reading journey</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
          <StatsCard
            title="Books in Library"
            value={stats.totalBooks}
            icon={BookOpen}
          />
          <StatsCard
            title="Books Completed"
            value={stats.booksCompleted}
            icon={Target}
          />
          <StatsCard
            title="Reading Streak"
            value={stats.readingStreak}
            subtitle={`${stats.readingStreak} day${stats.readingStreak !== 1 ? 's' : ''}`}
            icon={Flame}
          />
          <StatsCard
            title="Avg. Reading Time"
            value={`${stats.avgReadingTime}m`}
            subtitle="per session"
            icon={Clock}
          />
          <StatsCard
            title="Total Pages Read"
            value={stats.pagesRead}
            icon={TrendingUp}
          />
        </div>

        <div>
          {books.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-sm sm:text-base">No books in your library yet</p>
              <p className="text-xs sm:text-sm mt-2">Add a book to start tracking</p>
              <div className="mt-6">
                <AddBookDialog onBookAdded={fetchDashboardData} />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
              {books.map((book) => (
                <BookCard
                  key={book.id}
                  id={book.book_id}
                  title={book.books.title}
                  author={book.books.author || undefined}
                  coverUrl={book.books.cover_url || undefined}
                  status={book.status}
                  currentPage={book.current_page}
                  pageCount={book.books.page_count || undefined}
                />
              ))}
              <AddBookDialog onBookAdded={fetchDashboardData}>
                <Card className="cursor-pointer hover:shadow-lg transition-all duration-300 border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 bg-muted/20">
                  <CardContent className="p-3 sm:p-4 flex flex-col items-center justify-center h-full min-h-[240px] sm:min-h-[280px]">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Plus className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground" />
                      <p className="text-xs sm:text-sm font-medium text-muted-foreground">Add Book</p>
                    </div>
                  </CardContent>
                </Card>
              </AddBookDialog>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
