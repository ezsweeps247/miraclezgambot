import { useLocation } from 'wouter';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  ArrowLeft, 
  Users, 
  Video, 
  Clock, 
  Bell,
  Calendar,
  Star,
  Sparkles
} from 'lucide-react';

export default function LiveDealerPage() {
  const [, setLocation] = useLocation();

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <div className="mb-6">
        <Button 
          variant="outline" 
          size="xs"
          onClick={() => setLocation('/')}
          className="border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black mb-4 rounded-lg"
          data-testid="button-back-home"
        >
          <ArrowLeft style={{width: '3px', height: '3px'}} className="mr-1" />
          Back to Home
        </Button>
        
        <div className="flex items-center gap-3 mb-2">
          <Video style={{width: '3px', height: '3px'}} className="text-[#D4AF37]" />
          <h1 className="text-[10px] md:text-[10px] font-bold text-white">Live Dealer</h1>
        </div>
        <p className="text-gray-400">Real dealers, real excitement, real-time gaming</p>
      </div>

      {/* Coming Soon Hero */}
      <Card className="mb-8 bg-gradient-to-br from-[#D4AF37]/20 via-purple-500/10 to-blue-500/10 border-[#D4AF37]">
        <CardContent className="p-8 md:p-12 text-center">
          <div className="relative">
            {/* Animated sparkles */}
            <div className="absolute top-0 left-1/4 animate-pulse">
              <Sparkles style={{width: '3px', height: '3px'}} className="text-[#D4AF37]" />
            </div>
            <div className="absolute top-4 right-1/4 animate-pulse delay-1000">
              <Star style={{width: '3.5px', height: '3.5px'}} className="text-purple-400" />
            </div>
            
            {/* Main icon */}
            <div className="bg-[#D4AF37]/20 rounded-full p-6 w-24 h-24 mx-auto mb-6 flex items-center justify-center">
              <Video style={{width: '3.5px', height: '3.5px'}} className="text-[#D4AF37]" />
            </div>
            
            <h2 className="text-[10px] md:text-[10px] font-bold text-white mb-4">
              Coming Very Soon
            </h2>
            <p className="text-[10px] text-gray-300 mb-6 max-w-2xl mx-auto leading-relaxed">
              Get ready for the ultimate casino experience with professional live dealers 
              streaming directly to your device in high definition.
            </p>
          </div>

          {/* Features Preview */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <div className="bg-casino-card border border-casino-border rounded-lg p-6">
              <Users style={{width: '3.5px', height: '3.5px'}} className="text-[#D4AF37] mx-auto mb-3" />
              <h3 className="text-[10px] font-semibold text-white mb-2">Professional Dealers</h3>
              <p className="text-gray-400 text-[8px]">
                Trained professionals hosting your favorite casino games
              </p>
            </div>
            <div className="bg-casino-card border border-casino-border rounded-lg p-6">
              <Video style={{width: '3.5px', height: '3.5px'}} className="text-[#D4AF37] mx-auto mb-3" />
              <h3 className="text-[10px] font-semibold text-white mb-2">HD Streaming</h3>
              <p className="text-gray-400 text-[8px]">
                Crystal clear video quality with multiple camera angles
              </p>
            </div>
            <div className="bg-casino-card border border-casino-border rounded-lg p-6">
              <Clock style={{width: '3.5px', height: '3.5px'}} className="text-[#D4AF37] mx-auto mb-3" />
              <h3 className="text-[10px] font-semibold text-white mb-2">24/7 Available</h3>
              <p className="text-gray-400 text-[8px]">
                Round-the-clock gaming with dealers from around the world
              </p>
            </div>
          </div>

          {/* Notify Button */}
          <Button 
            className="bg-[#D4AF37] hover:bg-[#B8941F] text-black font-semibold text-[10px] px-8 py-3"
            data-testid="button-notify-launch"
          >
            <Bell style={{width: '3px', height: '3px'}} className="mr-2" />
            Notify Me When Available
          </Button>
        </CardContent>
      </Card>

      {/* Games Coming */}
      <Card className="mb-8 bg-casino-card border-casino-border">
        <CardContent className="p-6">
          <h3 className="text-[10px] font-semibold text-white mb-4 text-center">
            Live Games Coming to Miraclez
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="p-4 bg-casino-background rounded-lg border border-casino-border">
              <div className="text-[10px] mb-2">♠️</div>
              <div className="text-white font-medium">Live Blackjack</div>
            </div>
            <div className="p-4 bg-casino-background rounded-lg border border-casino-border">
              <div className="text-[10px] mb-2">🎰</div>
              <div className="text-white font-medium">Live Roulette</div>
            </div>
            <div className="p-4 bg-casino-background rounded-lg border border-casino-border">
              <div className="text-[10px] mb-2">🃏</div>
              <div className="text-white font-medium">Live Baccarat</div>
            </div>
            <div className="p-4 bg-casino-background rounded-lg border border-casino-border">
              <div className="text-[10px] mb-2">🎲</div>
              <div className="text-white font-medium">Live Craps</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card className="bg-casino-card border-casino-border">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Calendar style={{width: '3px', height: '3px'}} className="text-[#D4AF37]" />
            <h3 className="text-[10px] font-semibold text-white">Development Timeline</h3>
          </div>
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 bg-casino-background rounded-lg border border-casino-border">
              <div style={{width: '3px', height: '3px'}} className="bg-[#D4AF37] rounded-full"></div>
              <div>
                <div className="text-white font-medium">Studio Setup</div>
                <div className="text-gray-400 text-[8px]">Professional gaming studio construction</div>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 bg-casino-background rounded-lg border border-casino-border">
              <div style={{width: '3px', height: '3px'}} className="bg-yellow-500 rounded-full"></div>
              <div>
                <div className="text-white font-medium">Dealer Training</div>
                <div className="text-gray-400 text-[8px]">Recruiting and training professional dealers</div>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 bg-casino-background rounded-lg border border-casino-border opacity-60">
              <div style={{width: '3px', height: '3px'}} className="bg-gray-400 rounded-full"></div>
              <div>
                <div className="text-white font-medium">Beta Testing</div>
                <div className="text-gray-400 text-[8px]">Closed beta with select players</div>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 bg-casino-background rounded-lg border border-casino-border opacity-60">
              <div style={{width: '3px', height: '3px'}} className="bg-gray-400 rounded-full"></div>
              <div>
                <div className="text-white font-medium">Public Launch</div>
                <div className="text-gray-400 text-[8px]">Full release to all Miraclez players</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CTA Section */}
      <div className="mt-8 text-center">
        <p className="text-gray-400 mb-4">
          In the meantime, explore our collection of provably fair casino games
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Button 
            onClick={() => setLocation('/')}
            className="bg-[#D4AF37] hover:bg-[#B8941F] text-black font-semibold"
            data-testid="button-explore-games"
          >
            Explore All Games
          </Button>
          <Button 
            onClick={() => setLocation('/originals')}
            variant="outline"
            className="border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black"
            data-testid="button-originals"
          >
            Play Originals
          </Button>
        </div>
      </div>
    </div>
  );
}