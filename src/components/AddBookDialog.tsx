import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
import { 
  manualBookSchema, 
  isbnSchema, 
  openLibrarySearchResponseSchema,
  openLibrarySearchBookSchema,
  openLibraryIsbnResponseSchema,
  openLibraryAuthorSchema,
} from "@/lib/validation";

interface AddBookDialogProps {
  onBookAdded: () => void;
  children?: React.ReactNode;
}

type OpenLibrarySearchBook = z.infer<typeof openLibrarySearchBookSchema>;

export const AddBookDialog = ({ onBookAdded, children }: AddBookDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isbn, setIsbn] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<OpenLibrarySearchBook[]>([]);
  const [manualBook, setManualBook] = useState({
    title: "",
    author: "",
    pageCount: "",
    coverUrl: "",
  });

  const searchByTitle = async () => {
    if (!searchQuery.trim()) {
      toast.error("Please enter a book title or author");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `https://openlibrary.org/search.json?q=${encodeURIComponent(searchQuery)}&limit=5`
      );
      
      if (!response.ok) {
        toast.error("Search failed. Please try again.");
        setLoading(false);
        return;
      }

      const rawData = await response.json();
      
      // Validate API response
      const validation = openLibrarySearchResponseSchema.safeParse(rawData);
      if (!validation.success) {
        console.error("OpenLibrary API response validation failed:", validation.error);
        toast.error("Invalid response from book search. Please try again.");
        setSearchResults([]);
        setLoading(false);
        return;
      }

      const data = validation.data;
      
      if (data.docs.length === 0) {
        toast.error("No books found. Try different keywords.");
        setSearchResults([]);
        setLoading(false);
        return;
      }

      setSearchResults(data.docs);
    } catch (error: any) {
      toast.error("Search failed. Please try again.");
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  const addBookFromSearch = async (book: OpenLibrarySearchBook) => {
    setLoading(true);
    try {
      const coverUrl = book.cover_i
        ? `https://covers.openlibrary.org/b/id/${book.cover_i}-L.jpg`
        : null;

      const { data: bookData, error: bookError } = await supabase
        .from("books")
        .insert({
          isbn: book.isbn?.[0] || null,
          title: book.title,
          author: book.author_name?.[0] || null,
          cover_url: coverUrl,
          page_count: book.number_of_pages_median || null,
          publisher: book.publisher?.[0] || null,
          published_date: book.first_publish_year?.toString() || null,
          manual_entry: false,
        })
        .select()
        .single();

      if (bookError) throw bookError;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error: userBookError } = await supabase
        .from("user_books")
        .insert({
          user_id: user.id,
          book_id: bookData.id,
          status: "want_to_read",
        });

      if (userBookError && !userBookError.message.includes("duplicate")) {
        throw userBookError;
      }

      toast.success("Book added to your library!");
      setOpen(false);
      setSearchQuery("");
      setSearchResults([]);
      onBookAdded();
    } catch (error: any) {
      toast.error(error.message || "Failed to add book");
    } finally {
      setLoading(false);
    }
  };

  const searchByISBN = async () => {
    if (!isbn.trim()) {
      toast.error("Please enter an ISBN");
      return;
    }

    // Validate ISBN format
    const isbnValidation = isbnSchema.safeParse(isbn.trim());
    if (!isbnValidation.success) {
      toast.error("Invalid ISBN format. Please check and try again.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`https://openlibrary.org/isbn/${isbn}.json`);
      
      if (!response.ok) {
        toast.error("Book not found. Try manual entry.");
        setLoading(false);
        return;
      }

      const rawData = await response.json();
      
      // Validate ISBN API response
      const validation = openLibraryIsbnResponseSchema.safeParse(rawData);
      if (!validation.success) {
        console.error("OpenLibrary ISBN response validation failed:", validation.error);
        toast.error("Invalid response from book lookup. Please try manual entry.");
        setLoading(false);
        return;
      }

      const data = validation.data;
      
      const coverUrl = data.covers?.[0]
        ? `https://covers.openlibrary.org/b/id/${data.covers[0]}-L.jpg`
        : null;

      // Fetch author names with validation and error handling
      let authorNames = "";
      if (data.authors && data.authors.length > 0) {
        const authorPromises = data.authors.map(async (a) => {
          try {
            const authorResponse = await fetch(`https://openlibrary.org${a.key}.json`);
            if (!authorResponse.ok) return null;
            const authorRaw = await authorResponse.json();
            const authorValidation = openLibraryAuthorSchema.safeParse(authorRaw);
            return authorValidation.success ? authorValidation.data.name : null;
          } catch {
            return null;
          }
        });
        const authorResults = await Promise.all(authorPromises);
        authorNames = authorResults.filter(Boolean).join(", ");
      }

      // Handle description which can be string or object
      const description = typeof data.description === 'string' 
        ? data.description 
        : data.description?.value || null;

      const { data: bookData, error: bookError } = await supabase
        .from("books")
        .upsert({
          isbn: isbn,
          title: data.title,
          author: authorNames || null,
          cover_url: coverUrl,
          page_count: data.number_of_pages || null,
          publisher: data.publishers?.[0] || null,
          published_date: data.publish_date || null,
          description: description,
          manual_entry: false,
        }, { onConflict: "isbn" })
        .select()
        .single();

      if (bookError) throw bookError;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error: userBookError } = await supabase
        .from("user_books")
        .insert({
          user_id: user.id,
          book_id: bookData.id,
          status: "want_to_read",
        });

      if (userBookError && !userBookError.message.includes("duplicate")) {
        throw userBookError;
      }

      toast.success("Book added to your library!");
      setOpen(false);
      setIsbn("");
      onBookAdded();
    } catch (error: any) {
      toast.error(error.message || "Failed to add book");
    } finally {
      setLoading(false);
    }
  };

  const addManualBook = async () => {
    // Validate inputs
    const validation = manualBookSchema.safeParse({
      title: manualBook.title,
      author: manualBook.author,
      pageCount: manualBook.pageCount ? parseInt(manualBook.pageCount) : undefined,
      coverUrl: manualBook.coverUrl,
    });

    if (!validation.success) {
      const firstError = validation.error.errors[0];
      toast.error(firstError.message);
      return;
    }

    setLoading(true);
    try {
      const validatedData = validation.data;
      const { data: bookData, error: bookError } = await supabase
        .from("books")
        .insert({
          title: validatedData.title,
          author: validatedData.author || null,
          page_count: validatedData.pageCount || null,
          cover_url: validatedData.coverUrl || null,
          manual_entry: true,
        })
        .select()
        .single();

      if (bookError) throw bookError;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error: userBookError } = await supabase
        .from("user_books")
        .insert({
          user_id: user.id,
          book_id: bookData.id,
          status: "want_to_read",
        });

      if (userBookError) throw userBookError;

      toast.success("Book added to your library!");
      setOpen(false);
      setManualBook({ title: "", author: "", pageCount: "", coverUrl: "" });
      onBookAdded();
    } catch (error: any) {
      toast.error(error.message || "Failed to add book");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Book
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add a Book</DialogTitle>
          <DialogDescription>
            Search by ISBN or add manually
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="search" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="search">Search</TabsTrigger>
            <TabsTrigger value="isbn">ISBN</TabsTrigger>
            <TabsTrigger value="manual">Manual</TabsTrigger>
          </TabsList>
          <TabsContent value="search" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="search">Book Title or Author</Label>
              <Input
                id="search"
                placeholder="Enter book title or author name"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && searchByTitle()}
              />
            </div>
            <Button onClick={searchByTitle} disabled={loading} className="w-full">
              <Search className="h-4 w-4 mr-2" />
              {loading ? "Searching..." : "Search Books"}
            </Button>
            {searchResults.length > 0 && (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {searchResults.map((book, index) => (
                  <Card key={index} className="cursor-pointer hover:bg-accent" onClick={() => addBookFromSearch(book)}>
                    <CardContent className="p-3 flex gap-3">
                      {book.cover_i && (
                        <img
                          src={`https://covers.openlibrary.org/b/id/${book.cover_i}-S.jpg`}
                          alt={book.title}
                          className="w-12 h-16 object-cover rounded"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{book.title}</p>
                        {book.author_name && (
                          <p className="text-xs text-muted-foreground truncate">{book.author_name[0]}</p>
                        )}
                        {book.first_publish_year && (
                          <p className="text-xs text-muted-foreground">{book.first_publish_year}</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
          <TabsContent value="isbn" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="isbn">ISBN</Label>
              <Input
                id="isbn"
                placeholder="Enter ISBN (e.g., 9780747532743)"
                value={isbn}
                onChange={(e) => setIsbn(e.target.value)}
              />
            </div>
            <Button onClick={searchByISBN} disabled={loading} className="w-full">
              <Search className="h-4 w-4 mr-2" />
              {loading ? "Searching..." : "Search"}
            </Button>
          </TabsContent>
          <TabsContent value="manual" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                placeholder="Book title"
                value={manualBook.title}
                onChange={(e) => setManualBook({ ...manualBook, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="author">Author</Label>
              <Input
                id="author"
                placeholder="Author name"
                value={manualBook.author}
                onChange={(e) => setManualBook({ ...manualBook, author: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pageCount">Page Count</Label>
              <Input
                id="pageCount"
                type="number"
                placeholder="Number of pages"
                value={manualBook.pageCount}
                onChange={(e) => setManualBook({ ...manualBook, pageCount: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="coverUrl">Cover URL (optional)</Label>
              <Input
                id="coverUrl"
                placeholder="https://example.com/cover.jpg"
                value={manualBook.coverUrl}
                onChange={(e) => setManualBook({ ...manualBook, coverUrl: e.target.value })}
              />
            </div>
            <Button onClick={addManualBook} disabled={loading} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              {loading ? "Adding..." : "Add Book"}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
