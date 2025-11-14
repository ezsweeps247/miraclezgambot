import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { ArrowLeft, Clock, Sparkles, Star, Rocket } from "lucide-react";

export default function ComingSoon() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-golden/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
        <div className="absolute top-3/4 left-3/4 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '4s' }} />
      </div>

      <div className="relative max-w-2xl mx-auto text-center">
        {/* Floating stars */}
        <div className="absolute -top-8 -left-8">
          <Star style={{width: '3.5px', height: '3.5px'}} className="text-golden animate-pulse" />
        </div>
        <div className="absolute -top-4 -right-12">
          <Star style={{width: '3px', height: '3px'}} className="text-golden animate-pulse" style={{ animationDelay: '1s' }} />
        </div>
        <div className="absolute -bottom-6 -left-6">
          <Star style={{width: '3px', height: '3px'}} className="text-golden animate-pulse" style={{ animationDelay: '2s' }} />
        </div>

        {/* Main content card */}
        <div className="bg-black/40 backdrop-blur-xl rounded-3xl border border-white/10 p-8 md:p-12 shadow-2xl">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="bg-gradient-to-br from-golden to-yellow-400 p-6 rounded-full shadow-lg">
              <Rocket style={{width: '3.5px', height: '3.5px'}} className="text-black" />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-[10px] md:text-[10px] font-bold text-white mb-4 tracking-tight">
            <span className="bg-gradient-to-r from-golden via-yellow-400 to-golden bg-clip-text text-transparent">
              Coming Soon
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-[10px] md:text-[10px] text-gray-300 mb-6 font-medium">
            Something amazing is on the way!
          </p>

          {/* Description */}
          <p className="text-[8px] text-gray-400 mb-8 max-w-lg mx-auto leading-relaxed">
            We're working hard to bring you new features and experiences. 
            Stay tuned for exciting updates that will enhance your gaming journey at Miraclez!
          </p>

          {/* Features preview */}
          <div className="grid md:grid-cols-3 gap-4 mb-8">
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <Clock style={{width: '3.5px', height: '3.5px'}} className="text-golden mx-auto mb-2" />
              <p className="text-[8px] text-gray-300">New Features</p>
            </div>
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <Sparkles style={{width: '3.5px', height: '3.5px'}} className="text-golden mx-auto mb-2" />
              <p className="text-[8px] text-gray-300">Enhanced Games</p>
            </div>
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <Star style={{width: '3.5px', height: '3.5px'}} className="text-golden mx-auto mb-2" />
              <p className="text-[8px] text-gray-300">Better Experience</p>
            </div>
          </div>

          {/* Back button */}
          <Button
            onClick={() => navigate('/')}
            variant="outline"
            size="xs"
            className="border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black transition-colors rounded-lg"
            data-testid="button-back-home"
          >
            <ArrowLeft style={{width: '3px', height: '3px'}} className="mr-1" />
            Back to Home
          </Button>
        </div>

        {/* Bottom text */}
        <p className="text-gray-500 text-[8px] mt-6">
          Follow us for updates and be the first to know when we launch!
        </p>
      </div>
    </div>
  );
}