import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Book } from "lucide-react";
import { Link } from "react-router-dom";

interface BookCardProps {
  id: string;
  title: string;
  author?: string;
  coverUrl?: string;
  status: string;
  currentPage?: number;
  pageCount?: number;
}

export const BookCard = ({ id, title, author, coverUrl, status, currentPage = 0, pageCount }: BookCardProps) => {
  const progress = pageCount ? Math.round((currentPage / pageCount) * 100) : 0;
  
  const statusColors = {
    reading: "bg-accent text-white",
    completed: "bg-primary text-primary-foreground",
    want_to_read: "bg-secondary text-secondary-foreground",
  };

  const statusLabels = {
    reading: "Reading",
    completed: "Completed",
    want_to_read: "Want to Read",
  };

  return (
    <Link to={`/book/${id}`}>
      <Card className="overflow-hidden hover:shadow-reading transition-smooth cursor-pointer h-full">
        <CardContent className="p-0">
          <div className="aspect-[2/3] relative bg-muted flex items-center justify-center">
            {coverUrl ? (
              <img src={coverUrl} alt={title} className="w-full h-full object-cover" />
            ) : (
              <Book className="h-16 w-16 text-muted-foreground" />
            )}
            <div className="absolute top-2 right-2">
              <Badge className={statusColors[status as keyof typeof statusColors]}>
                {statusLabels[status as keyof typeof statusLabels]}
              </Badge>
            </div>
          </div>
          <div className="p-4 space-y-2">
            <h3 className="font-semibold line-clamp-2 text-sm">{title}</h3>
            {author && <p className="text-xs text-muted-foreground line-clamp-1">{author}</p>}
            {status === "reading" && pageCount && (
              <div className="space-y-1">
                <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {currentPage} / {pageCount} pages ({progress}%)
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};
