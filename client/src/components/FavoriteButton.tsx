import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";

interface FavoriteButtonProps {
  gameName: string;
  className?: string;
  showText?: boolean;
}

interface UserFavorite {
  id: string;
  userId: string;
  gameName: string;
  createdAt: string;
}

export default function FavoriteButton({ gameName, className = "", showText = false }: FavoriteButtonProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isFavorited, setIsFavorited] = useState(false);

  // Fetch user's favorites
  const { data: favorites } = useQuery<UserFavorite[]>({
    queryKey: ["/api/games/favorites"],
    enabled: !!user,
    staleTime: 30000,
  });

  // Update local state when favorites data changes
  useEffect(() => {
    if (favorites) {
      const isFav = favorites.some(fav => fav.gameName === gameName);
      setIsFavorited(isFav);
    }
  }, [favorites, gameName]);

  // Add to favorites mutation
  const addToFavoritesMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', '/api/games/favorites', { gameName });
    },
    onSuccess: () => {
      setIsFavorited(true);
      queryClient.invalidateQueries({ queryKey: ["/api/games/favorites"] });
      toast({
        title: "Added to favorites",
        description: `${gameName} has been added to your favorites`,
      });
    },
    onError: (error: any) => {
      console.error('Error adding to favorites:', error);
      if (error.message?.includes('duplicate') || error.message?.includes('already in favorites')) {
        toast({
          title: "Already favorited",
          description: `${gameName} is already in your favorites`,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to add to favorites",
          variant: "destructive"
        });
      }
    }
  });

  // Remove from favorites mutation
  const removeFromFavoritesMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('DELETE', `/api/games/favorites/${encodeURIComponent(gameName)}`);
    },
    onSuccess: () => {
      setIsFavorited(false);
      queryClient.invalidateQueries({ queryKey: ["/api/games/favorites"] });
      toast({
        title: "Removed from favorites",
        description: `${gameName} has been removed from your favorites`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to remove from favorites",
        variant: "destructive"
      });
    }
  });

  const handleToggleFavorite = () => {
    if (!user) {
      toast({
        title: "Login required",
        description: "Please login to favorite games",
        variant: "destructive"
      });
      return;
    }

    if (isFavorited) {
      removeFromFavoritesMutation.mutate();
    } else {
      addToFavoritesMutation.mutate();
    }
  };

  const isLoading = addToFavoritesMutation.isPending || removeFromFavoritesMutation.isPending;

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleToggleFavorite}
      disabled={isLoading}
      className={`p-2 h-8 text-gray-400 hover:text-yellow-400 transition-colors ${className}`}
      data-testid={`button-favorite-${gameName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
      aria-pressed={isFavorited}
      title={isFavorited ? `Remove ${gameName} from favorites` : `Add ${gameName} to favorites`}
    >
      <Star 
        className={`h-4 w-4 ${isFavorited ? 'fill-yellow-400 text-yellow-400' : ''} ${isLoading ? 'animate-pulse' : ''}`}
      />
      {showText && (
        <span className="ml-1 text-[8px]">
          {isFavorited ? 'Favorited' : 'Favorite'}
        </span>
      )}
    </Button>
  );
}