import { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { StatsCard } from "@/components/StatsCard";
import { BookCard } from "@/components/BookCard";
import { AddBookDialog } from "@/components/AddBookDialog";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { BookOpen, Flame, Target, Plus } from "lucide-react";
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

const Home = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [stats, setStats] = useState({
    totalBooks: 0,
    booksCompleted: 0,
    readingStreak: 0,
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("reading");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch all books
      const { data: allBooks, error: booksError } = await supabase
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
        .order("created_at", { ascending: false });

      if (booksError) throw booksError;

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
        .select("started_at")
        .eq("user_id", user.id)
        .not("ended_at", "is", null)
        .order("started_at", { ascending: false });

      const streak = calculateStreak(sessions || []);

      setBooks(allBooks || []);
      setStats({
        totalBooks: totalCount || 0,
        booksCompleted: completedCount || 0,
        readingStreak: streak,
      });
    } catch (error: any) {
      toast.error("Failed to load data");
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

  const filterBooks = (status?: string) => {
    if (!status) return books;
    return books.filter(book => book.status === status);
  };

  const renderBookGrid = (filteredBooks: Book[]) => {
    if (filteredBooks.length === 0) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-sm">No books here yet</p>
          <div className="mt-4">
            <AddBookDialog onBookAdded={fetchData} />
          </div>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {filteredBooks.map((book) => (
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
        <AddBookDialog onBookAdded={fetchData}>
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
    );
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
      <main className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 space-y-6">
        {/* Compact Stats Bar */}
        <div className="grid grid-cols-3 gap-3">
          <StatsCard
            title="Streak"
            value={stats.readingStreak}
            subtitle={stats.readingStreak === 1 ? "day" : "days"}
            icon={Flame}
          />
          <StatsCard
            title="Library"
            value={stats.totalBooks}
            subtitle={stats.totalBooks === 1 ? "book" : "books"}
            icon={BookOpen}
          />
          <StatsCard
            title="Completed"
            value={stats.booksCompleted}
            subtitle={stats.booksCompleted === 1 ? "book" : "books"}
            icon={Target}
          />
        </div>

        {/* Library with Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-4 h-auto">
            <TabsTrigger value="reading" className="text-xs sm:text-sm py-2">
              Reading ({filterBooks("reading").length})
            </TabsTrigger>
            <TabsTrigger value="want_to_read" className="text-xs sm:text-sm py-2">
              Next ({filterBooks("want_to_read").length})
            </TabsTrigger>
            <TabsTrigger value="completed" className="text-xs sm:text-sm py-2">
              Done ({filterBooks("completed").length})
            </TabsTrigger>
            <TabsTrigger value="all" className="text-xs sm:text-sm py-2">
              All ({books.length})
            </TabsTrigger>
          </TabsList>
          <TabsContent value="reading" className="mt-4 sm:mt-6">
            {renderBookGrid(filterBooks("reading"))}
          </TabsContent>
          <TabsContent value="want_to_read" className="mt-4 sm:mt-6">
            {renderBookGrid(filterBooks("want_to_read"))}
          </TabsContent>
          <TabsContent value="completed" className="mt-4 sm:mt-6">
            {renderBookGrid(filterBooks("completed"))}
          </TabsContent>
          <TabsContent value="all" className="mt-4 sm:mt-6">
            {renderBookGrid(books)}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Home;
