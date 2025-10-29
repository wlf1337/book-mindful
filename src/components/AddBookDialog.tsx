import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface AddBookDialogProps {
  onBookAdded: () => void;
}

export const AddBookDialog = ({ onBookAdded }: AddBookDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isbn, setIsbn] = useState("");
  const [manualBook, setManualBook] = useState({
    title: "",
    author: "",
    pageCount: "",
    coverUrl: "",
  });

  const searchByISBN = async () => {
    if (!isbn.trim()) {
      toast.error("Please enter an ISBN");
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

      const data = await response.json();
      
      const coverUrl = data.covers?.[0]
        ? `https://covers.openlibrary.org/b/id/${data.covers[0]}-L.jpg`
        : null;

      const authorsResponse = data.authors 
        ? await Promise.all(
            data.authors.map((a: any) =>
              fetch(`https://openlibrary.org${a.key}.json`).then(r => r.json())
            )
          )
        : [];
      
      const authorNames = authorsResponse.map((a: any) => a.name).join(", ");

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
          description: data.description?.value || data.description || null,
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
    if (!manualBook.title.trim()) {
      toast.error("Please enter a book title");
      return;
    }

    setLoading(true);
    try {
      const { data: bookData, error: bookError } = await supabase
        .from("books")
        .insert({
          title: manualBook.title,
          author: manualBook.author || null,
          page_count: manualBook.pageCount ? parseInt(manualBook.pageCount) : null,
          cover_url: manualBook.coverUrl || null,
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
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Book
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add a Book</DialogTitle>
          <DialogDescription>
            Search by ISBN or add manually
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="isbn" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="isbn">ISBN Search</TabsTrigger>
            <TabsTrigger value="manual">Manual Entry</TabsTrigger>
          </TabsList>
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
