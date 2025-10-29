import { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { BookCard } from "@/components/BookCard";
import { AddBookDialog } from "@/components/AddBookDialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { BookOpen } from "lucide-react";

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

const Library = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
    fetchBooks();
  }, []);

  const fetchBooks = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
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

      if (error) throw error;
      setBooks(data || []);
    } catch (error: any) {
      toast.error("Failed to load books");
    } finally {
      setLoading(false);
    }
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
          <p>No books found</p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
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
      <main className="container mx-auto px-4 py-8 space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold mb-2">My Library</h1>
            <p className="text-muted-foreground">{books.length} books in your collection</p>
          </div>
          <AddBookDialog onBookAdded={fetchBooks} />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">All Books ({books.length})</TabsTrigger>
            <TabsTrigger value="reading">
              Reading ({filterBooks("reading").length})
            </TabsTrigger>
            <TabsTrigger value="want_to_read">
              Want to Read ({filterBooks("want_to_read").length})
            </TabsTrigger>
            <TabsTrigger value="completed">
              Completed ({filterBooks("completed").length})
            </TabsTrigger>
          </TabsList>
          <TabsContent value="all" className="mt-6">
            {renderBookGrid(books)}
          </TabsContent>
          <TabsContent value="reading" className="mt-6">
            {renderBookGrid(filterBooks("reading"))}
          </TabsContent>
          <TabsContent value="want_to_read" className="mt-6">
            {renderBookGrid(filterBooks("want_to_read"))}
          </TabsContent>
          <TabsContent value="completed" className="mt-6">
            {renderBookGrid(filterBooks("completed"))}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Library;
