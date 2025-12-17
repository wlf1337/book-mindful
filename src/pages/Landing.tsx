import { Link } from "react-router-dom";
import { BookOpen, Flame, Target, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const mockBooks = [
  {
    title: "Stolen Focus",
    author: "Johann Hari",
    cover: "https://covers.openlibrary.org/b/isbn/9781526620224-L.jpg",
    progress: 67,
    status: "reading",
  },
  {
    title: "The Alchemist",
    author: "Paulo Coelho",
    cover: "https://covers.openlibrary.org/b/isbn/9780062315007-L.jpg",
    progress: 23,
    status: "reading",
  },
  {
    title: "Sapiens",
    author: "Yuval Noah Harari",
    cover: "https://covers.openlibrary.org/b/isbn/9780062316097-L.jpg",
    progress: 100,
    status: "completed",
  },
];

const Landing = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-lg text-primary">
            <BookOpen className="h-5 w-5" />
            <span>Quietly</span>
          </div>
          <Button asChild size="sm">
            <Link to="/auth">Get Started</Link>
          </Button>
        </div>
      </header>

      {/* Hero */}
      <main className="container mx-auto px-4 py-16 sm:py-24">
        <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
            A calm space for <span className="text-primary">reading.</span>
          </h1>
          <p className="text-lg text-muted-foreground mb-8">
            Build your reading habit without pressure. One tap to continue where you left off.
          </p>
          <Button asChild size="lg" className="px-8">
            <Link to="/auth">Start Reading</Link>
          </Button>
        </div>

        {/* App Mockup */}
        <div className="max-w-4xl mx-auto">
          <div className="bg-card rounded-xl border shadow-xl overflow-hidden">
            {/* Mockup Nav */}
            <div className="border-b px-4 h-12 flex items-center justify-between bg-card">
              <div className="flex items-center gap-2 text-primary font-semibold">
                <BookOpen className="h-4 w-4" />
                <span className="text-sm">Quietly</span>
              </div>
              <div className="w-6 h-6 rounded-full bg-muted"></div>
            </div>

            {/* Mockup Content */}
            <div className="p-4 sm:p-6 gradient-warm">
              {/* Stats */}
              <div className="grid grid-cols-3 gap-3 mb-6">
                <Card className="bg-card/80 backdrop-blur">
                  <CardContent className="p-3 text-center">
                    <Flame className="h-5 w-5 mx-auto mb-1 text-accent" />
                    <div className="text-xl font-bold">12</div>
                    <div className="text-xs text-muted-foreground">day streak</div>
                  </CardContent>
                </Card>
                <Card className="bg-card/80 backdrop-blur">
                  <CardContent className="p-3 text-center">
                    <BookOpen className="h-5 w-5 mx-auto mb-1 text-primary" />
                    <div className="text-xl font-bold">8</div>
                    <div className="text-xs text-muted-foreground">books</div>
                  </CardContent>
                </Card>
                <Card className="bg-card/80 backdrop-blur">
                  <CardContent className="p-3 text-center">
                    <Target className="h-5 w-5 mx-auto mb-1 text-primary" />
                    <div className="text-xl font-bold">3</div>
                    <div className="text-xs text-muted-foreground">completed</div>
                  </CardContent>
                </Card>
              </div>

              {/* Book Grid */}
              <div className="grid grid-cols-3 gap-3 sm:gap-4">
                {mockBooks.map((book) => (
                  <Card key={book.title} className="overflow-hidden bg-card">
                    <div className="aspect-[2/3] relative">
                      <img
                        src={book.cover}
                        alt={book.title}
                        className="w-full h-full object-cover"
                      />
                      {book.status === "completed" && (
                        <div className="absolute top-2 right-2 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded">
                          Done
                        </div>
                      )}
                      {book.status === "reading" && (
                        <div className="absolute top-2 right-2 bg-accent text-accent-foreground text-xs px-2 py-0.5 rounded">
                          Reading
                        </div>
                      )}
                    </div>
                    <CardContent className="p-2 sm:p-3 space-y-2">
                      <div>
                        <h3 className="font-medium text-xs sm:text-sm truncate">{book.title}</h3>
                        <p className="text-xs text-muted-foreground truncate">{book.author}</p>
                      </div>
                      {book.status === "reading" && (
                        <div className="space-y-1.5">
                          <div className="h-1 bg-secondary rounded-full overflow-hidden">
                            <div
                              className="h-full bg-accent"
                              style={{ width: `${book.progress}%` }}
                            />
                          </div>
                          <div className="bg-primary text-primary-foreground text-xs px-2 py-1 rounded flex items-center justify-center gap-1">
                            <Play className="h-3 w-3" />
                            Continue
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="mt-16 sm:mt-24 max-w-xl mx-auto text-center space-y-6">
          <p className="text-muted-foreground">
            No pressure. No guilt. Just quiet progress at your own pace.
          </p>
          <div className="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Play className="h-4 w-4 text-primary" />
              One-tap reading sessions
            </span>
            <span className="flex items-center gap-1.5">
              <Flame className="h-4 w-4 text-accent" />
              Gentle streak tracking
            </span>
            <span className="flex items-center gap-1.5">
              <BookOpen className="h-4 w-4 text-primary" />
              Notes & highlights
            </span>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Landing;
