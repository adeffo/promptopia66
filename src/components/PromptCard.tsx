import { Heart, MessageCircle, User } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";

interface PromptCardProps {
  id: string;
  title: string;
  imageUrl: string;
  creator: string;
  createdAt: string;
  favoritesCount: number;
  commentsCount: number;
  tags?: string[];
  isFavorited?: boolean;
  onClick?: () => void;
}

export const PromptCard = ({
  title,
  imageUrl,
  creator,
  createdAt,
  favoritesCount,
  commentsCount,
  tags,
  isFavorited,
  onClick,
}: PromptCardProps) => {
  return (
    <Card
      className="group relative overflow-hidden border-border/40 bg-gradient-card backdrop-blur transition-all hover:border-primary/50 hover:shadow-glow cursor-pointer"
      onClick={onClick}
    >
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden">
        <img
          src={imageUrl}
          alt={title}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/20 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
        
        {/* Tags Overlay */}
        {tags && tags.length > 0 && (
          <div className="absolute bottom-2 left-2 flex flex-wrap gap-1">
            {tags.slice(0, 3).map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="bg-background/90 text-xs backdrop-blur"
              >
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="mb-2 line-clamp-2 text-lg font-semibold text-foreground transition-colors group-hover:text-primary">
          {title}
        </h3>

        {/* Meta Info */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <User className="h-3.5 w-3.5" />
            <span className="truncate">{creator}</span>
          </div>
          <span>
            {formatDistanceToNow(new Date(createdAt), {
              addSuffix: true,
              locale: de,
            })}
          </span>
        </div>

        {/* Stats */}
        <div className="mt-3 flex items-center gap-4 border-t border-border/40 pt-3">
          <div className="flex items-center gap-1.5 text-sm">
            <Heart
              className={`h-4 w-4 transition-colors ${
                isFavorited ? "fill-accent text-accent" : "text-muted-foreground"
              }`}
            />
            <span className="font-medium">{favoritesCount}</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm">
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{commentsCount}</span>
          </div>
        </div>
      </div>
    </Card>
  );
};
